from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class PlanStep(BaseModel):
    step_number: int
    title: str
    agent: str
    description: str
    status: str = "completed"  # pending, running, completed, failed
    result_summary: Optional[str] = None

class AnalysisPlan(BaseModel):
    query: str
    intent: str
    steps: List[PlanStep] = Field(default_factory=list)
    execution_time_ms: Optional[float] = None

class KeyFinding(BaseModel):
    finding: str
    supporting_metric: str
    business_impact: str
    confidence: str = "High"  # High, Medium, Low
    limitations: Optional[str] = None

class RecommendationItem(BaseModel):
    priority: str  # High, Medium, Low
    title: str
    reason: str
    expected_impact: str
    evidence: str
    suggested_action: str

class VisualizationConfig(BaseModel):
    chart_type: str  # bar, line, area, pie, scatter, boxplot, heatmap, funnel, cohort, kpi, table
    title: str
    description: Optional[str] = None
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    series_keys: List[str] = Field(default_factory=list)
    data: List[Dict[str, Any]] = Field(default_factory=list)
    options: Dict[str, Any] = Field(default_factory=dict)

# Feature-specific result models
class FunnelStageData(BaseModel):
    stage_name: str
    user_count: int
    conversion_rate: float  # vs Stage 1 %
    stage_conversion_rate: float  # vs Previous Stage %
    drop_off_count: int
    drop_off_rate: float

class FunnelAnalysisResult(BaseModel):
    stages: List[FunnelStageData]
    overall_conversion: float
    biggest_drop_off_stage: str
    biggest_drop_off_rate: float
    diagnostic_summary: str
    recommendations: List[str] = Field(default_factory=list)
    stage_column: Optional[str] = None
    user_column: Optional[str] = None
    detected_mode: Optional[str] = "event_sequence"  # "response_pipeline", "event_sequence", "category_frequency"
    raw_response_counts: Optional[Dict[str, int]] = None
    available_columns: Optional[List[str]] = None

class CohortAnalysisResult(BaseModel):
    cohort_metric: str  # e.g., 'User Retention' or 'Revenue'
    cohorts: List[str]  # e.g. ['2024-01', '2024-02']
    periods: List[str]  # e.g. ['Month 0', 'Month 1', 'Month 2']
    retention_matrix: List[List[Optional[float]]]
    cohort_sizes: List[int]
    summary: str

class CustomerSegment(BaseModel):
    segment_name: str
    customer_count: int
    percentage: float
    avg_recency: float
    avg_frequency: float
    avg_monetary: float
    description: str
    key_traits: List[str] = Field(default_factory=list)

class SegmentationResult(BaseModel):
    total_customers: int
    method: str  # RFM or K-Means
    segments: List[CustomerSegment]
    summary: str
    scatter_data: Optional[List[Dict[str, Any]]] = None

class ForecastDataPoint(BaseModel):
    date: str
    actual: Optional[float] = None
    predicted: Optional[float] = None
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None

class ForecastResult(BaseModel):
    target_column: str
    date_column: str
    method: str
    historical_points: int
    forecast_horizon: int
    trend_direction: str
    growth_rate_pct: Optional[float] = None
    is_suitable: bool = True
    suitability_reason: Optional[str] = None
    points: List[ForecastDataPoint]
    summary: str

class AnomalyItem(BaseModel):
    id: str
    row_index: int
    key_identifier: str
    metric_name: str
    actual_value: float
    expected_value: float
    deviation_pct: float
    severity: str  # Critical, High, Medium, Low
    potential_cause: str
    recommendation: str

class AnomalyResult(BaseModel):
    total_anomalies: int
    anomalies: List[AnomalyItem]
    methods_used: List[str]
    summary: str

class StatisticalTestResult(BaseModel):
    test_name: str
    statistic: float
    p_value: float
    significant: bool
    degrees_of_freedom: Optional[float] = None
    interpretation: str

class AnalysisResponse(BaseModel):
    dataset_id: str
    query: str
    intent: str
    plan: AnalysisPlan
    execution_code: Optional[str] = None
    sql_query: Optional[str] = None
    key_findings: List[KeyFinding] = Field(default_factory=list)
    recommendations: List[RecommendationItem] = Field(default_factory=list)
    visual: Optional[VisualizationConfig] = None
    secondary_visual: Optional[VisualizationConfig] = None
    statistical_test: Optional[StatisticalTestResult] = None
    funnel_result: Optional[FunnelAnalysisResult] = None
    cohort_result: Optional[CohortAnalysisResult] = None
    segmentation_result: Optional[SegmentationResult] = None
    forecast_result: Optional[ForecastResult] = None
    anomaly_result: Optional[AnomalyResult] = None
    raw_data_preview: Optional[List[Dict[str, Any]]] = None
    validation_passed: bool = True
    validation_notes: List[str] = Field(default_factory=list)
    formatted_answer: str
