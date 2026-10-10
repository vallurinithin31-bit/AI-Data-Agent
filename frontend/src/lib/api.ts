import {
  DatasetMetadata, DataQualityReport, CleaningPlan, AnalysisResponse,
  FunnelAnalysisResult, CohortAnalysisResult, SegmentationResult,
  ForecastResult, AnomalyResult, CollegeResponsesResult,
  CustomExportRequest, CustomExportPreview, ParsedPromptResult,
  GenerateDataRequest, GenerateDataResponse
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')
  : (typeof window !== 'undefined' ? '/api/v1' : (process.env.BACKEND_URL ? `${process.env.BACKEND_URL.replace(/\/+$/, '')}/api/v1` : 'http://127.0.0.1:8000/api/v1'));

export async function fetchDatasets(): Promise<DatasetMetadata[]> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) throw new Error('Failed to load datasets');
  return res.json();
}

export async function uploadDataset(file: File): Promise<DatasetMetadata> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/datasets/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function deleteDataset(datasetId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete dataset' }));
    throw new Error(err.detail || 'Failed to delete dataset');
  }
  return true;
}

export async function fetchDatasetPreview(datasetId: string, limit = 50) {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/preview?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load preview');
  return res.json();
}

export async function fetchQualityReport(datasetId: string): Promise<DataQualityReport> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/profile`);
  if (!res.ok) throw new Error('Failed to load quality report');
  return res.json();
}

export async function fetchCleaningPlan(datasetId: string): Promise<CleaningPlan> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/cleaning-plan`);
  if (!res.ok) throw new Error('Failed to load cleaning plan');
  return res.json();
}

export async function applyCleaningPlan(datasetId: string, approvedActionIds: string[]): Promise<DatasetMetadata> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/apply-cleaning`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_id: datasetId, approved_action_ids: approvedActionIds }),
  });
  if (!res.ok) throw new Error('Failed to apply cleaning actions');
  return res.json();
}

export async function runQueryAnalysis(datasetId: string, query: string): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/analysis/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_id: datasetId, query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Analysis failed');
  }
  return res.json();
}

export async function runCustomSQL(datasetId: string, sql: string) {
  const res = await fetch(`${API_BASE}/analysis/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_id: datasetId, sql }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'SQL query failed' }));
    throw new Error(err.detail || 'SQL query failed');
  }
  return res.json();
}

export async function runFunnelAnalysis(
  datasetId: string,
  stageColumn?: string,
  userColumn?: string,
  customOrder?: string[],
  funnelMode?: string
): Promise<FunnelAnalysisResult> {
  const res = await fetch(`${API_BASE}/analysis/funnel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_id: datasetId,
      stage_column: stageColumn,
      user_column: userColumn,
      custom_order: customOrder,
      funnel_mode: funnelMode
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Funnel analysis failed' }));
    throw new Error(err.detail || 'Funnel analysis failed');
  }
  return res.json();
}

export async function runCohortAnalysis(datasetId: string): Promise<CohortAnalysisResult> {
  const res = await fetch(`${API_BASE}/analysis/cohort`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_id: datasetId }),
  });
  if (!res.ok) throw new Error('Cohort analysis failed');
  return res.json();
}

export async function runSegmentation(datasetId: string): Promise<SegmentationResult> {
  const res = await fetch(`${API_BASE}/analysis/segmentation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_id: datasetId }),
  });
  if (!res.ok) throw new Error('Segmentation failed');
  return res.json();
}

export async function runForecast(datasetId: string, dateCol?: string, targetCol?: string): Promise<ForecastResult> {
  const res = await fetch(`${API_BASE}/analysis/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_id: datasetId,
      date_column: dateCol || undefined,
      target_column: targetCol || undefined
    }),
  });
  if (!res.ok) throw new Error('Forecast failed');
  return res.json();
}

export async function runAnomalyDetection(datasetId: string): Promise<AnomalyResult> {
  const res = await fetch(`${API_BASE}/analysis/anomalies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_id: datasetId }),
  });
  if (!res.ok) throw new Error('Anomaly detection failed');
  return res.json();
}

export async function fetchExecutiveReport(datasetId: string) {
  const res = await fetch(`${API_BASE}/analysis/${datasetId}/report`);
  if (!res.ok) throw new Error('Failed to generate report');
  return res.json();
}

export async function saveGeminiKey(apiKey: string) {
  const res = await fetch(`${API_BASE}/analysis/settings/gemini-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gemini_api_key: apiKey }),
  });
  return res.json();
}

export async function exportReportExcel(datasetId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/export/excel`);
  if (!res.ok) throw new Error('Failed to export Excel report');
  return res.blob();
}

export async function exportDatasetCSV(datasetId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/export/csv`);
  if (!res.ok) throw new Error('Failed to export CSV');
  return res.blob();
}

// Aliases for component convenience
export const fetchFunnelAnalysis = async (
  datasetId: string,
  stageColumn?: string,
  mode: 'pipeline' | 'categories' = 'pipeline'
) => {
  return runFunnelAnalysis(datasetId, stageColumn, undefined, undefined, mode);
};

export const fetchCohortAnalysis = async (datasetId: string) => {
  return runCohortAnalysis(datasetId);
};

export const fetchSegmentation = async (datasetId: string) => {
  return runSegmentation(datasetId);
};

export const fetchForecasting = async (datasetId: string) => {
  return runForecast(datasetId);
};

export const fetchAnomalies = async (datasetId: string) => {
  return runAnomalyDetection(datasetId);
};

export async function fetchCollegeResponses(datasetId: string): Promise<CollegeResponsesResult> {
  const res = await fetch(`${API_BASE}/analysis/${datasetId}/college-responses`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch college responses' }));
    throw new Error(err.detail || 'Failed to fetch college responses');
  }
  return res.json();
}

export async function generateCustomExport(req: CustomExportRequest): Promise<CustomExportPreview> {
  const res = await fetch(`${API_BASE}/custom-export/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate custom export' }));
    throw new Error(err.detail || 'Failed to generate custom export');
  }
  return res.json();
}

export async function parseExportPrompt(datasetId: string, prompt: string): Promise<ParsedPromptResult> {
  const res = await fetch(`${API_BASE}/custom-export/parse-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_id: datasetId, prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to parse prompt' }));
    throw new Error(err.detail || 'Failed to parse prompt');
  }
  return res.json();
}

export function getExportDownloadUrl(exportId: string): string {
  return `${API_BASE}/custom-export/download/${exportId}`;
}

export async function generateNewData(req: GenerateDataRequest): Promise<GenerateDataResponse> {
  const res = await fetch(`${API_BASE}/data-generation/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate new data' }));
    throw new Error(err.detail || 'Failed to generate new data');
  }
  return res.json();
}

export async function saveGeneratedDataset(generationId: string, datasetName: string): Promise<{
  dataset_id: string;
  dataset_name: string;
  message: string;
  rows_count?: number;
  columns_count?: number;
}> {
  const res = await fetch(`${API_BASE}/data-generation/save-dataset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generation_id: generationId, dataset_name: datasetName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to save dataset' }));
    throw new Error(err.detail || 'Failed to save dataset');
  }
  return res.json();
}


