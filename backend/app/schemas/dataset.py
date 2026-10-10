from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class ColumnInfo(BaseModel):
    name: str
    data_type: str
    semantic_type: str  # numeric, categorical, datetime, id, text, boolean
    is_numeric: bool
    is_datetime: bool
    is_categorical: bool
    unique_count: int
    missing_count: int
    missing_pct: float
    sample_values: List[Any] = Field(default_factory=list)

class NumericalStats(BaseModel):
    column: str
    mean: Optional[float] = None
    median: Optional[float] = None
    mode: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    std: Optional[float] = None
    variance: Optional[float] = None
    q25: Optional[float] = None
    q50: Optional[float] = None
    q75: Optional[float] = None
    iqr: Optional[float] = None
    skewness: Optional[float] = None

class CategoryFrequency(BaseModel):
    category: str
    count: int
    percentage: float

class CategoricalStats(BaseModel):
    column: str
    cardinality: int
    top_categories: List[CategoryFrequency] = Field(default_factory=list)

class DateStats(BaseModel):
    column: str
    min_date: Optional[str] = None
    max_date: Optional[str] = None
    range_days: Optional[int] = None
    granularity: Optional[str] = None

class DataQualityIssue(BaseModel):
    type: str  # missing_values, duplicates, outliers, type_mismatch, constant_column, high_cardinality
    severity: str  # info, warning, critical
    column: Optional[str] = None
    description: str
    affected_count: int
    affected_pct: float
    suggested_action: str

class DataQualityReport(BaseModel):
    overall_score: int  # 0 to 100
    grade: str  # A, B, C, D, F
    total_rows: int
    total_columns: int
    memory_usage_mb: float
    missing_cells: int
    missing_pct: float
    duplicate_rows: int
    duplicate_pct: float
    constant_columns: List[str] = Field(default_factory=list)
    outlier_count: int = 0
    issues: List[DataQualityIssue] = Field(default_factory=list)
    summary_text: str

class DatasetMetadata(BaseModel):
    id: str
    name: str
    file_type: str
    file_size_bytes: int
    row_count: int
    column_count: int
    columns: List[ColumnInfo] = Field(default_factory=list)
    numerical_columns: List[str] = Field(default_factory=list)
    categorical_columns: List[str] = Field(default_factory=list)
    date_columns: List[str] = Field(default_factory=list)
    created_at: str
    is_cleaned: bool = False
    parent_dataset_id: Optional[str] = None

class CleaningAction(BaseModel):
    id: str
    action_type: str  # fill_missing, drop_duplicates, cast_type, parse_date, clip_outliers, normalize_categories, drop_column
    column: Optional[str] = None
    reason: str
    details: Dict[str, Any] = Field(default_factory=dict)
    suggested_code: str
    accepted: bool = True

class CleaningPlan(BaseModel):
    dataset_id: str
    dataset_name: str
    total_actions: int
    actions: List[CleaningAction] = Field(default_factory=list)
    summary: str

class ApplyCleaningRequest(BaseModel):
    dataset_id: str
    approved_action_ids: List[str]
