import math
from typing import Optional, List, Dict, Any, Tuple
import pandas as pd
import numpy as np

from backend.app.schemas.analysis import StatisticalTestResult

# High-precision numerical distribution functions for statistical inference without scipy dependency
def _betacf(a: float, b: float, x: float) -> float:
    MAXIT = 100
    EPS = 3.0e-7
    FPMIN = 1.0e-30
    qab = a + b
    qap = a + 1.0
    qam = a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < FPMIN:
        d = FPMIN
    d = 1.0 / d
    h = d
    for m in range(1, MAXIT + 1):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        if abs(d) < FPMIN:
            d = FPMIN
        c = 1.0 + aa / c
        if abs(c) < FPMIN:
            c = FPMIN
        d = 1.0 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        if abs(d) < FPMIN:
            d = FPMIN
        c = 1.0 + aa / c
        if abs(c) < FPMIN:
            c = FPMIN
        d = 1.0 / d
        del_val = d * c
        h *= del_val
        if abs(del_val - 1.0) < EPS:
            break
    return h

def ibeta(a: float, b: float, x: float) -> float:
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    bt = math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log(1.0 - x))
    if x < (a + 1.0) / (a + b + 2.0):
        return bt * _betacf(a, b, x) / a
    else:
        return 1.0 - bt * _betacf(b, a, 1.0 - x) / b

def t_pvalue(t: float, df: float) -> float:
    if df <= 0:
        return 1.0
    x = df / (df + t * t)
    return max(0.0, min(1.0, float(ibeta(df / 2.0, 0.5, x))))

def gammq(a: float, x: float) -> float:
    if x <= 0.0:
        return 1.0
    if a <= 0.0:
        return 0.0
    if x < a + 1.0:
        # Series representation
        gln = math.lgamma(a)
        ap = a
        sum_val = 1.0 / a
        del_val = sum_val
        for _ in range(100):
            ap += 1.0
            del_val *= x / ap
            sum_val += del_val
            if abs(del_val) < abs(sum_val) * 3e-7:
                break
        gammp = sum_val * math.exp(-x + a * math.log(x) - gln)
        return max(0.0, min(1.0, 1.0 - gammp))
    # Continued fraction
    gln = math.lgamma(a)
    b = x + 1.0 - a
    c = 1.0 / 1e-30
    d = 1.0 / b
    h = d
    for i in range(1, 100):
        an = -i * (i - a)
        b += 2.0
        d = an * d + b
        if abs(d) < 1e-30:
            d = 1e-30
        c = b + an / c
        if abs(c) < 1e-30:
            c = 1e-30
        d = 1.0 / d
        del_val = d * c
        h *= del_val
        if abs(del_val - 1.0) < 3e-7:
            break
    return max(0.0, min(1.0, math.exp(-x + a * math.log(x) - gln) * h))

def chi2_pvalue(chi2: float, df: float) -> float:
    if df <= 0 or chi2 <= 0:
        return 1.0
    return gammq(df / 2.0, chi2 / 2.0)

def f_pvalue(f: float, df1: float, df2: float) -> float:
    if f <= 0 or df1 <= 0 or df2 <= 0:
        return 1.0
    x = df2 / (df2 + df1 * f)
    return max(0.0, min(1.0, float(ibeta(df2 / 2.0, df1 / 2.0, x))))

def run_correlation_analysis(df: pd.DataFrame, col_a: str, col_b: str) -> StatisticalTestResult:
    clean = df[[col_a, col_b]].dropna()
    s_a = pd.to_numeric(clean[col_a], errors='coerce').dropna()
    s_b = pd.to_numeric(clean[col_b], errors='coerce').dropna()
    common_idx = s_a.index.intersection(s_b.index)
    s_a, s_b = s_a.loc[common_idx], s_b.loc[common_idx]

    if len(s_a) < 3:
        raise ValueError("Insufficient paired numeric observations for correlation analysis.")

    corr = float(s_a.corr(s_b))
    n = len(s_a)
    denom = max(1e-12, 1.0 - corr ** 2)
    t_stat = corr * math.sqrt((n - 2) / denom)
    p_val = t_pvalue(abs(t_stat), n - 2)

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

    m1, m2 = float(g1.mean()), float(g2.mean())
    v1 = float(g1.var(ddof=1)) if len(g1) > 1 else 0.0
    v2 = float(g2.var(ddof=1)) if len(g2) > 1 else 0.0
    n1, n2 = len(g1), len(g2)
    
    se = math.sqrt(max(1e-12, (v1 / n1) + (v2 / n2)))
    t_stat = (m1 - m2) / se
    
    # Welch-Satterthwaite degrees of freedom
    term1 = v1 / n1
    term2 = v2 / n2
    num_df = (term1 + term2) ** 2
    den_df = ((term1 ** 2) / max(1, n1 - 1)) + ((term2 ** 2) / max(1, n2 - 1))
    df_welch = num_df / max(1e-12, den_df)
    
    p_val = t_pvalue(abs(t_stat), df_welch)
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
    observed = contingency_table.values.astype(float)
    row_sums = observed.sum(axis=1, keepdims=True)
    col_sums = observed.sum(axis=0, keepdims=True)
    total = observed.sum()
    
    expected = (row_sums @ col_sums) / max(1e-12, total)
    chi2 = float(np.sum((observed - expected) ** 2 / np.maximum(expected, 1e-12)))
    dof = (observed.shape[0] - 1) * (observed.shape[1] - 1)
    
    p_val = chi2_pvalue(chi2, float(dof))
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
    
    if len(samples) < 2:
        raise ValueError("ANOVA requires at least 2 groups with more than 1 sample each.")

    k = len(samples)
    N = sum(len(s) for s in samples)
    all_data = np.concatenate(samples)
    grand_mean = float(np.mean(all_data))
    
    ssb = sum(len(s) * (float(np.mean(s)) - grand_mean) ** 2 for s in samples)
    ssw = sum(float(np.sum((s - np.mean(s)) ** 2)) for s in samples)
    
    df1 = float(k - 1)
    df2 = float(max(1, N - k))
    msb = ssb / max(1e-12, df1)
    msw = ssw / max(1e-12, df2)
    
    f_stat = msb / max(1e-12, msw)
    p_val = f_pvalue(f_stat, df1, df2)
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
