import os
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
import pandas as pd

from backend.app.core.config import settings
from backend.app.schemas.dataset import (
    DatasetMetadata, DataQualityReport, CleaningPlan, ApplyCleaningRequest
)
from backend.app.tools.data_loader import (
    load_file_to_dataframe, register_dataset, get_dataset, get_metadata,
    list_all_datasets, delete_dataset
)
from backend.app.agents.data_profiler import profile_dataset, calculate_numerical_statistics, calculate_categorical_statistics, calculate_date_statistics
from backend.app.agents.data_cleaner import generate_cleaning_plan, apply_cleaning_actions
from backend.app.agents.report_agent import export_report_excel

router = APIRouter(prefix="/datasets", tags=["datasets"])

ALLOWED_EXTENSIONS = {'.csv', '.tsv', '.xlsx', '.xls', '.json'}

@router.post("/upload", response_model=DatasetMetadata)
async def upload_dataset_file(file: UploadFile = File(...)):
    filename = file.filename or "dataset.csv"
    ext = Path(filename).suffix.lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    temp_path = settings.UPLOAD_DIR / f"temp_{filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_size_mb = os.path.getsize(temp_path) / (1024 * 1024)
        if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        df = load_file_to_dataframe(temp_path, ext)
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file contains 0 rows.")

        metadata = register_dataset(name=filename, df=df, file_type=ext.replace('.', ''))
        return metadata
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
    finally:
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except Exception:
                pass

@router.get("", response_model=List[DatasetMetadata])
def list_datasets():
    return list_all_datasets()

@router.get("/{dataset_id}", response_model=DatasetMetadata)
def get_dataset_details(dataset_id: str):
    try:
        return get_metadata(dataset_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")

@router.delete("/{dataset_id}")
def delete_dataset_endpoint(dataset_id: str):
    success = delete_dataset(dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"success": True, "message": f"Dataset {dataset_id} deleted successfully"}

@router.get("/{dataset_id}/preview")
def preview_dataset_data(dataset_id: str, limit: int = 50):
    try:
        df = get_dataset(dataset_id)
        preview_rows = df.head(limit).to_dict(orient='records')
        # Clean numpy types for JSON serialization
        for row in preview_rows:
            for k, v in row.items():
                if pd.isna(v):
                    row[k] = None
                elif hasattr(v, 'item'):
                    row[k] = v.item()
                elif isinstance(v, (pd.Timestamp, pd.Timedelta)):
                    row[k] = str(v)

        return {
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "preview_limit": limit,
            "columns": [str(c) for c in df.columns],
            "rows": preview_rows
        }
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")

@router.get("/{dataset_id}/profile", response_model=DataQualityReport)
def profile_dataset_endpoint(dataset_id: str):
    try:
        df = get_dataset(dataset_id)
        return profile_dataset(df)
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")

@router.get("/{dataset_id}/statistics")
def get_dataset_statistics(dataset_id: str):
    try:
        df = get_dataset(dataset_id)
        return {
            "numerical": [s.model_dump() for s in calculate_numerical_statistics(df)],
            "categorical": [s.model_dump() for s in calculate_categorical_statistics(df)],
            "datetime": [s.model_dump() for s in calculate_date_statistics(df)]
        }
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")

@router.get("/{dataset_id}/cleaning-plan", response_model=CleaningPlan)
def get_cleaning_plan_endpoint(dataset_id: str):
    try:
        df = get_dataset(dataset_id)
        meta = get_metadata(dataset_id)
        return generate_cleaning_plan(df, dataset_id, meta.name)
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")

@router.post("/{dataset_id}/apply-cleaning", response_model=DatasetMetadata)
def apply_cleaning_plan_endpoint(dataset_id: str, req: ApplyCleaningRequest):
    try:
        new_meta, summary = apply_cleaning_actions(dataset_id, req.approved_action_ids)
        return new_meta
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply cleaning: {str(e)}")

@router.get("/{dataset_id}/export/csv")
def export_dataset_csv(dataset_id: str):
    try:
        df = get_dataset(dataset_id)
        meta = get_metadata(dataset_id)
        csv_data = df.to_csv(index=False)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=export_{meta.name.replace('.csv', '')}.csv"}
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")

@router.get("/{dataset_id}/export/excel")
def export_dataset_excel(dataset_id: str):
    try:
        meta = get_metadata(dataset_id)
        excel_stream = export_report_excel(dataset_id)
        return StreamingResponse(
            excel_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=report_{meta.name.replace('.csv', '')}.xlsx"}
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
