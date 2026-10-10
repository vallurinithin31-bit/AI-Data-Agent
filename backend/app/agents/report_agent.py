import io
import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np

from backend.app.core.config import settings
from backend.app.tools.data_loader import get_dataset, get_metadata
from backend.app.agents.data_profiler import profile_dataset, calculate_numerical_statistics
from backend.app.agents.funnel_agent import analyze_funnel, detect_funnel_columns
from backend.app.agents.segmentation_agent import perform_rfm_segmentation, perform_kmeans_clustering
from backend.app.agents.anomaly_agent import detect_anomalies
from backend.app.agents.forecasting_agent import forecast_time_series

def generate_comprehensive_report(dataset_id: str) -> Dict[str, Any]:
    df = get_dataset(dataset_id)
    meta = get_metadata(dataset_id)
    quality = profile_dataset(df)
    num_stats = calculate_numerical_statistics(df)

    # 1. Executive Summary & KPIs
    total_records = len(df)
    total_cols = len(df.columns)
    
    kpis = []
    kpis.append({"label": "Total Records", "value": f"{total_records:,}", "change": "Baseline"})
    kpis.append({"label": "Quality Score", "value": f"{quality.overall_score}/100", "change": f"Grade {quality.grade}"})
    
    # Check for monetary metrics
    rev_col = next((c for c in df.columns if any(k in c.lower() for k in ['revenue', 'sales', 'amount', 'profit', 'mrr'])), None)
    if rev_col and pd.api.types.is_numeric_dtype(df[rev_col]):
        total_rev = float(df[rev_col].sum())
        avg_rev = float(df[rev_col].mean())
        kpis.append({"label": f"Gross {rev_col}", "value": f"${total_rev:,.2f}", "change": "Cumulative"})
        kpis.append({"label": f"Average {rev_col}", "value": f"${avg_rev:,.2f}", "change": "Mean / Record"})

    # 2. Funnel Analysis if applicable
    funnel_section = None
    stage_col, user_col, *_ = detect_funnel_columns(df)
    if stage_col:
        try:
            f_res = analyze_funnel(df, stage_col=stage_col, user_col=user_col)
            funnel_section = {
                "detected": True,
                "overall_conversion": f_res.overall_conversion,
                "bottleneck_stage": f_res.biggest_drop_off_stage,
                "bottleneck_drop": f_res.biggest_drop_off_rate,
                "stages": [s.model_dump() for s in f_res.stages],
                "summary": f_res.diagnostic_summary
            }
        except Exception:
            pass

    # 3. Anomaly Section
    anomaly_section = None
    try:
        a_res = detect_anomalies(df)
        anomaly_section = {
            "total_anomalies": a_res.total_anomalies,
            "critical_count": sum(1 for a in a_res.anomalies if a.severity == "Critical"),
            "items": [a.model_dump() for a in a_res.anomalies[:10]],
            "summary": a_res.summary
        }
    except Exception:
        pass

    # 4. Key Insights
    key_insights = [
        f"Data integrity graded at '{quality.grade}' ({quality.overall_score}/100) with {quality.missing_pct}% missing cell density and {quality.duplicate_rows:,} duplicate records.",
        f"Dataset spans {total_records:,} observations encompassing {len(meta.numerical_columns)} numerical and {len(meta.categorical_columns)} categorical dimensions."
    ]
    if rev_col:
        key_insights.append(f"Aggregate {rev_col} volume reached ${df[rev_col].sum():,.2f} with a median value of ${df[rev_col].median():,.2f}.")
    if funnel_section:
        key_insights.append(f"Conversion efficiency stands at {funnel_section['overall_conversion']}% with major drop-off concentrated at '{funnel_section['bottleneck_stage']}'.")
    if anomaly_section:
        key_insights.append(f"Identified {anomaly_section['total_anomalies']} anomalous outliers requiring operational verification.")

    # 5. Prioritized Recommendations
    recommendations = [
        {"priority": "High", "action": "Remediate Data Quality Deficits", "details": f"Resolve {quality.missing_cells:,} missing cells using median/mode imputation before modeling."},
        {"priority": "High", "action": "Automate Outlier Alerts", "details": "Institute real-time threshold monitoring on high-variance numeric dimensions."},
        {"priority": "Medium", "action": "Deploy Cohort Segmentation", "details": "Group clients by RFM scores to deliver targeted high-margin promotions."}
    ]

    report_payload = {
        "dataset_name": meta.name,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%B %d, %Y - %H:%M UTC"),
        "executive_summary": f"Comprehensive data intelligence report for '{meta.name}'. Evaluates statistical distributions, structural anomalies, conversion dynamics, and strategic growth drivers.",
        "kpis": kpis,
        "quality_report": quality.model_dump(),
        "numerical_stats": [s.model_dump() for s in num_stats],
        "funnel_analysis": funnel_section,
        "anomaly_analysis": anomaly_section,
        "key_insights": key_insights,
        "recommendations": recommendations,
        "limitations": "Conclusions are contingent on the historical observational window and sample cleanliness. Unobserved exogenous market shifts may influence prospective projections."
    }

    return report_payload

def export_report_excel(dataset_id: str) -> io.BytesIO:
    df = get_dataset(dataset_id)
    quality = profile_dataset(df)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Sheet 1: Raw Sample (first 500 rows)
        df.head(500).to_excel(writer, sheet_name='Data_Sample', index=False)
        
        # Sheet 2: Numerical Summary
        df.describe().to_excel(writer, sheet_name='Statistical_Summary')
        
        # Sheet 3: Quality Issues
        issues_data = [
            {
                "Type": i.type,
                "Severity": i.severity,
                "Column": i.column or "Dataset-Wide",
                "Description": i.description,
                "Affected Count": i.affected_count,
                "Suggested Action": i.suggested_action
            }
            for i in quality.issues
        ]
        if issues_data:
            pd.DataFrame(issues_data).to_excel(writer, sheet_name='Quality_Audit', index=False)

    output.seek(0)
    return output
