import pandas as pd
import numpy as np
from typing import Optional, List, Dict, Any, Tuple
from scipy import stats
from backend.app.schemas.analysis import StatisticalTestResult

def run_correlation_analysis(df: pd.DataFrame, col_a: str, col_b: str) -> StatisticalTestResult:
    clean = df[[col_a, col_b]].dropna()
    s_a = pd.to_numeric(clean[col_a], errors='coerce').dropna()
    s_b = pd.to_numeric(clean[col_b], errors='coerce').dropna()
    common_idx = s_a.index.intersection(s_b.index)
    s_a, s_b = s_a.loc[common_idx], s_b.loc[common_idx]

    if len(s_a) < 3:
        raise ValueError("Insufficient paired numeric observations for correlation analysis.")

    corr, p_val = stats.pearsonr(s_a, s_b)
    strength = "strong" if abs(corr) >= 0.7 else ("moderate" if abs(corr) >= 0.4 else "weak")
    direction = "positive" if corr > 0 else "negative"
    sig_text = "statistically significant (p < 0.05)" if p_val < 0.05 else "not statistically significant (p >= 0.05)"

    interpretation = (
        f"Pearson correlation between '{col_a}' and '{col_b}' is {corr:.3f}, indicating a {strength} {direction} association. "
        f"This relationship is {sig_text}. "
        f"Note: Correlation reflects co-movement and does not by itself demonstrate direct causation."
    )

    return StatisticalTestResult(
        test_name=f"Pearson Correlation ({col_a} vs {col_b})",
        statistic=round(float(corr), 4),
        p_value=round(float(p_val), 5),
        significant=(p_val < 0.05),
        degrees_of_freedom=float(len(s_a) - 2),
        interpretation=interpretation
    )

def run_two_sample_ttest(df: pd.DataFrame, group_col: str, metric_col: str) -> StatisticalTestResult:
    clean = df[[group_col, metric_col]].dropna()
    groups = clean[group_col].unique()
    if len(groups) < 2:
        raise ValueError(f"Grouping column '{group_col}' needs at least two distinct categories.")

    g1_val, g2_val = groups[0], groups[1]
    g1 = pd.to_numeric(clean[clean[group_col] == g1_val][metric_col], errors='coerce').dropna()
    g2 = pd.to_numeric(clean[clean[group_col] == g2_val][metric_col], errors='coerce').dropna()

    if len(g1) < 2 or len(g2) < 2:
        raise ValueError("Insufficient observations in each group for t-test.")

    t_stat, p_val = stats.ttest_ind(g1, g2, equal_var=False)
    m1, m2 = float(g1.mean()), float(g2.mean())
    sig = p_val < 0.05

    diff_text = f"Mean for '{g1_val}' ({m1:.2f}) vs '{g2_val}' ({m2:.2f})"
    if sig:
        interpretation = (
            f"Independent two-sample Welch's t-test yields t = {t_stat:.2f}, p = {p_val:.4f}. "
            f"The difference in {metric_col} between '{g1_val}' ({m1:.2f}) and '{g2_val}' ({m2:.2f}) is statistically significant at the 95% confidence level."
        )
    else:
        interpretation = (
            f"Independent two-sample Welch's t-test yields t = {t_stat:.2f}, p = {p_val:.4f}. "
            f"There is no statistically significant difference in {metric_col} between '{g1_val}' and '{g2_val}' (p >= 0.05)."
        )

    return StatisticalTestResult(
        test_name=f"Welch's Two-Sample t-test ({metric_col} across {group_col})",
        statistic=round(float(t_stat), 4),
        p_value=round(float(p_val), 5),
        significant=sig,
        interpretation=interpretation
    )

def run_chi_square_test(df: pd.DataFrame, col_a: str, col_b: str) -> StatisticalTestResult:
    contingency_table = pd.crosstab(df[col_a], df[col_b])
    chi2, p_val, dof, _ = stats.chi2_contingency(contingency_table)
    sig = p_val < 0.05

    if sig:
        interpretation = (
            f"Chi-Square test of independence (chi2 = {chi2:.2f}, p = {p_val:.4f}, dof = {dof}) shows a statistically significant "
            f"relationship between '{col_a}' and '{col_b}'. The categories are dependent."
        )
    else:
        interpretation = (
            f"Chi-Square test of independence (chi2 = {chi2:.2f}, p = {p_val:.4f}) indicates no significant evidence of dependency "
            f"between '{col_a}' and '{col_b}' (p >= 0.05)."
        )

    return StatisticalTestResult(
        test_name=f"Chi-Square Test ({col_a} vs {col_b})",
        statistic=round(float(chi2), 4),
        p_value=round(float(p_val), 5),
        significant=sig,
        degrees_of_freedom=float(dof),
        interpretation=interpretation
    )

def run_one_way_anova(df: pd.DataFrame, group_col: str, metric_col: str) -> StatisticalTestResult:
    clean = df[[group_col, metric_col]].dropna()
    groups = clean[group_col].unique()
    if len(groups) < 2:
        raise ValueError("ANOVA requires at least 2 distinct groups.")
        
    samples = [pd.to_numeric(clean[clean[group_col] == g][metric_col], errors='coerce').dropna().values for g in groups]
    samples = [s for s in samples if len(s) > 1]
    
    f_stat, p_val = stats.f_oneway(*samples)
    sig = p_val < 0.05

    interpretation = (
        f"One-way ANOVA (F = {f_stat:.2f}, p = {p_val:.4f}) across {len(samples)} groups in '{group_col}'. "
        f"{'Significant variance between group means is observed (p < 0.05).' if sig else 'No statistically significant differences between group means detected (p >= 0.05).'}"
    )

    return StatisticalTestResult(
        test_name=f"One-Way ANOVA ({metric_col} by {group_col})",
        statistic=round(float(f_stat), 4),
        p_value=round(float(p_val), 5),
        significant=sig,
        interpretation=interpretation
    )
