'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DatasetMetadata, ForecastResponse } from '@/types';
import { fetchForecasting } from '@/lib/api';
import DynamicChart from './DynamicChart';

interface ForecastingViewProps {
  dataset: DatasetMetadata | null;
}

export default function ForecastingView({ dataset }: ForecastingViewProps) {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) return;
    setLoading(true);
    setError(null);

    fetchForecasting(dataset.id)
      .then(setForecast)
      .catch((err: any) => {
        setError(err.message || 'Failed to generate forecast');
      })
      .finally(() => setLoading(false));
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl text-slate-600 shadow-sm font-medium">
        Please select a dataset to view Predictive Forecasting.
      </div>
    );
  }

  const chartConfig = forecast ? {
    chart_type: 'line',
    title: `Trend Projection & Forecast Horizon (${forecast.target_column})`,
    description: `Historical values combined with ${forecast.forecast_horizon} forecast intervals.`,
    x_axis: forecast.date_column || 'date',
    series_keys: ['actual', 'predicted', 'lower_bound', 'upper_bound'],
    data: (forecast.points || []).map(p => ({
      [forecast.date_column || 'date']: p.date,
      actual: p.actual ?? null,
      predicted: p.predicted ?? null,
      lower_bound: p.lower_bound ?? null,
      upper_bound: p.upper_bound ?? null
    }))
  } : null;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-slate-100/90 border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-sm">
              Predictive Modeling
            </span>
            <span className="text-xs text-slate-600 font-mono font-medium">
              Holt Exponential Smoothing & Linear Trend
            </span>
          </div>
          <h2 className="text-xl font-bold text-black tracking-tight">
            Time-Series Forecast: {dataset.name}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Autonomous suitability evaluation, trend extrapolation, and confidence interval ribbon generation.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">Forecasting Agent testing temporal suitability and training model...</p>
        </div>
      ) : error ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-6 text-center text-amber-800 text-xs shadow-sm">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
          <p className="font-bold">{error}</p>
        </div>
      ) : forecast ? (
        <div className="space-y-6">
          {/* Suitability Banner */}
          <div className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-sm font-medium ${
            forecast.is_suitable
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{forecast.suitability_reason}</span>
            </div>
            <span className="font-mono font-bold text-[11px] bg-white text-black px-2 py-0.5 rounded border border-slate-200 shadow-sm">
              Model: {forecast.method}
            </span>
          </div>

          {/* Metric KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block mb-1">Trend Trajectory</span>
              <div className="text-xl font-bold text-black">
                {forecast.trend_direction} Trend
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Historical direction
              </span>
            </div>

            <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block mb-1">Average Growth Rate</span>
              <div className="text-xl font-bold font-mono text-emerald-700">
                {forecast.growth_rate_pct ? `${forecast.growth_rate_pct}%` : 'Stable'}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Period-over-period mean
              </span>
            </div>

            <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block mb-1">Horizon Steps</span>
              <div className="text-xl font-bold font-mono text-black">
                +{forecast.forecast_horizon} Months
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                With 95% confidence intervals
              </span>
            </div>
          </div>

          {/* Chart */}
          {chartConfig && <DynamicChart config={chartConfig} />}

          {/* Forecast Summary */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 text-xs text-black font-medium leading-relaxed shadow-sm">
            {forecast.summary}
          </div>
        </div>
      ) : null}
    </div>
  );
}
