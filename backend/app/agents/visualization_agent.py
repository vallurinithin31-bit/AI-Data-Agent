import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from backend.app.schemas.analysis import VisualizationConfig

def create_chart_config(
    chart_type: str,
    title: str,
    data: List[Dict[str, Any]],
    x_axis: Optional[str] = None,
    y_axis: Optional[str] = None,
    series_keys: Optional[List[str]] = None,
    description: Optional[str] = None,
    options: Optional[Dict[str, Any]] = None
) -> VisualizationConfig:
    return VisualizationConfig(
        chart_type=chart_type,
        title=title,
        description=description,
        x_axis=x_axis,
        y_axis=y_axis,
        series_keys=series_keys or ([y_axis] if y_axis else []),
        data=data,
        options=options or {}
    )

def auto_recommend_visualization(df: pd.DataFrame, x_col: Optional[str] = None, y_col: Optional[str] = None) -> VisualizationConfig:
    """
    Automatically deduces the best chart representation based on column types and cardinalities.
    """
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    dt_cols = [c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c]) or 'date' in c.lower()]
    cat_cols = [c for c in df.columns if c not in num_cols and c not in dt_cols]

    # Scenario 1: Date column + numeric column -> Line / Area trend chart
    if dt_cols and num_cols:
        d_col = dt_cols[0]
        val_col = num_cols[0]
        agg_df = df.dropna(subset=[d_col, val_col]).copy()
        agg_df['DateStr'] = pd.to_datetime(agg_df[d_col], errors='coerce').dt.strftime('%Y-%m-%d')
        grouped = agg_df.groupby('DateStr')[val_col].sum().reset_index().sort_values('DateStr').head(30)
        
        data = [{"date": r['DateStr'], val_col: round(float(r[val_col]), 2)} for _, r in grouped.iterrows()]
        return create_chart_config(
            chart_type="line",
            title=f"{val_col} Trajectory Over Time",
            description=f"Chronological aggregation of {val_col}",
            x_axis="date",
            y_axis=val_col,
            data=data
        )

    # Scenario 2: Categorical + Numeric -> Bar or Donut chart
    if cat_cols and num_cols:
        c_col = cat_cols[0]
        val_col = num_cols[0]
        grouped = df.groupby(c_col)[val_col].sum().reset_index().sort_values(val_col, ascending=False).head(10)
        cardinality = len(grouped)
        
        data = [{c_col: str(r[c_col]), val_col: round(float(r[val_col]), 2)} for _, r in grouped.iterrows()]
        chart_type = "donut" if cardinality <= 5 else "bar"
        
        return create_chart_config(
            chart_type=chart_type,
            title=f"{val_col} by {c_col}",
            description=f"Total breakdown across top {c_col} categories",
            x_axis=c_col,
            y_axis=val_col,
            data=data
        )

    # Scenario 3: Two numeric columns -> Scatter plot
    if len(num_cols) >= 2:
        col_x, col_y = num_cols[0], num_cols[1]
        sample = df[[col_x, col_y]].dropna().sample(min(100, len(df)))
        data = [{col_x: round(float(r[col_x]), 2), col_y: round(float(r[col_y]), 2)} for _, r in sample.iterrows()]
        
        return create_chart_config(
            chart_type="scatter",
            title=f"Correlation Scatter: {col_x} vs {col_y}",
            description=f"Bivariate distribution showing pairwise correlation",
            x_axis=col_x,
            y_axis=col_y,
            data=data
        )

    # Fallback: Top categorical frequencies
    if cat_cols:
        c_col = cat_cols[0]
        counts = df[c_col].value_counts().head(8).reset_index()
        counts.columns = [c_col, 'Count']
        data = [{c_col: str(r[c_col]), 'Count': int(r['Count'])} for _, r in counts.iterrows()]
        return create_chart_config(
            chart_type="bar",
            title=f"Distribution of {c_col}",
            description=f"Frequency counts for {c_col}",
            x_axis=c_col,
            y_axis="Count",
            data=data
        )

    # Default empty table visual
    return create_chart_config(
        chart_type="table",
        title="Dataset Overview",
        data=df.head(10).to_dict(orient='records')
    )
