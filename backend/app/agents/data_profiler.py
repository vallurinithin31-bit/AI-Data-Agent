import numpy as np
import pandas as pd
from typing import Dict, Any, List
from backend.app.schemas.dataset import (
    DataQualityReport, DataQualityIssue, NumericalStats, CategoricalStats,
    CategoryFrequency, DateStats
)

def profile_dataset(df: pd.DataFrame) -> DataQualityReport:
    total_rows = len(df)
    total_columns = len(df.columns)
    memory_usage_mb = round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2)
    
    total_cells = total_rows * total_columns if total_rows > 0 else 1
    missing_cells = int(df.isna().sum().sum())
    missing_pct = round((missing_cells / total_cells) * 100, 2)
    
    duplicate_rows = int(df.duplicated().sum())
    duplicate_pct = round((duplicate_rows / total_rows * 100), 2) if total_rows > 0 else 0.0
    
    constant_columns = [col for col in df.columns if df[col].nunique(dropna=False) <= 1]
    
    issues: List[DataQualityIssue] = []
    
    # 1. Missing values check
    for col in df.columns:
        m_count = int(df[col].isna().sum())
        if m_count > 0:
            m_pct = round((m_count / total_rows) * 100, 2)
            severity = "critical" if m_pct > 30 else ("warning" if m_pct > 5 else "info")
            issues.append(DataQualityIssue(
                type="missing_values",
                severity=severity,
                column=col,
                description=f"Column '{col}' has {m_count:,} missing values ({m_pct}%).",
                affected_count=m_count,
                affected_pct=m_pct,
                suggested_action=f"Impute missing values using median/mode or drop rows if low sample loss."
            ))
            
    # 2. Duplicate rows check
    if duplicate_rows > 0:
        issues.append(DataQualityIssue(
            type="duplicates",
            severity="warning" if duplicate_pct < 10 else "critical",
            column=None,
            description=f"Dataset contains {duplicate_rows:,} duplicate records ({duplicate_pct}% of total).",
            affected_count=duplicate_rows,
            affected_pct=duplicate_pct,
            suggested_action="Deduplicate records keeping first occurrence."
        ))

    # 3. Constant columns check
    for c_col in constant_columns:
        issues.append(DataQualityIssue(
            type="constant_column",
            severity="warning",
            column=c_col,
            description=f"Column '{c_col}' contains only a single unique value across all rows.",
            affected_count=total_rows,
            affected_pct=100.0,
            suggested_action="Drop this zero-variance column to reduce dimensionality."
        ))
        
    # 4. Outlier detection using IQR on numerical columns
    total_outliers = 0
    num_cols = df.select_dtypes(include=[np.number]).columns
    for n_col in num_cols:
        series = df[n_col].dropna()
        if len(series) > 10:
            q25 = series.quantile(0.25)
            q75 = series.quantile(0.75)
            iqr = q75 - q25
            if iqr > 0:
                lower = q25 - 1.5 * iqr
                upper = q75 + 1.5 * iqr
                outliers = series[(series < lower) | (series > upper)]
                o_count = len(outliers)
                if o_count > 0:
                    total_outliers += o_count
                    o_pct = round((o_count / len(series)) * 100, 2)
                    if o_pct > 3.0:
                        issues.append(DataQualityIssue(
                            type="outliers",
                            severity="warning" if o_pct < 10 else "critical",
                            column=n_col,
                            description=f"Column '{n_col}' has {o_count:,} statistical outliers ({o_pct}% outside 1.5x IQR).",
                            affected_count=o_count,
                            affected_pct=o_pct,
                            suggested_action="Apply IQR capping/winsorization or inspect anomalies."
                        ))

    # Calculate overall health score (starts at 100, deduct penalties)
    penalty = 0
    penalty += min(40, missing_pct * 1.5)
    penalty += min(25, duplicate_pct * 2.0)
    penalty += len(constant_columns) * 5
    if total_rows > 0:
        penalty += min(20, (total_outliers / total_rows) * 10)
        
    overall_score = max(10, min(100, int(100 - penalty)))
    
    if overall_score >= 90:
        grade = "A"
    elif overall_score >= 80:
        grade = "B"
    elif overall_score >= 65:
        grade = "C"
    elif overall_score >= 50:
        grade = "D"
    else:
        grade = "F"
        
    summary_text = (
        f"Data Quality Score: {overall_score}/100 (Grade {grade}). "
        f"Found {len(issues)} potential quality observations across {total_rows:,} rows and {total_columns} columns. "
        f"Missing values represent {missing_pct}% of cells, with {duplicate_rows:,} duplicate records ({duplicate_pct}%)."
    )

    return DataQualityReport(
        overall_score=overall_score,
        grade=grade,
        total_rows=total_rows,
        total_columns=total_columns,
        memory_usage_mb=memory_usage_mb,
        missing_cells=missing_cells,
        missing_pct=missing_pct,
        duplicate_rows=duplicate_rows,
        duplicate_pct=duplicate_pct,
        constant_columns=constant_columns,
        outlier_count=total_outliers,
        issues=issues,
        summary_text=summary_text
    )

