import os
import json
import uuid
import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import numpy as np

from backend.app.core.config import settings
from backend.app.schemas.dataset import DatasetMetadata, ColumnInfo

# In-memory registry for fast access & caching
DATASET_STORE: Dict[str, pd.DataFrame] = {}
METADATA_STORE: Dict[str, DatasetMetadata] = {}

def infer_semantic_type(series: pd.Series, col_name: str) -> Tuple[str, bool, bool, bool]:
    """
    Returns (semantic_type, is_numeric, is_datetime, is_categorical)
    semantic_types: 'numeric', 'categorical', 'datetime', 'id', 'text', 'boolean'
    """
    clean_series = series.dropna()
    col_lower = col_name.lower()
    
    # Check ID patterns
    if ('id' in col_lower or 'uuid' in col_lower or 'code' in col_lower) and clean_series.nunique() > 0.8 * len(clean_series):
        return 'id', False, False, False
        
    # Check Boolean
    if pd.api.types.is_bool_dtype(series) or set(clean_series.astype(str).str.lower().unique()).issubset({'true', 'false', '0', '1', 'yes', 'no'}):
        return 'boolean', False, False, True

    # Check Datetime
    if pd.api.types.is_datetime64_any_dtype(series):
        return 'datetime', False, True, False
        
    if 'date' in col_lower or 'time' in col_lower or 'created' in col_lower or 'updated' in col_lower:
        try:
            sample = clean_series.head(20).astype(str)
            pd.to_datetime(sample, errors='raise')
            return 'datetime', False, True, False
        except Exception:
            pass

    # Check Numeric
    if pd.api.types.is_numeric_dtype(series):
        # If integer with very few distinct values (< 5) and not an amount
        if clean_series.nunique() <= 5 and not any(k in col_lower for k in ['revenue', 'price', 'cost', 'sales', 'profit', 'amount']):
            return 'categorical', True, False, True
        return 'numeric', True, False, False
        
    # Attempt numeric parsing if it's string with currency or percentage
    if pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
        sample_str = clean_series.head(20).astype(str).str.replace('$', '', regex=False).str.replace(',', '', regex=False).str.replace('%', '', regex=False).str.strip()
        try:
            pd.to_numeric(sample_str, errors='raise')
            return 'numeric', True, False, False
        except Exception:
            pass

    # Categorical if cardinality is reasonable
    if clean_series.nunique() < 500 or (len(clean_series) > 0 and clean_series.nunique() / len(clean_series) < 0.2):
        return 'categorical', False, False, True

    return 'text', False, False, False

def build_column_info(df: pd.DataFrame) -> List[ColumnInfo]:
    columns_info: List[ColumnInfo] = []
    total_rows = len(df)
    
    for col in df.columns:
        series = df[col]
        semantic_type, is_num, is_dt, is_cat = infer_semantic_type(series, str(col))
        
        missing_count = int(series.isna().sum())
        missing_pct = round((missing_count / total_rows * 100), 2) if total_rows > 0 else 0.0
        unique_count = int(series.nunique(dropna=True))
        
        # Grab representative samples (convert to native json types)
        clean_sample = series.dropna().head(5).tolist()
        sample_values = []
        for val in clean_sample:
            if isinstance(val, (np.integer, int)):
                sample_values.append(int(val))
            elif isinstance(val, (np.floating, float)):
                sample_values.append(round(float(val), 4) if not np.isnan(val) else None)
            elif isinstance(val, (pd.Timestamp, datetime.date, datetime.datetime)):
                sample_values.append(str(val))
            else:
                sample_values.append(str(val))

        columns_info.append(ColumnInfo(
            name=str(col),
            data_type=str(series.dtype),
            semantic_type=semantic_type,
            is_numeric=is_num,
            is_datetime=is_dt,
            is_categorical=is_cat,
            unique_count=unique_count,
            missing_count=missing_count,
            missing_pct=missing_pct,
            sample_values=sample_values
        ))
        
    return columns_info

def load_file_to_dataframe(file_path: Path, file_type: str) -> pd.DataFrame:
    file_type = file_type.lower().replace('.', '')
    
    if file_type == 'csv':
        try:
            return pd.read_csv(file_path, encoding='utf-8')
        except UnicodeDecodeError:
            return pd.read_csv(file_path, encoding='latin1')
    elif file_type == 'tsv':
        try:
            return pd.read_csv(file_path, sep='\t', encoding='utf-8')
        except UnicodeDecodeError:
            return pd.read_csv(file_path, sep='\t', encoding='latin1')
    elif file_type in ['xlsx', 'xls']:
        return pd.read_excel(file_path)
    elif file_type == 'json':
        try:
            return pd.read_json(file_path)
        except ValueError:
            # Maybe json lines or array format
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if isinstance(data, list):
                return pd.DataFrame(data)
            elif isinstance(data, dict):
                # Try items or records
                for key in ['data', 'records', 'items', 'rows']:
                    if key in data and isinstance(data[key], list):
                        return pd.DataFrame(data[key])
                return pd.DataFrame([data])
            raise ValueError("Unsupported JSON structure")
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

