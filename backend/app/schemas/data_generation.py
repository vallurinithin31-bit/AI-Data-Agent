from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class GenerateDataRequest(BaseModel):
    prompt: str
    record_count: Optional[int] = 25
    domain: Optional[str] = "auto"  # "auto", "education", "b2b_sales", "ecommerce", "saas", "custom"
    columns: Optional[List[str]] = None
    save_as_dataset: Optional[bool] = False
    dataset_name: Optional[str] = None
    reference_dataset_id: Optional[str] = None

class GenerateDataResponse(BaseModel):
    generation_id: str
    prompt: str
    domain: str
    record_count: int
    columns: List[str]
    rows: List[Dict[str, Any]]
    quality_summary: Dict[str, Any]
    dataset_id: Optional[str] = None
    dataset_name: Optional[str] = None
    download_excel_url: Optional[str] = None
    execution_time_ms: float

class SaveGeneratedDatasetRequest(BaseModel):
    generation_id: str
    dataset_name: str
