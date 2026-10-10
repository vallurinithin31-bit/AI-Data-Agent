import pandas as pd
import numpy as np
from typing import Optional, List, Dict, Any, Tuple
from backend.app.schemas.analysis import CohortAnalysisResult

def detect_cohort_columns(df: pd.DataFrame) -> Tuple[Optional[str], Optional[str]]:
    date_col = None
    user_col = None
    
    for col in df.columns:
        c_low = col.lower()
        if not user_col and any(k in c_low for k in ['customer_id', 'user_id', 'client_id', 'account_id', 'id']):
            user_col = col
        if not date_col and any(k in c_low for k in ['date', 'time', 'signup', 'created', 'order_date', 'timestamp']):
            date_col = col
            
    return user_col, date_col

def analyze_cohorts(df: pd.DataFrame, user_col: Optional[str] = None, date_col: Optional[str] = None, time_window: str = 'month') -> CohortAnalysisResult:
    if not user_col or not date_col:
        det_user, det_date = detect_cohort_columns(df)
        user_col = user_col or det_user
        date_col = date_col or det_date
        
    if not user_col or not date_col:
        raise ValueError("Cohort analysis requires a user/customer identifier column and a transaction/activity date column.")

    df_copy = df[[user_col, date_col]].dropna().copy()
    df_copy['ActivityDate'] = pd.to_datetime(df_copy[date_col], errors='coerce')
    df_copy = df_copy.dropna(subset=['ActivityDate'])
    
    # Cohort group = first activity date
    if time_window == 'month':
        df_copy['ActivityPeriod'] = df_copy['ActivityDate'].dt.to_period('M')
        df_copy['CohortGroup'] = df_copy.groupby(user_col)['ActivityPeriod'].transform('min')
        df_copy['PeriodNumber'] = (df_copy['ActivityPeriod'].dt.year - df_copy['CohortGroup'].dt.year) * 12 + (df_copy['ActivityPeriod'].dt.month - df_copy['CohortGroup'].dt.month)
    else:
        df_copy['ActivityPeriod'] = df_copy['ActivityDate'].dt.to_period('W')
        df_copy['CohortGroup'] = df_copy.groupby(user_col)['ActivityPeriod'].transform('min')
        df_copy['PeriodNumber'] = (df_copy['ActivityDate'] - df_copy.groupby(user_col)['ActivityDate'].transform('min')).dt.days // 7

    # Group by CohortGroup and PeriodNumber
    cohort_data = df_copy.groupby(['CohortGroup', 'PeriodNumber'])[user_col].nunique().reset_index()
    cohort_pivot = cohort_data.pivot(index='CohortGroup', columns='PeriodNumber', values=user_col)
    
    # Filter only top 10 recent cohorts and first 6 periods for clean display
    cohort_pivot = cohort_pivot.head(10)
    cohort_sizes = cohort_pivot.iloc[:, 0].astype(int).tolist()
    
    # Calculate retention percentages
    retention_matrix_df = cohort_pivot.divide(cohort_pivot.iloc[:, 0], axis=0) * 100
    retention_matrix_df = retention_matrix_df.round(1)
    
    cohort_names = [str(c) for c in retention_matrix_df.index]
    max_periods = min(8, len(retention_matrix_df.columns))
    period_names = [f"Period {i}" for i in range(max_periods)]
    
    matrix_values: List[List[Optional[float]]] = []
    for idx, row in retention_matrix_df.iloc[:, :max_periods].iterrows():
        row_vals = []
        for val in row:
            if pd.isna(val):
                row_vals.append(None)
            else:
                row_vals.append(float(val))
        matrix_values.append(row_vals)

    avg_p1 = 0.0
    if len(retention_matrix_df.columns) > 1:
        avg_p1 = round(float(retention_matrix_df.iloc[:, 1].dropna().mean()), 1)

    summary = (
        f"Analyzed {len(cohort_names)} acquisition cohorts across {sum(cohort_sizes):,} unique entities. "
        f"Average Period 1 retention is {avg_p1}%. Initial period drop-offs indicate strong churn occurs immediately after Period 0."
    )

    return CohortAnalysisResult(
        cohort_metric="Retention Rate (%)",
        cohorts=cohort_names,
        periods=period_names,
        retention_matrix=matrix_values,
        cohort_sizes=cohort_sizes,
        summary=summary
    )
