from fastapi import APIRouter, HTTPException
from backend.app.schemas.data_generation import (
    GenerateDataRequest, GenerateDataResponse, SaveGeneratedDatasetRequest
)
from backend.app.agents.data_generation_agent import (
    generate_new_data_agent, save_generated_as_active_dataset
)

router = APIRouter(prefix="/data-generation", tags=["data-generation"])

@router.post("/generate", response_model=GenerateDataResponse)
def generate_new_data_endpoint(req: GenerateDataRequest):
    try:
        return generate_new_data_agent(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data generation agent failed: {str(e)}")

@router.post("/save-dataset")
def save_generated_dataset_endpoint(req: SaveGeneratedDatasetRequest):
    try:
        return save_generated_as_active_dataset(req.generation_id, req.dataset_name)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register dataset: {str(e)}")