def calculate_numerical_statistics(df: pd.DataFrame) -> List[NumericalStats]:
    stats_list = []
    num_cols = df.select_dtypes(include=[np.number]).columns
    for col in num_cols:
        s = df[col].dropna()
        if len(s) == 0:
            continue
        q25 = float(s.quantile(0.25))
        q50 = float(s.quantile(0.50))
        q75 = float(s.quantile(0.75))
        iqr = float(q75 - q25)
        
        mode_val = None
        try:
            modes = s.mode()
            if not modes.empty:
                mode_val = float(modes.iloc[0])
        except Exception:
            pass
            
        skewness_val = float(s.skew()) if len(s) > 2 else 0.0
        
        stats_list.append(NumericalStats(
            column=str(col),
            mean=round(float(s.mean()), 3),
            median=round(float(s.median()), 3),
            mode=round(mode_val, 3) if mode_val is not None else None,
            min=round(float(s.min()), 3),
            max=round(float(s.max()), 3),
            std=round(float(s.std()), 3) if len(s) > 1 else 0.0,
            variance=round(float(s.var()), 3) if len(s) > 1 else 0.0,
            q25=round(q25, 3),
            q50=round(q50, 3),
            q75=round(q75, 3),
            iqr=round(iqr, 3),
            skewness=round(skewness_val, 3)
        ))
    return stats_list

def calculate_categorical_statistics(df: pd.DataFrame) -> List[CategoricalStats]:
    stats_list = []
    cat_cols = df.select_dtypes(exclude=[np.number, 'datetime64']).columns
    total_len = len(df)
    
    for col in cat_cols:
        s = df[col].dropna()
        cardinality = int(s.nunique())
        top_counts = s.value_counts().head(5)
        
        top_cats = []
        for cat_name, count in top_counts.items():
            top_cats.append(CategoryFrequency(
                category=str(cat_name),
                count=int(count),
                percentage=round((count / total_len * 100), 2) if total_len > 0 else 0.0
            ))
            
        stats_list.append(CategoricalStats(
            column=str(col),
            cardinality=cardinality,
            top_categories=top_cats
        ))
    return stats_list

def calculate_date_statistics(df: pd.DataFrame) -> List[DateStats]:
    stats_list = []
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            s = df[col].dropna()
            if not s.empty:
                min_d = s.min()
                max_d = s.max()
                diff_days = (max_d - min_d).days if hasattr((max_d - min_d), 'days') else None
                stats_list.append(DateStats(
                    column=str(col),
                    min_date=str(min_d),
                    max_date=str(max_d),
                    range_days=diff_days,
                    granularity="daily" if diff_days and diff_days < 90 else "monthly"
                ))
    return stats_list
