export interface ColumnInfo {
  name: string;
  data_type: string;
  semantic_type: string;
  is_numeric: boolean;
  is_datetime: boolean;
  is_categorical: boolean;
  unique_count: number;
  missing_count: number;
  missing_pct: number;
  sample_values: any[];
}

export interface DatasetMetadata {
  id: string;
  name: string;
  file_type: string;
  file_size_bytes: number;
  row_count: number;
  column_count: number;
  columns: ColumnInfo[];
  numerical_columns: string[];
  categorical_columns: string[];
  date_columns: string[];
  created_at: string;
  is_cleaned: boolean;
  parent_dataset_id?: string;
}

export interface DataQualityIssue {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  column?: string;
  description: string;
  affected_count: number;
  affected_pct: number;
  suggested_action: string;
}

export interface DataQualityReport {
  overall_score: number;
  grade: string;
  total_rows: number;
  total_columns: number;
  memory_usage_mb: number;
  missing_cells: number;
  missing_pct: number;
  duplicate_rows: number;
  duplicate_pct: number;
  constant_columns: string[];
  outlier_count: number;
  issues: DataQualityIssue[];
  summary_text: string;
}

export interface CleaningAction {
  id: string;
  action_type: string;
  column?: string;
  reason: string;
  details: Record<string, any>;
  suggested_code: string;
  accepted: boolean;
}

export interface CleaningPlan {
  dataset_id: string;
  dataset_name: string;
  total_actions: number;
  actions: CleaningAction[];
  summary: string;
}

export interface PlanStep {
  step_number: number;
  title: string;
  agent: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result_summary?: string;
}

export interface AnalysisPlan {
  query: string;
  intent: string;
  steps: PlanStep[];
  execution_time_ms?: number;
}

export interface KeyFinding {
  finding: string;
  supporting_metric: string;
  business_impact: string;
  confidence: string;
  limitations?: string;
}

export interface RecommendationItem {
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  reason: string;
  expected_impact: string;
  evidence: string;
  suggested_action: string;
}

export interface VisualizationConfig {
  chart_type: string;
  title: string;
  description?: string;
  x_axis?: string;
  y_axis?: string;
  series_keys?: string[];
  data: Record<string, any>[];
  options?: Record<string, any>;
}

export interface FunnelStageData {
  stage_name: string;
  user_count: number;
  conversion_rate: number;
  stage_conversion_rate: number;
  drop_off_count: number;
  drop_off_rate: number;
}

export interface FunnelAnalysisResult {
  stages: FunnelStageData[];
  overall_conversion: number;
  biggest_drop_off_stage: string;
  biggest_drop_off_rate: number;
  diagnostic_summary: string;
  recommendations: string[];
  stage_column?: string;
  user_column?: string;
  detected_mode?: 'response_pipeline' | 'event_sequence' | 'category_frequency';
  funnel_mode?: string;
  raw_response_counts?: Record<string, number>;
  available_columns?: string[];
}

export interface CohortAnalysisResult {
  cohort_metric: string;
  cohorts: string[];
  periods: string[];
  retention_matrix: (number | null)[][];
  cohort_sizes: number[];
  summary: string;
}

export interface CustomerSegment {
  segment_name: string;
  customer_count: number;
  percentage: number;
  avg_recency: number;
  avg_frequency: number;
  avg_monetary: number;
  description: string;
  key_traits: string[];
}

export interface SegmentationResult {
  total_customers: number;
  method: string;
  segments: CustomerSegment[];
  summary: string;
  scatter_data?: Record<string, any>[];
}

