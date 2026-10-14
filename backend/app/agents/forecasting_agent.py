from typing import Optional, List, Dict, Any, Tuple
import pandas as pd
import numpy as np

from backend.app.schemas.analysis import ForecastResult, ForecastDataPoint

def evaluate_forecasting_suitability(ts_series: pd.Series) -> Tuple[bool, str]:
    if len(ts_series) < 6:
        return False, f"Insufficient temporal data points ({len(ts_series)}). Forecasting requires at least 6 sequential historical time steps."
    if ts_series.nunique() <= 1:
        return False, "Zero variance detected in historical values over time; series is completely constant."
    if ts_series.isna().sum() / len(ts_series) > 0.4:
        return False, "Over 40% of time intervals are missing or NaN, preventing reliable continuity modeling."
    return True, "Dataset satisfies time-series regularity and sufficiency criteria for statistical forecasting."

def _fit_holt_linear(ts_values: np.ndarray, horizon: int = 6) -> List[float]:
    """Holt's Two-Parameter Linear Exponential Smoothing with automated MSE parameter grid search."""
    n = len(ts_values)
    best_mse = float('inf')
    best_alpha, best_beta = 0.3, 0.1
    
    # Grid search for optimal alpha and beta
    for a in [0.1, 0.2, 0.3, 0.5, 0.7]:
        for b in [0.05, 0.1, 0.2, 0.3]:
            level = float(ts_values[0])
            trend = float(ts_values[1] - ts_values[0]) if n > 1 else 0.0
            sse = 0.0
            for t in range(1, n):
                pred = level + trend
                actual = float(ts_values[t])
                sse += (actual - pred) ** 2
                level = a * actual + (1.0 - a) * (level + trend)
                trend = b * (level - (level - trend)) + (1.0 - b) * trend
            mse = sse / max(1, n - 1)
            if mse < best_mse:
                best_mse = mse
                best_alpha, best_beta = a, b

    # Run forward with best parameters
    level = float(ts_values[0])
    trend = float(ts_values[1] - ts_values[0]) if n > 1 else 0.0
    for val in ts_values[1:]:
        val = float(val)
        last_level = level
        level = best_alpha * val + (1.0 - best_alpha) * (last_level + trend)
        trend = best_beta * (level - last_level) + (1.0 - best_beta) * trend

    return [level + (h + 1) * trend for h in range(horizon)]

def forecast_time_series(df: pd.DataFrame, date_col: str, target_col: str, horizon: int = 6, freq: str = 'ME') -> ForecastResult:
    if freq == 'M':
        freq = 'ME'
    clean_df = df[[date_col, target_col]].dropna().copy()
    clean_df['Date'] = pd.to_datetime(clean_df[date_col], errors='coerce')
    clean_df['Target'] = pd.to_numeric(clean_df[target_col], errors='coerce')
    clean_df = clean_df.dropna().sort_values('Date')
    
    # Aggregate by chosen frequency
    ts = clean_df.set_index('Date').resample(freq)['Target'].sum()
    
    is_suitable, reason = evaluate_forecasting_suitability(ts)
    if not is_suitable:
        return ForecastResult(
            target_column=target_col,
            date_column=date_col,
            method="Pre-flight Suitability Check",
            historical_points=len(ts),
            forecast_horizon=horizon,
            trend_direction="Indeterminate",
            is_suitable=False,
            suitability_reason=reason,
            points=[],
            summary=f"Forecasting was halted: {reason}"
        )

    # Calculate MoM growth and trend
    pct_changes = ts.pct_change().dropna()
    avg_growth = round(float(pct_changes.mean() * 100), 2) if len(pct_changes) > 0 else 0.0
    
    historical_points: List[ForecastDataPoint] = []
    for dt, val in ts.items():
        historical_points.append(ForecastDataPoint(
            date=dt.strftime('%Y-%m-%d'),
            actual=round(float(val), 2),
            predicted=round(float(val), 2)
        ))

    method_used = "Holt Exponential Smoothing"
    ts_vals = ts.values.astype(float)
    try:
        if len(ts) >= 10:
            pred_vals = _fit_holt_linear(ts_vals, horizon)
        else:
            raise ValueError("Too few points for Holt; falling back to Linear Trend")
    except Exception:
        method_used = "Linear Trend Projection"
        X = np.arange(len(ts_vals))
        slope, intercept = np.polyfit(X, ts_vals, 1)
        pred_vals = [float(slope * (len(ts_vals) + h) + intercept) for h in range(horizon)]

    last_dt = ts.index[-1]
    future_dates = pd.date_range(start=last_dt + pd.DateOffset(months=1), periods=horizon, freq=freq)
    predictions = pd.Series(pred_vals, index=future_dates)

    # Estimate uncertainty / confidence intervals (1.5 * std of residuals)
    fitted_vals = ts.values[-min(5, len(ts)):]
    residuals_std = float(np.std(fitted_vals)) if len(fitted_vals) > 1 else (float(ts.mean()) * 0.1)
    
    forecast_points: List[ForecastDataPoint] = []
    for i, (dt, pred_val) in enumerate(predictions.items()):
        val_clean = max(0.0, float(pred_val))
        margin = residuals_std * (1.0 + (i * 0.15))
        forecast_points.append(ForecastDataPoint(
            date=dt.strftime('%Y-%m-%d'),
            actual=None,
            predicted=round(val_clean, 2),
            lower_bound=round(max(0.0, val_clean - margin), 2),
            upper_bound=round(val_clean + margin, 2)
        ))

    all_points = historical_points + forecast_points
    trend_dir = "Upward" if avg_growth > 0.5 else ("Downward" if avg_growth < -0.5 else "Stable")

    summary = (
        f"Generated {horizon}-period forecast for '{target_col}' using {method_used}. "
        f"Historical trajectory shows an {trend_dir.lower()} trend with an average period-over-period growth rate of {avg_growth}%. "
        f"Projected next-period value is {forecast_points[0].predicted:,.2f} "
        f"(confidence range: {forecast_points[0].lower_bound:,.2f} - {forecast_points[0].upper_bound:,.2f})."
    )

    return ForecastResult(
        target_column=target_col,
        date_column=date_col,
        method=method_used,
        historical_points=len(ts),
        forecast_horizon=horizon,
        trend_direction=trend_dir,
        growth_rate_pct=avg_growth,
        is_suitable=True,
        suitability_reason=reason,
        points=all_points,
        summary=summary
    )
