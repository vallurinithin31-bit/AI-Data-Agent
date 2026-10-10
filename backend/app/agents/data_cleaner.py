import uuid
from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np

from backend.app.schemas.dataset import CleaningAction, CleaningPlan, DatasetMetadata
from backend.app.tools.data_loader import register_dataset, get_dataset, get_metadata

def generate_cleaning_plan(df: pd.DataFrame, dataset_id: str, dataset_name: str) -> CleaningPlan:
    actions: List[CleaningAction] = []
    total_rows = len(df)
    
    # 1. Duplicate records
    dup_count = int(df.duplicated().sum())
    if dup_count > 0:
        actions.append(CleaningAction(
            id=f"act_{uuid.uuid4().hex[:8]}",
            action_type="drop_duplicates",
            column=None,
            reason=f"Found {dup_count:,} duplicate rows ({round(dup_count/total_rows*100, 1)}% of dataset).",
            details={"duplicates_count": dup_count},
            suggested_code="df = df.drop_duplicates(keep='first')",
            accepted=True
        ))
        
    # 2. Missing values per column
    for col in df.columns:
        m_count = int(df[col].isna().sum())
        if m_count > 0:
            m_pct = round(m_count / total_rows * 100, 1)
            
            if m_pct > 75:
                # Column is mostly empty: recommend dropping
                actions.append(CleaningAction(
                    id=f"act_{uuid.uuid4().hex[:8]}",
                    action_type="drop_column",
                    column=col,
                    reason=f"Column '{col}' is {m_pct}% missing ({m_count:,} empty rows).",
                    details={"missing_count": m_count, "missing_pct": m_pct},
                    suggested_code=f"df = df.drop(columns=['{col}'])",
                    accepted=True
                ))
            elif pd.api.types.is_numeric_dtype(df[col]):
                # Numeric: check skewness
                s_clean = df[col].dropna()
                skew = abs(s_clean.skew()) if len(s_clean) > 2 else 0
                if skew > 1.0:
                    med_val = round(float(s_clean.median()), 2)
                    actions.append(CleaningAction(
                        id=f"act_{uuid.uuid4().hex[:8]}",
                        action_type="fill_missing",
                        column=col,
                        reason=f"'{col}' has {m_count:,} missing values ({m_pct}%). Due to high distribution skew ({round(skew, 2)}), median imputation is recommended to avoid bias.",
                        details={"impute_strategy": "median", "value": med_val},
                        suggested_code=f"df['{col}'] = df['{col}'].fillna({med_val})",
                        accepted=True
                    ))
                else:
                    mean_val = round(float(s_clean.mean()), 2)
                    actions.append(CleaningAction(
                        id=f"act_{uuid.uuid4().hex[:8]}",
                        action_type="fill_missing",
                        column=col,
                        reason=f"'{col}' has {m_count:,} missing values ({m_pct}%). Imputing with mean ({mean_val}) preserves distribution center.",
                        details={"impute_strategy": "mean", "value": mean_val},
                        suggested_code=f"df['{col}'] = df['{col}'].fillna({mean_val})",
                        accepted=True
                    ))
            else:
                # Categorical / string: fill with mode or 'Unknown'
                modes = df[col].dropna().mode()
                mode_val = modes.iloc[0] if not modes.empty else "Unknown"
                actions.append(CleaningAction(
                    id=f"act_{uuid.uuid4().hex[:8]}",
                    action_type="fill_missing",
                    column=col,
                    reason=f"Categorical column '{col}' has {m_count:,} missing values. Impute with most frequent class '{mode_val}'.",
                    details={"impute_strategy": "mode", "value": str(mode_val)},
                    suggested_code=f"df['{col}'] = df['{col}'].fillna('{mode_val}')",
                    accepted=True
                ))

    # 3. Clean string column whitespace and casing
    for col in df.select_dtypes(include=['object']).columns:
        sample = df[col].dropna().head(30).astype(str)
        has_spaces = sample.apply(lambda x: len(x) != len(x.strip())).any()
        if has_spaces:
            actions.append(CleaningAction(
                id=f"act_{uuid.uuid4().hex[:8]}",
                action_type="normalize_categories",
                column=col,
                reason=f"Column '{col}' has inconsistent leading/trailing whitespace affecting grouping accuracy.",
                details={"strategy": "strip_whitespace"},
                suggested_code=f"df['{col}'] = df['{col}'].astype(str).str.strip()",
                accepted=True
            ))

    # 4. Outlier capping on extreme numerical columns
    for col in df.select_dtypes(include=[np.number]).columns:
        s = df[col].dropna()
        if len(s) > 20:
            q25 = float(s.quantile(0.25))
            q75 = float(s.quantile(0.75))
            iqr = q75 - q25
            if iqr > 0:
                lower = round(q25 - 3.0 * iqr, 2)
                upper = round(q75 + 3.0 * iqr, 2)
                outlier_mask = (s < lower) | (s > upper)
                o_count = int(outlier_mask.sum())
                if 0 < o_count < 0.05 * len(s):  # severe outliers, under 5% of data
                    actions.append(CleaningAction(
                        id=f"act_{uuid.uuid4().hex[:8]}",
                        action_type="clip_outliers",
                        column=col,
                        reason=f"Found {o_count:,} extreme outliers beyond 3.0x IQR in '{col}'. Winsorize/clip values to [{lower}, {upper}].",
                        details={"lower_bound": lower, "upper_bound": upper, "outlier_count": o_count},
                        suggested_code=f"df['{col}'] = df['{col}'].clip(lower={lower}, upper={upper})",
                        accepted=False  # User must opt-in to clip outliers
                    ))

    summary = (
        f"Data Cleaning Agent generated {len(actions)} recommended actions for '{dataset_name}'. "
        f"Review each suggestion and approve/reject before generating the new cleaned dataset version."
    )

    return CleaningPlan(
        dataset_id=dataset_id,
        dataset_name=dataset_name,
        total_actions=len(actions),
        actions=actions,
        summary=summary
    )

