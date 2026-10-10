import re
from typing import List, Dict, Any, Tuple
import pandas as pd
from backend.app.schemas.analysis import AnalysisPlan, PlanStep

def detect_query_intent(query: str, df: pd.DataFrame) -> Tuple[str, Dict[str, Any]]:
    q_low = query.lower()
    params: Dict[str, Any] = {}

    # 1. Funnel
    if any(k in q_low for k in ['funnel', 'drop-off', 'drop off', 'conversion rate', 'stages', 'checkout drop']):
        return 'funnel', params

    # 2. Cohort / Retention
    if any(k in q_low for k in ['cohort', 'retention', 'repeat purchase', 'week 1', 'month 1 retention']):
        return 'cohort', params

    # 3. Segmentation / RFM
    if any(k in q_low for k in ['segment', 'rfm', 'cluster', 'champions', 'customer group', 'most valuable']):
        return 'segmentation', params

    # 4. Forecasting / Prediction
    if any(k in q_low for k in ['predict', 'forecast', 'next month', 'future sales', 'projection', 'trend forecast']):
        return 'forecast', params

    # 5. Anomalies / Outliers
    if any(k in q_low for k in ['anomaly', 'anomalies', 'outlier', 'unusual', 'spikes', 'sudden drop', 'weird']):
        return 'anomaly', params

    # 6. Cleaning / Data Quality
    if any(k in q_low for k in ['clean', 'missing', 'duplicate', 'null', 'impute', 'standardize', 'data quality']):
        return 'cleaning', params

    # 7. Statistical Testing / Correlation
    if any(k in q_low for k in ['correlat', 'hypothesis', 't-test', 'anova', 'chi-square', 'p-value', 'factors influence', 'driver']):
        return 'stats', params

    # 8. Time-series / Trends
    if any(k in q_low for k in ['trend', 'over time', 'monthly', 'daily', 'yearly', 'history', 'growth rate', 'mom', 'yoy']):
        return 'trend', params

    # 9. Top performers / Ranking
    if any(k in q_low for k in ['top', 'best', 'highest', 'leading', 'rank', 'performer', 'bottom', 'worst']):
        return 'top_performers', params

    # 10. Direct SQL
    if q_low.strip().startswith('select') or 'write sql' in q_low or 'run query' in q_low:
        return 'sql', params

    # Default EDA / Executive Overview
    return 'eda', params

