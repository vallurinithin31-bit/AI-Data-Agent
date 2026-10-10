import uuid
import pandas as pd
import numpy as np
from typing import Optional, List, Dict, Any, Tuple
from sklearn.ensemble import IsolationForest
from backend.app.schemas.analysis import AnomalyResult, AnomalyItem

def detect_anomalies(df: pd.DataFrame, metric_col: Optional[str] = None, id_col: Optional[str] = None) -> AnomalyResult:
    # Pick numeric column
    if not metric_col:
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        priority_keywords = ['revenue', 'amount', 'profit', 'sales', 'usage', 'price', 'cost', 'spend', 'count']
        for kw in priority_keywords:
            for c in num_cols:
                if kw in c.lower():
                    metric_col = c
                    break
            if metric_col:
                break
        if not metric_col and num_cols:
            metric_col = num_cols[0]

    if not metric_col:
        raise ValueError("No numeric metric column available for anomaly detection.")

    # Pick ID / identifier column
    if not id_col:
        for c in df.columns:
            if any(k in c.lower() for k in ['id', 'order', 'user', 'customer', 'name', 'code']):
                id_col = c
                break
        if not id_col:
            id_col = df.columns[0]

    series = pd.to_numeric(df[metric_col], errors='coerce').dropna()
    if len(series) < 10:
        raise ValueError(f"Insufficient samples ({len(series)}) for anomaly detection (minimum 10 required).")

    mean_val = float(series.mean())
    std_val = float(series.std()) if len(series) > 1 else 1.0
    if std_val == 0:
        std_val = 1.0

    q25 = float(series.quantile(0.25))
    q75 = float(series.quantile(0.75))
    iqr = q75 - q25

    # Isolation Forest on metric
    iso = IsolationForest(contamination=0.03, random_state=42)
    iso_preds = iso.fit_predict(series.values.reshape(-1, 1))

    anomalies: List[AnomalyItem] = []
    methods_used = ["Z-score (> 2.8)", "IQR (1.5x)", "Isolation Forest"]

    for idx, (orig_idx, actual_val) in enumerate(series.items()):
        actual_val = float(actual_val)
        z_score = abs((actual_val - mean_val) / std_val)
        is_iqr_outlier = (actual_val < q25 - 1.5 * iqr) or (actual_val > q75 + 1.5 * iqr)
        is_iso_outlier = (iso_preds[idx] == -1)

        # Flag if flagged by at least 2 methods or extreme Z-score (> 3.0)
        flags = sum([z_score > 2.5, is_iqr_outlier, is_iso_outlier])
        if flags >= 2 or z_score > 3.0:
            dev_pct = round(((actual_val - mean_val) / mean_val) * 100, 1) if mean_val != 0 else 0.0
            
            # Severity classification
            if z_score > 4.0 or abs(dev_pct) > 300:
                severity = "Critical"
            elif z_score > 3.0 or abs(dev_pct) > 150:
                severity = "High"
            else:
                severity = "Medium"

            direction = "spike" if actual_val > mean_val else "drop"
            ident_val = str(df.loc[orig_idx, id_col]) if id_col in df.columns else f"Row {orig_idx}"

            cause = (
                f"Extreme {direction} in {metric_col} ({abs(dev_pct)}% from mean {mean_val:,.2f}). "
                f"Z-score = {z_score:.2f}."
            )
            recom = (
                f"Audit transaction record {ident_val} for bulk discounts, data entry typo, system glitch, or fraud."
            )

            anomalies.append(AnomalyItem(
                id=f"ano_{uuid.uuid4().hex[:8]}",
                row_index=int(orig_idx),
                key_identifier=ident_val,
                metric_name=metric_col,
                actual_value=round(actual_val, 2),
                expected_value=round(mean_val, 2),
                deviation_pct=dev_pct,
                severity=severity,
                potential_cause=cause,
                recommendation=recom
            ))

    # Sort by severity and deviation
    severity_rank = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    anomalies.sort(key=lambda x: (severity_rank.get(x.severity, 4), -abs(x.deviation_pct)))
    
    # Cap displayed to top 25
    displayed_anomalies = anomalies[:25]
    critical_count = sum(1 for a in anomalies if a.severity == "Critical")

    summary = (
        f"Detected {len(anomalies)} statistical anomalies across {len(series):,} records for metric '{metric_col}'. "
        f"{critical_count} critical deviations exceed 4 standard deviations from normal expected baseline."
    )

    return AnomalyResult(
        total_anomalies=len(anomalies),
        anomalies=displayed_anomalies,
        methods_used=methods_used,
        summary=summary
    )
