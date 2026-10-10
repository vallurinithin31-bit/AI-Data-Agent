from typing import List, Dict, Any
from backend.app.schemas.analysis import KeyFinding

def generate_key_findings(metrics: Dict[str, Any], context: str) -> List[KeyFinding]:
    findings: List[KeyFinding] = []
    
    # 1. Total volume / scale finding
    if 'total_rows' in metrics:
        r = metrics['total_rows']
        c = metrics.get('total_cols', 'multiple')
        findings.append(KeyFinding(
            finding=f"The dataset encapsulates {r:,} transactional records across {c} distinct attributes.",
            supporting_metric=f"Rows: {r:,}, Columns: {c}",
            business_impact="Sufficient observational density to draw statistically significant operational conclusions.",
            confidence="High"
        ))
        
    # 2. Revenue / Monetary finding
    if 'total_revenue' in metrics:
        rev = metrics['total_revenue']
        avg_rev = metrics.get('avg_revenue', 0.0)
        findings.append(KeyFinding(
            finding=f"Total gross volume reached ${rev:,.2f} with an average transaction value of ${avg_rev:,.2f}.",
            supporting_metric=f"Total: ${rev:,.2f} | Mean: ${avg_rev:,.2f}",
            business_impact="Direct baseline top-line figure for evaluating period growth and margin elasticity.",
            confidence="High"
        ))

    # 3. Top category / performer finding
    if 'top_performer' in metrics:
        top_name = metrics['top_performer']
        top_val = metrics.get('top_performer_val', 0.0)
        top_share = metrics.get('top_performer_share', 0.0)
        findings.append(KeyFinding(
            finding=f"'{top_name}' emerged as the dominant leader, driving ${top_val:,.2f} ({top_share}% of cumulative volume).",
            supporting_metric=f"Share: {top_share}% | Value: ${top_val:,.2f}",
            business_impact="High revenue concentration creates dependency risk while confirming clear product-market leadership.",
            confidence="High",
            limitations="Assumes historical attribution remains constant across subsequent promotional cycles."
        ))

    # 4. Conversion / Funnel finding
    if 'overall_conversion' in metrics:
        conv = metrics['overall_conversion']
        bottleneck = metrics.get('bottleneck_stage', 'Unknown')
        drop = metrics.get('bottleneck_drop', 0.0)
        findings.append(KeyFinding(
            finding=f"End-to-end conversion efficiency is {conv}%, with the steepest friction drop at '{bottleneck}' ({drop}% drop-off).",
            supporting_metric=f"Conversion: {conv}% | Bottleneck Drop: {drop}%",
            business_impact=f"Rectifying friction at '{bottleneck}' offers the highest leverage opportunity for customer acquisition ROI.",
            confidence="High"
        ))

    # 5. Trend / Growth finding
    if 'growth_rate_pct' in metrics:
        growth = metrics['growth_rate_pct']
        trend_dir = "expansion" if growth > 0 else "contraction"
        findings.append(KeyFinding(
            finding=f"Observed an average period-over-period {trend_dir} rate of {abs(growth):.1f}%.",
            supporting_metric=f"Growth Rate: {growth:+.1f}%",
            business_impact=f"Trajectory signals sustained {'momentum requiring capacity expansion' if growth > 0 else 'softening that demands customer retention intervention'}.",
            confidence="High"
        ))

    # 6. Anomaly finding
    if 'anomaly_count' in metrics:
        ano = metrics['anomaly_count']
        crit = metrics.get('critical_anomalies', 0)
        findings.append(KeyFinding(
            finding=f"Isolated {ano} statistical outlier occurrences, including {crit} critical deviations exceeding 4 standard deviations.",
            supporting_metric=f"Outliers: {ano} | Critical: {crit}",
            business_impact="Potential revenue leakage, data pipeline instrumentation bugs, or high-value VIP micro-segments.",
            confidence="Medium",
            limitations="Root causes must be confirmed against operational logs."
        ))

    # Fallback finding if none matched
    if not findings:
        for k, v in list(metrics.items())[:3]:
            findings.append(KeyFinding(
                finding=f"Metric '{k}' evaluated to {v}.",
                supporting_metric=f"{k} = {v}",
                business_impact="Operational indicator relevant to underlying dataset query.",
                confidence="Medium"
            ))

    return findings
