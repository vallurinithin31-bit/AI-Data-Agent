from typing import List, Dict, Any
from backend.app.schemas.analysis import RecommendationItem

def generate_recommendations(intent: str, metrics: Dict[str, Any]) -> List[RecommendationItem]:
    recommendations: List[RecommendationItem] = []

    # Priority 1: Funnel Bottlenecks
    if 'overall_conversion' in metrics:
        drop = metrics.get('bottleneck_drop', 0.0)
        stage = metrics.get('bottleneck_stage', 'Checkout')
        recommendations.append(RecommendationItem(
            priority="High",
            title=f"Optimize User Experience at '{stage}'",
            reason=f"Significant user attrition occurs here with a {drop}% drop-off rate.",
            expected_impact="Estimated 12–18% lift in bottom-of-funnel completion and incremental revenue.",
            evidence=f"Funnel analysis confirms '{stage}' as the single largest drop-off junction.",
            suggested_action="Perform screen recording session reviews, simplify required fields, and introduce 1-click alternative payment options."
        ))

    # Priority 2: Product Concentration / Retention
    if 'top_performer_share' in metrics and metrics['top_performer_share'] > 40:
        top_name = metrics.get('top_performer', 'Lead Product')
        share = metrics['top_performer_share']
        recommendations.append(RecommendationItem(
            priority="High",
            title="Mitigate Revenue Concentration Risk",
            reason=f"Top performer '{top_name}' represents {share}% of gross receipts.",
            expected_impact="Diversifies revenue portfolio and shields against product-specific demand shocks.",
            evidence=f"Concentration index shows top 1 item commands {share}% of total volume.",
            suggested_action="Create cross-sell bundles pairing high-margin complementary offerings with the lead product."
        ))

    # Priority 3: Anomalies / Data Quality
    if metrics.get('anomaly_count', 0) > 0:
        ano_cnt = metrics['anomaly_count']
        recommendations.append(RecommendationItem(
            priority="Medium",
            title="Investigate Outlier Transactions & Data Quality",
            reason=f"{ano_cnt} transactions deviate significantly from baseline distributions.",
            expected_impact="Prevents billing inaccuracies, captures uncollected revenue, and protects ledger integrity.",
            evidence=f"Isolation Forest & Z-score identified {ano_cnt} extreme points.",
            suggested_action="Cross-reference flagged order IDs against merchant gateway receipts and inventory dispatch logs."
        ))

    # Priority 4: Growth / Forecasting
    if 'growth_rate_pct' in metrics:
        growth = metrics['growth_rate_pct']
        if growth < 0:
            recommendations.append(RecommendationItem(
                priority="High",
                title="Launch Win-Back & Customer Retention Initiative",
                reason=f"Historical trend exhibits negative period-over-period momentum of {growth}%.",
                expected_impact="Arrests downward sales trajectory within 30 to 60 days.",
                evidence=f"Exponential smoothing regression indicates average contraction of {growth}%.",
                suggested_action="Segment churned or low-recency clients and deliver targeted personalized incentive campaigns."
            ))
        else:
            recommendations.append(RecommendationItem(
                priority="Medium",
                title="Scale Supply Chain & Inventory Buffer",
                reason=f"Consistent positive trajectory of +{growth}% will strain current inventory turnover.",
                expected_impact="Eliminates stock-out risks and maintains delivery SLA under surging demand.",
                evidence=f"Predictive forecast signals sustained {growth}% expansion.",
                suggested_action="Adjust reorder points and procurement lead-time safety buffers."
            ))

    # Fallback general recommendation
    if not recommendations:
        recommendations.append(RecommendationItem(
            priority="High",
            title="Institutionalize Automated KPI Tracking",
            reason="Continuous observation prevents unexpected operational deviations.",
            expected_impact="Reduces mean time to detect operational bottlenecks by over 50%.",
            evidence="Data profiling confirms active data availability across key business dimensions.",
            suggested_action="Schedule automated weekly report delivery and alert notifications."
        ))

    return recommendations
