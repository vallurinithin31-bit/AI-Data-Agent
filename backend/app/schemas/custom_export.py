from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class CustomExportRequest(BaseModel):
    dataset_id: str
    natural_language_prompt: Optional[str] = None
    requested_columns: Optional[List[str]] = None
    column_sequence: Optional[List[str]] = None
    sort_column: Optional[str] = None
    sort_direction: Optional[str] = "asc"  # "asc" | "desc"
    filter_query: Optional[str] = None
    filter_column: Optional[str] = None
    filter_value: Optional[str] = None
    deduplicate: Optional[bool] = False
    deduplicate_columns: Optional[List[str]] = None
    row_limit: Optional[int] = None
    validation_rules: Optional[Dict[str, str]] = None
    color_preferences: Optional[Dict[str, str]] = None
    separate_unverified_sheet: Optional[bool] = False

class CellValidationInfo(BaseModel):
    status: str  # "valid" | "warning" | "error" | "normal"
    reason: Optional[str] = None
    color: Optional[str] = None

class CustomExportPreview(BaseModel):
    export_id: str
    dataset_id: str
    dataset_name: str
    prompt: Optional[str] = None
    column_sequence: List[str]
    total_rows: int
    preview_rows: List[Dict[str, Any]]
    cell_validation_matrix: List[Dict[str, Dict[str, Any]]]
    quality_summary: Dict[str, Any]
    sources_info: Dict[str, Any]
    applied_instructions: Dict[str, Any]
    download_url: str

class ParsePromptRequest(BaseModel):
    dataset_id: str
    prompt: str

class ParsedPromptResult(BaseModel):
    requested_columns: List[str]
    column_sequence: List[str]
    sort_column: Optional[str] = None
    sort_direction: str = "asc"
    filter_description: Optional[str] = None
    filter_column: Optional[str] = None
    filter_value: Optional[str] = None
    deduplicate: bool = False
    deduplicate_columns: List[str] = Field(default_factory=list)
    row_limit: Optional[int] = None
    validation_focus: List[str] = Field(default_factory=list)
    detected_color_rules: Dict[str, str] = Field(default_factory=dict)
    summary_explanation: str
