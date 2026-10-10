from fastapi import APIRouter, HTTPException, Response
from backend.app.schemas.custom_export import (
    CustomExportRequest, CustomExportPreview, ParsePromptRequest, ParsedPromptResult
)
from backend.app.agents.custom_export_agent import (
    execute_custom_export, get_exported_workbook, parse_natural_language_prompt
)
from backend.app.tools.data_loader import get_dataset

router = APIRouter(prefix="/custom-export", tags=["custom-export"])

@router.post("/generate", response_model=CustomExportPreview)
def generate_custom_export_endpoint(req: CustomExportRequest):
    try:
        return execute_custom_export(req)
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Custom export failed: {str(e)}")

@router.get("/download/{export_id}")
def download_excel_endpoint(export_id: str):
    result = get_exported_workbook(export_id)
    if not result:
        raise HTTPException(status_code=404, detail="Export workbook expired or not found")
    
    buffer_bytes, filename = result
    return Response(
        content=buffer_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.post("/parse-prompt", response_model=ParsedPromptResult)
def parse_prompt_endpoint(req: ParsePromptRequest):
    try:
        df = get_dataset(req.dataset_id)
        return parse_natural_language_prompt(req.prompt, list(df.columns))
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse prompt: {str(e)}")