def create_plan_for_intent(query: str, intent: str, df: pd.DataFrame) -> AnalysisPlan:
    steps: List[PlanStep] = []

    if intent == 'funnel':
        steps = [
            PlanStep(step_number=1, title="Identify Funnel Stages", agent="Funnel Agent", description="Detect sequential lifecycle stages and user identifier columns in dataset."),
            PlanStep(step_number=2, title="Calculate Stage Counts", agent="Python Analysis Agent", description="Aggregate unique user occurrences across each conversion stage."),
            PlanStep(step_number=3, title="Compute Conversion & Drop-off Rates", agent="Funnel Agent", description="Calculate overall conversion rate and stage-to-stage drop-off percentages."),
            PlanStep(step_number=4, title="Identify Primary Bottleneck", agent="Funnel Agent", description="Pinpoint the exact stage causing the largest relative loss of potential conversions."),
            PlanStep(step_number=5, title="Generate Visual Funnel Chart", agent="Visualization Agent", description="Render interactive multi-stage funnel visualization with drop-off indicators."),
            PlanStep(step_number=6, title="Synthesize Recommendations", agent="Recommendation Agent", description="Provide high-priority UX, copy, and payment optimization interventions.")
        ]
    elif intent == 'cohort':
        steps = [
            PlanStep(step_number=1, title="Identify Temporal Cohorts", agent="Cohort Agent", description="Group users by acquisition/first transaction date period."),
            PlanStep(step_number=2, title="Compute Multi-Period Retention", agent="Python Analysis Agent", description="Track user recurrence through subsequent weekly or monthly periods."),
            PlanStep(step_number=3, title="Construct Retention Matrix", agent="Cohort Agent", description="Normalize counts into relative retention percentages (0-100%)."),
            PlanStep(step_number=4, title="Generate Cohort Heatmap", agent="Visualization Agent", description="Build color-scaled cohort retention heatmap."),
            PlanStep(step_number=5, title="Validate & Interpret", agent="Validation Agent", description="Audit retention decay curve against baseline benchmarks.")
        ]
    elif intent == 'segmentation':
        steps = [
            PlanStep(step_number=1, title="Extract Behavioral Dimensions", agent="Segmentation Agent", description="Calculate Recency, Frequency, and Monetary (RFM) metrics per customer."),
            PlanStep(step_number=2, title="Assign Quantile Scores", agent="Python Analysis Agent", description="Grade customer behaviors into standard RFM quintiles (1 to 5)."),
            PlanStep(step_number=3, title="Classify Strategic Segments", agent="Segmentation Agent", description="Categorize records into Champions, Loyal, At Risk, and Lost customer tiers."),
            PlanStep(step_number=4, title="Generate Segment Distributions", agent="Visualization Agent", description="Render visual breakdowns of cohort population and revenue contribution."),
            PlanStep(step_number=5, title="Actionable Engagement Strategy", agent="Recommendation Agent", description="Tailor retention and upsell playbooks for each segment.")
        ]
    elif intent == 'forecast':
        steps = [
            PlanStep(step_number=1, title="Inspect Time Series Regularity", agent="Forecasting Agent", description="Perform pre-flight check to verify minimum observation count and temporal regularity."),
            PlanStep(step_number=2, title="Decompose Historical Trends", agent="Python Analysis Agent", description="Analyze period-over-period growth rates, seasonality, and rolling averages."),
            PlanStep(step_number=3, title="Fit Predictive Model", agent="Forecasting Agent", description="Train Exponential Smoothing / Linear Trend model with confidence intervals."),
            PlanStep(step_number=4, title="Generate Forecast Chart", agent="Visualization Agent", description="Plot historical trajectory with forecasted trajectory and 95% confidence bands."),
            PlanStep(step_number=5, title="Assess Scenario Risks", agent="Insight Agent", description="Highlight underlying assumptions and potential volatility drivers.")
        ]
    elif intent == 'anomaly':
        steps = [
            PlanStep(step_number=1, title="Select Key Target Metrics", agent="Anomaly Agent", description="Isolate high-impact numeric columns such as Revenue, Volume, or Usage."),
            PlanStep(step_number=2, title="Compute Multi-Model Outlier Bounds", agent="Python Analysis Agent", description="Execute Z-score, IQR, and Isolation Forest algorithms simultaneously."),
            PlanStep(step_number=3, title="Score Severity & Impact", agent="Anomaly Agent", description="Categorize deviations into Critical, High, and Medium severity tiers."),
            PlanStep(step_number=4, title="Trace Potential Root Causes", agent="Insight Agent", description="Analyze contextual metadata surrounding each anomalous record."),
            PlanStep(step_number=5, title="Recommend Investigation Audits", agent="Recommendation Agent", description="Formulate audit checklist to investigate operational glitches or fraud.")
        ]
    elif intent == 'stats':
        steps = [
            PlanStep(step_number=1, title="Identify Relevant Dependent/Independent Variables", agent="Analysis Planner", description="Detect continuous and categorical factors for comparative evaluation."),
            PlanStep(step_number=2, title="Execute Statistical Hypothesis Tests", agent="Python Analysis Agent", description="Run Pearson correlation, Two-Sample t-tests, or Chi-Square tests."),
            PlanStep(step_number=3, title="Compute Effect Sizes & p-values", agent="Python Analysis Agent", description="Evaluate statistical significance against the alpha = 0.05 threshold."),
            PlanStep(step_number=4, title="Translate into Non-Technical Language", agent="Insight Agent", description="Explain business implications without confusing correlation with causation."),
            PlanStep(step_number=5, title="Integrity & Hallucination Audit", agent="Validation Agent", description="Cross-reference conclusions directly against calculated test statistics.")
        ]
    elif intent == 'trend':
        steps = [
            PlanStep(step_number=1, title="Identify Date and Measure Columns", agent="Analysis Planner", description="Locate timestamp and numeric metric columns."),
            PlanStep(step_number=2, title="Aggregate Time Intervals", agent="SQL Agent", description="Group records chronologically by day, month, or quarter."),
            PlanStep(step_number=3, title="Calculate Growth Metrics", agent="Python Analysis Agent", description="Compute Month-over-Month (MoM) growth rates and moving averages."),
            PlanStep(step_number=4, title="Render Interactive Trend Chart", agent="Visualization Agent", description="Generate high-resolution line chart with hover tooltips and trend line."),
            PlanStep(step_number=5, title="Summarize Drivers", agent="Insight Agent", description="Detail key peak periods and contraction intervals.")
        ]
    elif intent == 'top_performers':
        steps = [
            PlanStep(step_number=1, title="Identify Category and Value Fields", agent="Analysis Planner", description="Extract dimensions and target aggregations."),
            PlanStep(step_number=2, title="Execute Grouped Ranking Query", agent="SQL Agent", description="Compute sum, count, and percentage share grouped by category."),
            PlanStep(step_number=3, title="Calculate Pareto Concentration", agent="Python Analysis Agent", description="Assess what percentage of total volume is driven by the top 20%."),
            PlanStep(step_number=4, title="Visualize Ranked Hierarchy", agent="Visualization Agent", description="Render sorted bar/column chart for instant comparison."),
            PlanStep(step_number=5, title="Commercial Insights & Strategy", agent="Recommendation Agent", description="Advise on cross-selling, pricing, or product catalog rebalancing.")
        ]
    else:  # eda
        steps = [
            PlanStep(step_number=1, title="Dataset Schema & Health Scan", agent="Data Profiler", description="Inspect rows, column datatypes, missing ratios, and summary metrics."),
            PlanStep(step_number=2, title="Compute High-Level Business KPIs", agent="SQL Agent", description="Extract gross totals, transaction averages, and active entities."),
            PlanStep(step_number=3, title="Analyze Distribution & Variance", agent="Python Analysis Agent", description="Evaluate skewness, top categories, and primary numeric ranges."),
            PlanStep(step_number=4, title="Construct Executive Overview Visuals", agent="Visualization Agent", description="Assemble multi-metric charts and KPI cards."),
            PlanStep(step_number=5, title="Synthesize Executive Summary", agent="Insight Agent", description="Deliver top high-impact findings with grounded evidence.")
        ]

    return AnalysisPlan(
        query=query,
        intent=intent,
        steps=steps,
        execution_time_ms=0.0
    )