def register_dataset(name: str, df: pd.DataFrame, file_type: str = "csv", is_cleaned: bool = False, parent_dataset_id: Optional[str] = None, persist_to_disk: bool = True) -> DatasetMetadata:
    dataset_id = str(uuid.uuid4())
    
    # Auto-convert column names to clean strings
    df.columns = [str(c).strip() for c in df.columns]
    
    # Try converting date columns to pandas datetime objects
    for col in df.columns:
        if ('date' in col.lower() or 'time' in col.lower()) and not pd.api.types.is_datetime64_any_dtype(df[col]):
            try:
                df[col] = pd.to_datetime(df[col])
            except Exception:
                pass

    columns_info = build_column_info(df)
    num_cols = [c.name for c in columns_info if c.is_numeric]
    cat_cols = [c.name for c in columns_info if c.is_categorical]
    dt_cols = [c.name for c in columns_info if c.is_datetime]
    
    file_size_bytes = 0
    if persist_to_disk:
        # Save csv and meta cache to disk
        cache_path = settings.UPLOAD_DIR / f"{dataset_id}.csv"
        df.to_csv(cache_path, index=False)
        if cache_path.exists():
            file_size_bytes = os.path.getsize(cache_path)
    else:
        file_size_bytes = int(df.memory_usage(deep=True).sum())
    
    metadata = DatasetMetadata(
        id=dataset_id,
        name=name,
        file_type=file_type,
        file_size_bytes=file_size_bytes,
        row_count=len(df),
        column_count=len(df.columns),
        columns=columns_info,
        numerical_columns=num_cols,
        categorical_columns=cat_cols,
        date_columns=dt_cols,
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        is_cleaned=is_cleaned,
        parent_dataset_id=parent_dataset_id
    )
    
    if persist_to_disk:
        meta_path = settings.UPLOAD_DIR / f"{dataset_id}.meta.json"
        try:
            meta_path.write_text(metadata.model_dump_json(), encoding='utf-8')
        except Exception:
            pass
    
    # Cache in memory
    DATASET_STORE[dataset_id] = df
    METADATA_STORE[dataset_id] = metadata
    
    return metadata

def get_dataset(dataset_id: str) -> pd.DataFrame:
    if dataset_id in DATASET_STORE:
        return DATASET_STORE[dataset_id]
        
    csv_path = settings.UPLOAD_DIR / f"{dataset_id}.csv"
    if csv_path.exists():
        df = pd.read_csv(csv_path)
        DATASET_STORE[dataset_id] = df
        return df
        
    raise KeyError(f"Dataset {dataset_id} not found")

def get_metadata(dataset_id: str) -> DatasetMetadata:
    if dataset_id in METADATA_STORE:
        return METADATA_STORE[dataset_id]
    raise KeyError(f"Metadata for dataset {dataset_id} not found")

# Track whether initial disk restoration has been performed
_HAS_RESTORED_ONCE = False

def restore_persisted_datasets() -> None:
    """Restores only user-uploaded datasets from disk. Never auto-generates sample or demo data."""
    global _HAS_RESTORED_ONCE
    _HAS_RESTORED_ONCE = True
    try:
        if not settings.UPLOAD_DIR.exists():
            return
            
        for meta_file in settings.UPLOAD_DIR.glob("*.meta.json"):
            try:
                m_data = json.loads(meta_file.read_text(encoding='utf-8'))
                meta_obj = DatasetMetadata(**m_data)
                csv_file = settings.UPLOAD_DIR / f"{meta_obj.id}.csv"
                if csv_file.exists() and meta_obj.id not in METADATA_STORE:
                    df_up = pd.read_csv(csv_file)
                    DATASET_STORE[meta_obj.id] = df_up
                    METADATA_STORE[meta_obj.id] = meta_obj
            except Exception:
                pass
                
        # If Oct,5th.xlsx exists as 848044c2-3ce0-4391-ac69-b63dd126b82d.csv, restore it if not present
        oct_csv = settings.UPLOAD_DIR / "848044c2-3ce0-4391-ac69-b63dd126b82d.csv"
        has_oct = any("oct" in m.name.lower() for m in METADATA_STORE.values())
        if oct_csv.exists() and not has_oct:
            try:
                df_oct = pd.read_csv(oct_csv)
                register_dataset("Oct,5th.xlsx", df_oct, "xlsx")
            except Exception:
                pass
    except Exception:
        pass

def init_sample_datasets():
    """No-op demo dataset initializer to prevent adding files automatically unless user adds them."""
    restore_persisted_datasets()

def list_all_datasets() -> List[DatasetMetadata]:
    """Return all datasets explicitly added by user."""
    global _HAS_RESTORED_ONCE
    if not _HAS_RESTORED_ONCE:
        restore_persisted_datasets()
    return list(METADATA_STORE.values())

def delete_dataset(dataset_id: str) -> bool:
    found = False
    if dataset_id in DATASET_STORE:
        del DATASET_STORE[dataset_id]
        found = True
    if dataset_id in METADATA_STORE:
        del METADATA_STORE[dataset_id]
        found = True
        
    csv_path = settings.UPLOAD_DIR / f"{dataset_id}.csv"
    if csv_path.exists():
        try:
            os.remove(csv_path)
            found = True
        except Exception:
            pass
            
    meta_path = settings.UPLOAD_DIR / f"{dataset_id}.meta.json"
    if meta_path.exists():
        try:
            os.remove(meta_path)
            found = True
        except Exception:
            pass
            
    return found

