import time
import os
import re
import json
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

from backend.app.core.config import settings
from backend.app.schemas.analysis import (
    AnalysisResponse, AnalysisPlan, VisualizationConfig, KeyFinding, RecommendationItem
)
from backend.app.tools.data_loader import get_dataset, get_metadata
from backend.app.tools.sql_engine import execute_sql_query
from backend.app.tools.sandbox import execute_sandboxed_python
from backend.app.agents.analysis_planner import detect_query_intent, create_plan_for_intent
from backend.app.agents.funnel_agent import analyze_funnel
from backend.app.agents.cohort_agent import analyze_cohorts
from backend.app.agents.segmentation_agent import perform_rfm_segmentation, perform_kmeans_clustering
from backend.app.agents.forecasting_agent import forecast_time_series
from backend.app.agents.anomaly_agent import detect_anomalies
from backend.app.agents.stats_agent import run_correlation_analysis, run_two_sample_ttest
from backend.app.agents.visualization_agent import auto_recommend_visualization, create_chart_config
from backend.app.agents.validation_agent import validate_analysis_integrity
from backend.app.agents.insight_agent import generate_key_findings
from backend.app.agents.recommendation_agent import generate_recommendations

def run_agentic_analysis(dataset_id: str, query: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> AnalysisResponse:
    start_time = time.time()
    df = get_dataset(dataset_id)
    meta = get_metadata(dataset_id)

    # Step 1: Intent Detection & Analysis Planning
    intent, intent_params = detect_query_intent(query, df)
    plan = create_plan_for_intent(query, intent, df)

    computed_metrics: Dict[str, Any] = {
        'total_rows': len(df),
        'total_cols': len(df.columns)
    }
    
    visual_config: Optional[VisualizationConfig] = None
    secondary_visual: Optional[VisualizationConfig] = None
    funnel_res = None
    cohort_res = None
    seg_res = None
    forecast_res = None
    anomaly_res = None
    stats_res = None
    sql_executed = None
    code_executed = None
    execution_success = True
    formatted_answer = ""

    # Execute dynamic agent workflows based on intent
    try:
        if intent == 'funnel':
            funnel_res = analyze_funnel(df)
            computed_metrics['overall_conversion'] = funnel_res.overall_conversion
            computed_metrics['bottleneck_stage'] = funnel_res.biggest_drop_off_stage
            computed_metrics['bottleneck_drop'] = funnel_res.biggest_drop_off_rate
            
            # Funnel chart visualization
            f_data = [
                {
                    "stage": s.stage_name,
                    "users": s.user_count,
                    "conversion_rate": s.conversion_rate,
                    "drop_off_rate": s.drop_off_rate
                }
                for s in funnel_res.stages
            ]
            chart_title = (
                f"Outreach Conversion Pipeline ({funnel_res.stage_column})"
                if funnel_res.detected_mode == 'response_pipeline'
                else "Conversion Funnel Progression"
            )
            chart_desc = (
                "Progressive conversion from targeted outreach down to qualified responses & interest"
                if funnel_res.detected_mode == 'response_pipeline'
                else "User volume and conversion across each sequential milestone"
            )
            visual_config = create_chart_config(
                chart_type="funnel",
                title=chart_title,
                description=chart_desc,
                x_axis="stage",
                y_axis="users",
                data=f_data
            )
            
            mode_badge = " (⚡ Auto-Converted from Response Dispositions)" if funnel_res.detected_mode == 'response_pipeline' else ""
            formatted_answer = (
                f"### Funnel Analysis Overview{mode_badge}\n\n"
                f"* **Stage / Response Column:** `{funnel_res.stage_column}`\n"
                f"* **Overall Conversion Rate:** `{funnel_res.overall_conversion}%`\n"
                f"* **Critical Drop-off Point:** `{funnel_res.biggest_drop_off_stage}` with a **{funnel_res.biggest_drop_off_rate}%** drop.\n\n"
                f"{funnel_res.diagnostic_summary}"
            )

        elif intent == 'cohort':
            cohort_res = analyze_cohorts(df)
            computed_metrics['total_cohorts'] = len(cohort_res.cohorts)
            
            # Format heatmap data for visual agent
            heatmap_data = []
            for i, c_name in enumerate(cohort_res.cohorts):
                row_item: Dict[str, Any] = {"cohort": c_name, "size": cohort_res.cohort_sizes[i]}
                for j, p_name in enumerate(cohort_res.periods):
                    row_item[p_name] = cohort_res.retention_matrix[i][j]
                heatmap_data.append(row_item)

            visual_config = create_chart_config(
                chart_type="cohort",
                title="User Retention Cohort Heatmap",
                description="Percentage of active returning users across subsequent time periods",
                x_axis="period",
                y_axis="cohort",
                series_keys=cohort_res.periods,
                data=heatmap_data
            )
            formatted_answer = f"### Cohort Retention Analysis\n\n{cohort_res.summary}"

        elif intent == 'segmentation':
            # Identify customer/amount/date columns
            cust_col = next((c for c in df.columns if any(k in c.lower() for k in ['customer', 'user', 'client', 'id'])), df.columns[0])
            date_col = next((c for c in df.columns if any(k in c.lower() for k in ['date', 'time', 'signup'])), None)
            amt_col = next((c for c in df.columns if any(k in c.lower() for k in ['revenue', 'amount', 'profit', 'spend', 'mrr', 'ltv', 'price'])), None)

            if cust_col and date_col and amt_col:
                seg_res = perform_rfm_segmentation(df, cust_col, date_col, amt_col)
                computed_metrics['segmented_customers'] = seg_res.total_customers
                
                chart_data = [{"segment": s.segment_name, "customers": s.customer_count, "avg_spend": s.avg_monetary} for s in seg_res.segments]
                visual_config = create_chart_config(
                    chart_type="donut",
                    title="Customer Segments Breakdown",
                    description="Proportion of customer base across strategic RFM tiers",
                    x_axis="segment",
                    y_axis="customers",
                    data=chart_data
                )
            else:
                num_cols = df.select_dtypes(include=[np.number]).columns.tolist()[:3]
                seg_res = perform_kmeans_clustering(df, num_cols, n_clusters=4)
                chart_data = [{"segment": s.segment_name, "count": s.customer_count} for s in seg_res.segments]
                visual_config = create_chart_config(
                    chart_type="bar",
                    title="Cluster Size Distribution",
                    x_axis="segment",
                    y_axis="count",
                    data=chart_data
                )

            formatted_answer = f"### Customer Segmentation Results\n\n{seg_res.summary}"

        elif intent == 'forecast':
            date_col = next((c for c in df.columns if any(k in c.lower() for k in ['date', 'time', 'created', 'order'])), None)
            val_col = next((c for c in df.columns if any(k in c.lower() for k in ['revenue', 'sales', 'amount', 'mrr', 'profit', 'count', 'users'])), None)
            
            if not val_col:
                num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
                val_col = num_cols[0] if num_cols else None

            if not date_col or not val_col:
                raise ValueError("Forecasting requires at least one date column and one numeric metric column.")

            forecast_res = forecast_time_series(df, date_col, val_col, horizon=6)
            if forecast_res.is_suitable:
                computed_metrics['growth_rate_pct'] = forecast_res.growth_rate_pct
                
                chart_data = [
                    {
                        "date": p.date,
                        "actual": p.actual,
                        "predicted": p.predicted,
                        "lower_bound": p.lower_bound,
                        "upper_bound": p.upper_bound
                    }
                    for p in forecast_res.points
                ]
                visual_config = create_chart_config(
                    chart_type="line",
                    title=f"Predictive Forecast: {val_col}",
                    description=f"Historical data alongside projected 6-month horizon with 95% confidence intervals",
                    x_axis="date",
                    y_axis="predicted",
                    series_keys=["actual", "predicted", "lower_bound", "upper_bound"],
                    data=chart_data
                )
                formatted_answer = f"### Time-Series Forecast & Trajectory\n\n{forecast_res.summary}"
            else:
                formatted_answer = f"### Forecasting Check Notice\n\n> [!NOTE]\n> {forecast_res.suitability_reason}"

        elif intent == 'anomaly':
            anomaly_res = detect_anomalies(df)
            computed_metrics['anomaly_count'] = anomaly_res.total_anomalies
            computed_metrics['critical_anomalies'] = sum(1 for a in anomaly_res.anomalies if a.severity == "Critical")
            
            # Bar chart of top deviations
            chart_data = [
                {
                    "identifier": a.key_identifier,
                    "actual": a.actual_value,
                    "expected": a.expected_value,
                    "deviation_pct": a.deviation_pct,
                    "severity": a.severity
                }
                for a in anomaly_res.anomalies[:10]
            ]
            visual_config = create_chart_config(
                chart_type="bar",
                title="Top Statistical Anomalies by Magnitude",
                description="Actual values compared with model baseline expectations",
                x_axis="identifier",
                y_axis="actual",
                data=chart_data
            )
            formatted_answer = f"### Anomaly Detection Audit\n\n{anomaly_res.summary}"

        elif intent == 'stats':
            num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if len(num_cols) >= 2:
                stats_res = run_correlation_analysis(df, num_cols[0], num_cols[1])
                computed_metrics['correlation'] = stats_res.statistic
                computed_metrics['p_value'] = stats_res.p_value
                
                # Scatter plot
                sample_pts = df[[num_cols[0], num_cols[1]]].dropna().head(100)
                data_pts = [{num_cols[0]: float(r[num_cols[0]]), num_cols[1]: float(r[num_cols[1]])} for _, r in sample_pts.iterrows()]
                visual_config = create_chart_config(
                    chart_type="scatter",
                    title=f"Scatter: {num_cols[0]} vs {num_cols[1]}",
                    x_axis=num_cols[0],
                    y_axis=num_cols[1],
                    data=data_pts
                )
                formatted_answer = f"### Statistical Analysis & Hypothesis Testing\n\n{stats_res.interpretation}"
            else:
                formatted_answer = "Insufficient numeric variables to run bivariate statistical hypothesis tests."

        elif intent in ['trend', 'top_performers']:
            # Use SQL Engine to compute aggregations safely
            num_col = next((c for c in df.columns if any(k in c.lower() for k in ['revenue', 'sales', 'profit', 'amount', 'mrr'])), None)
            if not num_col:
                num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
                num_col = num_cols[0] if num_cols else df.columns[0]

            cat_col = next((c for c in df.columns if any(k in c.lower() for k in ['category', 'product', 'region', 'plan', 'channel'])), None)
            if not cat_col:
                cat_cols = df.select_dtypes(exclude=[np.number, 'datetime64']).columns.tolist()
                cat_col = cat_cols[0] if cat_cols else df.columns[0]

            sql_query = f"""
                SELECT "{cat_col}" as category,
                       ROUND(SUM("{num_col}"), 2) as total_value,
                       ROUND(AVG("{num_col}"), 2) as avg_value,
                       COUNT(*) as record_count
                FROM dataset
                WHERE "{cat_col}" IS NOT NULL
                GROUP BY "{cat_col}"
                ORDER BY total_value DESC
                LIMIT 10
            """
            success, rows, cols, msg = execute_sql_query(sql_query, df)
            sql_executed = sql_query.strip()
            
            if success and rows:
                computed_metrics['total_revenue'] = round(float(sum(r['total_value'] for r in rows if r['total_value'])), 2)
                top_row = rows[0]
                computed_metrics['top_performer'] = str(top_row['category'])
                computed_metrics['top_performer_val'] = round(float(top_row['total_value']), 2)
                if computed_metrics['total_revenue'] > 0:
                    computed_metrics['top_performer_share'] = round((computed_metrics['top_performer_val'] / computed_metrics['total_revenue']) * 100, 1)

                visual_config = create_chart_config(
                    chart_type="bar",
                    title=f"Top {cat_col} by {num_col}",
                    description=f"Comparative performance ranked by gross {num_col}",
                    x_axis="category",
                    y_axis="total_value",
                    data=rows
                )
                formatted_answer = (
                    f"### Performance Breakdown: {cat_col} by {num_col}\n\n"
                    f"Top leader is **{top_row['category']}** generating **${top_row['total_value']:,.2f}** "
                    f"across {top_row['record_count']:,} individual transactions."
                )

        else:  # General EDA
            visual_config = auto_recommend_visualization(df)
            num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if num_cols:
                primary_num = num_cols[0]
                computed_metrics['total_volume'] = round(float(df[primary_num].sum()), 2)
                computed_metrics['avg_volume'] = round(float(df[primary_num].mean()), 2)
                
            formatted_answer = (
                f"### Exploratory Data Summary for `{meta.name}`\n\n"
                f"The dataset contains **{len(df):,} rows** and **{len(df.columns)} columns**. "
                f"Key numerical columns include {', '.join(meta.numerical_columns[:4])}."
            )

    except Exception as e:
        execution_success = False
        formatted_answer = f"### Analysis Execution Notice\n\nEncountered an exception while processing query: `{str(e)}`."

    # Step 6: Result Validation Agent
    written_claims = [formatted_answer]
    valid_ok, valid_notes = validate_analysis_integrity(
        df=df,
        execution_success=execution_success,
        required_columns=[],
        computed_metrics=computed_metrics,
        written_insights=written_claims,
        visual_data=visual_config.data if visual_config else None
    )

    # Step 7: Insight & Recommendation Generation
    key_findings = generate_key_findings(computed_metrics, context=query)
    recommendations = generate_recommendations(intent, computed_metrics)

    # Calculate execution time
    duration = round((time.time() - start_time) * 1000, 1)
    plan.execution_time_ms = duration

    # Mark plan steps completed
    for step in plan.steps:
        step.status = "completed"

    return AnalysisResponse(
        dataset_id=dataset_id,
        query=query,
        intent=intent,
        plan=plan,
        execution_code=code_executed,
        sql_query=sql_executed,
        key_findings=key_findings,
        recommendations=recommendations,
        visual=visual_config,
        secondary_visual=secondary_visual,
        statistical_test=stats_res,
        funnel_result=funnel_res,
        cohort_result=cohort_res,
        segmentation_result=seg_res,
        forecast_result=forecast_res,
        anomaly_result=anomaly_res,
        raw_data_preview=df.head(10).to_dict(orient='records'),
        validation_passed=valid_ok,
        validation_notes=valid_notes,
        formatted_answer=formatted_answer
    )