def apply_cleaning_actions(dataset_id: str, approved_action_ids: List[str]) -> Tuple[DatasetMetadata, str]:
    """
    Applies only the approved cleaning actions to a copy of the dataset.
    Never alters original dataset. Creates a new cleaned dataset.
    """
    orig_df = get_dataset(dataset_id)
    orig_meta = get_metadata(dataset_id)
    
    clean_df = orig_df.copy()
    plan = generate_cleaning_plan(orig_df, dataset_id, orig_meta.name)
    
    applied_logs = []
    
    for action in plan.actions:
        if action.id in approved_action_ids:
            if action.action_type == "drop_duplicates":
                before_len = len(clean_df)
                clean_df = clean_df.drop_duplicates(keep='first')
                applied_logs.append(f"Removed {before_len - len(clean_df):,} duplicate rows.")
                
            elif action.action_type == "drop_column" and action.column in clean_df.columns:
                clean_df = clean_df.drop(columns=[action.column])
                applied_logs.append(f"Dropped column '{action.column}'.")
                
            elif action.action_type == "fill_missing" and action.column in clean_df.columns:
                val = action.details.get("value")
                clean_df[action.column] = clean_df[action.column].fillna(val)
                applied_logs.append(f"Filled missing values in '{action.column}' with {val}.")
                
            elif action.action_type == "normalize_categories" and action.column in clean_df.columns:
                clean_df[action.column] = clean_df[action.column].astype(str).str.strip()
                applied_logs.append(f"Trimmed whitespace on '{action.column}'.")
                
            elif action.action_type == "clip_outliers" and action.column in clean_df.columns:
                lower = action.details.get("lower_bound")
                upper = action.details.get("upper_bound")
                clean_df[action.column] = clean_df[action.column].clip(lower=lower, upper=upper)
                applied_logs.append(f"Clipped outliers in '{action.column}' to [{lower}, {upper}].")

    clean_name = f"Cleaned_{orig_meta.name}"
    new_metadata = register_dataset(
        name=clean_name,
        df=clean_df,
        file_type="csv",
        is_cleaned=True,
        parent_dataset_id=dataset_id
    )
    
    log_summary = "Applied " + "; ".join(applied_logs) if applied_logs else "No actions were applied."
    return new_metadata, log_summary