export interface ForecastDataPoint {
  date: string;
  actual?: number;
  predicted?: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface ForecastResult {
  target_column: string;
  date_column: string;
  method: string;
  historical_points: number;
  forecast_horizon: number;
  trend_direction: string;
  growth_rate_pct?: number;
  is_suitable: boolean;
  suitability_reason?: string;
  points: ForecastDataPoint[];
  summary: string;
}

export interface AnomalyItem {
  id: string;
  row_index: number;
  key_identifier: string;
  metric_name: string;
  actual_value: number;
  expected_value: number;
  deviation_pct: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  potential_cause: string;
  recommendation: string;
}

export interface AnomalyResult {
  total_anomalies: number;
  anomalies: AnomalyItem[];
  methods_used: string[];
  summary: string;
}

export interface AnalysisResponse {
  dataset_id: string;
  query: string;
  intent: string;
  plan: AnalysisPlan;
  execution_code?: string;
  sql_query?: string;
  key_findings: KeyFinding[];
  recommendations: RecommendationItem[];
  visual?: VisualizationConfig;
  secondary_visual?: VisualizationConfig;
  funnel_result?: FunnelAnalysisResult;
  cohort_result?: CohortAnalysisResult;
  segmentation_result?: SegmentationResult;
  forecast_result?: ForecastResult;
  anomaly_result?: AnomalyResult;
  raw_data_preview?: Record<string, any>[];
  validation_passed: boolean;
  validation_notes: string[];
  formatted_answer: string;
}

export type FunnelAnalysisResponse = FunnelAnalysisResult;
export type CohortAnalysisResponse = CohortAnalysisResult;
export type SegmentationResponse = SegmentationResult;
export type ForecastResponse = ForecastResult;
export type AnomalyDetectionResponse = AnomalyResult;

export interface CollegeResponseItem {
  id: string;
  row_index: number;
  college_name: string;
  response: string;
  raw_response: string;
  category: string;
  color: string;
  district: string;
  department: string;
  designation: string;
  contact_person: string;
  phone: string;
  email: string;
  nirf_rank: string;
  qs_rank: string;
  gender: string;
}

export interface ResponseCategorySummary {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface CollegeResponsesResult {
  is_college_data: boolean;
  total_institutions: number;
  college_column: string;
  response_column: string;
  districts: string[];
  responses_summary: ResponseCategorySummary[];
  category_summary: ResponseCategorySummary[];
  institutions: CollegeResponseItem[];
}

export interface CustomExportRequest {
  dataset_id: string;
  natural_language_prompt?: string;
  requested_columns?: string[];
  column_sequence?: string[];
  sort_column?: string;
  sort_direction?: 'asc' | 'desc';
  filter_query?: string;
  filter_column?: string;
  filter_value?: string;
  deduplicate?: boolean;
  deduplicate_columns?: string[];
  row_limit?: number;
  validation_rules?: Record<string, string>;
  color_preferences?: Record<string, string>;
  separate_unverified_sheet?: boolean;
}

export interface CellValidationInfo {
  status: 'valid' | 'warning' | 'error' | 'normal';
  reason?: string;
  color?: string;
  value?: string;
}

export interface CustomExportPreview {
  export_id: string;
  dataset_id: string;
  dataset_name: string;
  prompt?: string;
  column_sequence: string[];
  total_rows: number;
  preview_rows: Record<string, any>[];
  cell_validation_matrix: Record<string, CellValidationInfo>[];
  quality_summary: {
    total_records: number;
    total_columns: number;
    validated_records_count: number;
    unverified_records_count: number;
    valid_cells_count: number;
    warning_cells_count: number;
    error_cells_count: number;
    duplicates_removed: number;
    overall_quality_score: number;
    missing_per_column: Record<string, number>;
  };
  sources_info: {
    source_dataset_name: string;
    source_dataset_id: string;
    source_file_type: string;
    retrieval_date: string;
    verification_criteria: string;
    requested_prompt: string;
  };
  applied_instructions: {
    column_sequence: string[];
    sort_column?: string;
    sort_direction: string;
    filter_applied: string;
    deduplicate: boolean;
    row_limit: string | number;
  };
  download_url: string;
}

export interface ParsedPromptResult {
  requested_columns: string[];
  column_sequence: string[];
  sort_column?: string;
  sort_direction: string;
  filter_description?: string;
  filter_column?: string;
  filter_value?: string;
  deduplicate: boolean;
  deduplicate_columns: string[];
  row_limit?: number;
  validation_focus: string[];
  detected_color_rules: Record<string, string>;
  summary_explanation: string;
}

export interface GenerateDataRequest {
  prompt: string;
  record_count?: number;
  domain?: 'auto' | 'education' | 'b2b_sales' | 'ecommerce' | 'saas' | 'custom';
  columns?: string[];
  save_as_dataset?: boolean;
  dataset_name?: string;
  reference_dataset_id?: string;
}

export interface GenerateDataResponse {
  generation_id: string;
  prompt: string;
  domain: string;
  record_count: number;
  columns: string[];
  rows: Record<string, any>[];
  quality_summary: {
    total_generated_records: number;
    total_columns: number;
    zero_repetition_verified: boolean;
    shared_file_records_excluded: number;
    shared_phones_excluded: number;
    shared_emails_excluded: number;
    quality_score: number;
    valid_cells_count: number;
    warning_cells_count: number;
    error_cells_count: number;
    duplicate_rate: string;
  };
  dataset_id?: string;
  dataset_name?: string;
  download_excel_url: string;
  execution_time_ms: number;
}



