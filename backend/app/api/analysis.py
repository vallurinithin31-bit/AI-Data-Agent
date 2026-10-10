from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
import pandas as pd

from backend.app.core.config import settings
from backend.app.tools.data_loader import get_dataset, get_metadata
from backend.app.tools.sql_engine import execute_sql_query
from backend.app.agents.orchestrator import run_agentic_analysis
from backend.app.agents.funnel_agent import analyze_funnel
from backend.app.agents.cohort_agent import analyze_cohorts
from backend.app.agents.segmentation_agent import perform_rfm_segmentation, perform_kmeans_clustering
from backend.app.agents.forecasting_agent import forecast_time_series
from backend.app.agents.anomaly_agent import detect_anomalies
from backend.app.agents.report_agent import generate_comprehensive_report
from backend.app.schemas.analysis import (
    AnalysisResponse, FunnelAnalysisResult, CohortAnalysisResult,
    SegmentationResult, ForecastResult, AnomalyResult
)

router = APIRouter(prefix="/analysis", tags=["analysis"])

class QueryRequest(BaseModel):
    dataset_id: str
    query: str
    conversation_history: Optional[List[Dict[str, str]]] = None

class SQLRequest(BaseModel):
    dataset_id: str
    sql: str
    max_rows: Optional[int] = 200

class FunnelRequest(BaseModel):
    dataset_id: str
    stage_column: Optional[str] = None
    user_column: Optional[str] = None
    custom_order: Optional[List[str]] = None
    funnel_mode: Optional[str] = "auto"  # auto, pipeline, categories

class CohortRequest(BaseModel):
    dataset_id: str
    user_column: Optional[str] = None
    date_column: Optional[str] = None
    time_window: Optional[str] = "month"

class SegmentationRequest(BaseModel):
    dataset_id: str
    customer_column: Optional[str] = None
    date_column: Optional[str] = None
    amount_column: Optional[str] = None
    method: Optional[str] = "RFM"  # RFM or KMeans
    feature_columns: Optional[List[str]] = None
    n_clusters: Optional[int] = 4

class ForecastRequest(BaseModel):
    dataset_id: str
    date_column: Optional[str] = None
    target_column: Optional[str] = None
    horizon: Optional[int] = 6

class AnomalyRequest(BaseModel):
    dataset_id: str
    metric_column: Optional[str] = None
    id_column: Optional[str] = None

class ApiKeyRequest(BaseModel):
    gemini_api_key: str

@router.post("/query", response_model=AnalysisResponse)
def run_query_analysis(req: QueryRequest):
    try:
        return run_agentic_analysis(
            dataset_id=req.dataset_id,
            query=req.query,
            conversation_history=req.conversation_history
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis orchestration error: {str(e)}")

@router.post("/sql")
def execute_sql_endpoint(req: SQLRequest):
    try:
        df = get_dataset(req.dataset_id)
        success, rows, cols, msg = execute_sql_query(req.sql, df, max_rows=req.max_rows or 200)
        if not success:
            raise HTTPException(status_code=400, detail=msg)
        return {
            "success": True,
            "columns": cols,
            "row_count": len(rows),
            "rows": rows,
            "message": msg
        }
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")

@router.post("/funnel", response_model=FunnelAnalysisResult)
def execute_funnel_endpoint(req: FunnelRequest):
    try:
        df = get_dataset(req.dataset_id)
        return analyze_funnel(
            df=df,
            stage_col=req.stage_column,
            user_col=req.user_column,
            custom_order=req.custom_order,
            funnel_mode=req.funnel_mode
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/cohort", response_model=CohortAnalysisResult)
def execute_cohort_endpoint(req: CohortRequest):
    try:
        df = get_dataset(req.dataset_id)
        return analyze_cohorts(
            df=df,
            user_col=req.user_column,
            date_col=req.date_column,
            time_window=req.time_window or "month"
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/segmentation", response_model=SegmentationResult)
def execute_segmentation_endpoint(req: SegmentationRequest):
    try:
        df = get_dataset(req.dataset_id)
        if req.method == "KMeans" and req.feature_columns:
            return perform_kmeans_clustering(df, req.feature_columns, req.n_clusters or 4)
        
        # Default RFM
        c_col = req.customer_column or next((c for c in df.columns if any(k in c.lower() for k in ['customer', 'user', 'client', 'id'])), df.columns[0])
        d_col = req.date_column or next((c for c in df.columns if any(k in c.lower() for k in ['date', 'time', 'signup'])), None)
        a_col = req.amount_column or next((c for c in df.columns if any(k in c.lower() for k in ['revenue', 'amount', 'profit', 'spend', 'mrr', 'ltv', 'price'])), None)
        
        if not d_col or not a_col:
            raise ValueError("RFM segmentation requires identifiable date and amount columns.")
            
        return perform_rfm_segmentation(df, c_col, d_col, a_col)
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/forecast", response_model=ForecastResult)
def execute_forecast_endpoint(req: ForecastRequest):
    try:
        df = get_dataset(req.dataset_id)
        d_col = req.date_column or next((c for c in df.columns if any(k in c.lower() for k in ['date', 'time', 'timestamp', 'day', 'month', 'year', 'created'])), None)
        t_col = req.target_column or next((c for c in df.columns if pd.api.types.is_numeric_dtype(df[c]) and c != d_col), None)
        if not d_col or not t_col:
            raise ValueError("Forecasting requires at least one date/time column and one numeric target column.")
        return forecast_time_series(df, d_col, t_col, horizon=req.horizon or 6)
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/anomalies", response_model=AnomalyResult)
def execute_anomaly_endpoint(req: AnomalyRequest):
    try:
        df = get_dataset(req.dataset_id)
        return detect_anomalies(df, req.metric_column, req.id_column)
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{dataset_id}/report")
def get_executive_report_endpoint(dataset_id: str):
    try:
        return generate_comprehensive_report(dataset_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@router.get("/{dataset_id}/college-responses")
def get_college_responses_endpoint(dataset_id: str):
    try:
        df = get_dataset(dataset_id)
        from backend.app.tools.college_analyzer import analyze_college_responses
        return analyze_college_responses(df)
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze college responses: {str(e)}")

@router.post("/settings/gemini-key")
def update_gemini_api_key(req: ApiKeyRequest):
    settings.GEMINI_API_KEY = req.gemini_api_key
    return {"status": "success", "message": "Gemini API key updated successfully."}
