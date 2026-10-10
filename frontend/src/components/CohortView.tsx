'use client';

import React, { useState, useEffect } from 'react';
import { Layers, AlertTriangle } from 'lucide-react';
import { DatasetMetadata, CohortAnalysisResponse } from '@/types';
import { fetchCohortAnalysis } from '@/lib/api';
import DynamicChart from './DynamicChart';

interface CohortViewProps {
  dataset: DatasetMetadata | null;
}

export default function CohortView({ dataset }: CohortViewProps) {
  const [cohortData, setCohortData] = useState<CohortAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) return;
    setLoading(true);
    setError(null);

    fetchCohortAnalysis(dataset.id)
      .then(setCohortData)
      .catch((err: any) => {
        setError(err.message || 'Failed to compute cohort analysis');
      })
      .finally(() => setLoading(false));
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl text-slate-600 shadow-sm font-medium">
        Please select a dataset to view Cohort & Retention Analysis.
      </div>
    );
  }

  const chartConfig = cohortData ? {
    chart_type: 'cohort',
    title: 'Customer Retention Cohort Heatmap',
    description: 'Percentage of users returning over subsequent monthly periods.',
    series_keys: cohortData.periods,
    data: cohortData.cohorts.map((cohortName, idx) => {
      const row: any = { cohort: cohortName, size: cohortData.cohort_sizes?.[idx] ?? 0 };
      cohortData.periods.forEach((p, pIdx) => {
        row[p] = cohortData.retention_matrix?.[idx]?.[pIdx] ?? null;
      });
      return row;
    })
  } : null;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-slate-100/90 border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-sm">
              Retention Analytics
            </span>
            <span className="text-xs text-slate-600 font-mono font-medium">
              Temporal Cohorts
            </span>
          </div>
          <h2 className="text-xl font-bold text-black tracking-tight">
            Cohort & Retention Analysis: {dataset.name}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Tracks customer repeat purchase and platform retention across monthly acquisition intervals.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">Cohort Analysis Agent building retention matrix...</p>
        </div>
      ) : error ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-6 text-center text-amber-800 text-xs shadow-sm">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
          <p className="font-bold">{error}</p>
          <p className="text-slate-600 mt-1">
            Cohort analysis requires identifiable user ID and date timestamp columns in the dataset.
          </p>
        </div>
      ) : cohortData ? (
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 text-xs text-black leading-relaxed shadow-sm font-medium">
            {cohortData.summary}
          </div>

          {/* Interactive Cohort Heatmap */}
          {chartConfig && <DynamicChart config={chartConfig} />}
        </div>
      ) : null}
    </div>
  );
}
