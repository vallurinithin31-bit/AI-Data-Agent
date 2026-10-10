'use client';

import React, { useState, useEffect } from 'react';
import { Filter, Layers, AlertTriangle, CheckCircle2, TrendingDown, ArrowRight, RefreshCw, Sparkles, Sliders, PhoneCall } from 'lucide-react';
import { DatasetMetadata, FunnelAnalysisResponse } from '@/types';
import { fetchFunnelAnalysis } from '@/lib/api';
import DynamicChart from './DynamicChart';

interface FunnelViewProps {
  dataset: DatasetMetadata | null;
}

export default function FunnelView({ dataset }: FunnelViewProps) {
  const [funnelData, setFunnelData] = useState<FunnelAnalysisResponse | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [funnelMode, setFunnelMode] = useState<'pipeline' | 'categories'>('pipeline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFunnel = (columnName?: string, mode: 'pipeline' | 'categories' = 'pipeline') => {
    if (!dataset) return;
    setLoading(true);
    setError(null);

    fetchFunnelAnalysis(dataset.id, columnName, mode)
      .then((data) => {
        setFunnelData(data);
        if (!selectedColumn && data.stage_column) {
          setSelectedColumn(data.stage_column);
        }
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to compute funnel analysis');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (dataset) {
      fetchFunnel(undefined, funnelMode);
    }
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl text-slate-600 shadow-sm font-medium">
        Please select a dataset to perform Funnel Analysis.
      </div>
    );
  }

  // Find candidate columns prioritizing response/status/stage
  const candidateColumns = [
    ...dataset.categorical_columns.filter(c => {
      const lower = c.toLowerCase();
      return lower.includes('response') || lower.includes('status') || lower.includes('stage') || lower.includes('disposition') || lower.includes('step') || lower.includes('event');
    }),
    ...dataset.categorical_columns.filter(c => {
      const lower = c.toLowerCase();
      return !lower.includes('response') && !lower.includes('status') && !lower.includes('stage') && !lower.includes('disposition') && !lower.includes('step') && !lower.includes('event');
    })
  ];

  const chartConfig = funnelData ? {
    chart_type: 'funnel',
    title: `Conversion Funnel Progression (${funnelData.stage_column})`,
    description: `Tracking user volume, sequential progression, and drop-offs across ${funnelData.stages.length} milestones.`,
    data: funnelData.stages.map(s => ({
      stage: s.stage_name,
      users: s.user_count,
      conversion_rate: s.conversion_rate,
      drop_off_rate: s.drop_off_rate
    }))
  } : null;

  const isResponsePipeline = funnelData?.funnel_mode === 'pipeline' && funnelData?.raw_response_counts && Object.keys(funnelData.raw_response_counts).length > 0;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-slate-100/90 border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3 text-white" />
              {isResponsePipeline ? 'Response Funnel Pipeline' : 'Conversion Optimization'}
            </span>
            <span className="text-xs text-slate-600 font-mono font-medium">
              Stage Bottleneck Detector
            </span>
          </div>
          <h2 className="text-xl font-bold text-black tracking-tight">
            Funnel Analysis: {dataset.name}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Automated detection of response milestones, progressive outreach drop-offs, and conversion friction points.
          </p>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => {
              setFunnelMode('pipeline');
              fetchFunnel(selectedColumn, 'pipeline');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              funnelMode === 'pipeline'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            ⚡ Conversion Pipeline
          </button>
          <button
            onClick={() => {
              setFunnelMode('categories');
              fetchFunnel(selectedColumn, 'categories');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              funnelMode === 'categories'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            📊 Category Breakdown
          </button>
        </div>
      </div>

      {/* Control Bar: Column Selector & Recalculate */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-slate-700 font-semibold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-900" />
            Active Stage / Response Column:
          </span>
          <select
            value={selectedColumn || funnelData?.stage_column || ''}
            onChange={(e) => {
              setSelectedColumn(e.target.value);
              fetchFunnel(e.target.value, funnelMode);
            }}
            className="bg-white border border-slate-300 text-black rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-800 text-xs font-mono font-medium shadow-sm"
          >
            {candidateColumns.map((col) => (
              <option key={col} value={col}>
                {col} {col.toLowerCase().includes('response') ? '(⚡ Response Column)' : ''}
              </option>
            ))}
          </select>

          {isResponsePipeline && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Auto-Converted from Responses to Lifecycle Funnel
            </span>
          )}
        </div>

        <button
          onClick={() => fetchFunnel(selectedColumn, funnelMode)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-b from-white to-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-sm transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-black' : ''}`} />
          Recalculate
        </button>
      </div>

      {/* Raw Response Categories Disposition Bar (if response data present) */}
      {funnelData?.raw_response_counts && Object.keys(funnelData.raw_response_counts).length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-black font-bold flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-slate-900" />
              Observed Responses in '{funnelData.stage_column}' ({dataset.row_count} total records)
            </span>
            <span className="text-slate-500 text-[11px] font-medium">
              Automatically parsed and mapped into conversion milestones
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(funnelData.raw_response_counts).map(([respName, count]) => {
              const pct = roundPct(count, dataset.row_count);
              const isPositive = ['share', 'interest', 'convert', 'won', 'yes'].some(k => respName.toLowerCase().includes(k));
              const isUnreach = ['switch off', 'invalid', 'out of reach', 'bounced'].some(k => respName.toLowerCase().includes(k));
              const isNoAnswer = ['no answer', 'busy', 'ringing', 'missed'].some(k => respName.toLowerCase().includes(k));

              const badgeColor = isPositive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : isUnreach
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : isNoAnswer
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-white text-slate-800 border-slate-200';

              return (
                <div
                  key={respName}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 shadow-sm ${badgeColor}`}
                >
                  <span className="font-sans font-medium">{respName}:</span>
                  <span className="font-bold">{count}</span>
                  <span className="text-[10px] opacity-80">({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">Funnel Analysis Agent reading data and calculating stage progression...</p>
        </div>
      ) : error ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-6 text-center text-amber-800 text-xs shadow-sm">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
          <p className="font-bold">{error}</p>
          <p className="text-slate-600 mt-1">
            Select a candidate stage or response column from the dropdown above to generate the conversion funnel.
          </p>
        </div>
      ) : funnelData ? (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block mb-1">Overall Conversion Rate</span>
              <div className="text-2xl font-bold text-black font-mono">
                {funnelData.overall_conversion}%
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                Top-of-funnel to final milestone
              </span>
            </div>

            <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block mb-1">Critical Bottleneck Stage</span>
              <div className="text-2xl font-bold text-rose-700 truncate">
                {funnelData.biggest_drop_off_stage}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                Single largest drop-off junction
              </span>
            </div>

            <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block mb-1">Peak Drop-off Rate</span>
              <div className="text-2xl font-bold text-amber-700 font-mono">
                {funnelData.biggest_drop_off_rate}%
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                Lost relative to previous milestone
              </span>
            </div>
          </div>

          {/* Interactive Chart */}
          {chartConfig && <DynamicChart config={chartConfig} />}

          {/* Detailed Stage Table */}
          <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-black flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-900" />
                Stage Conversion Breakdown
              </h4>
              <span className="text-[11px] text-slate-500 font-mono font-medium">
                {funnelData.stages.length} sequential milestones
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Stage / Milestone</th>
                    <th className="py-2.5 px-3">Count</th>
                    <th className="py-2.5 px-3">Total Conversion</th>
                    <th className="py-2.5 px-3">Stage-to-Stage Rate</th>
                    <th className="py-2.5 px-3">Dropped Count</th>
                    <th className="py-2.5 px-3">Drop-off Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {funnelData.stages.map((stage, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-semibold text-black">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold font-mono shadow-sm">
                            {idx + 1}
                          </span>
                          <span>{stage.stage_name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-black font-semibold">
                        {stage.user_count.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-black">
                        {stage.conversion_rate}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {stage.stage_conversion_rate}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {stage.drop_off_count.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        {stage.drop_off_rate > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold font-mono text-[11px]">
                            -{stage.drop_off_rate}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Diagnostic Explanation */}
          <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              AI Funnel Diagnostic & Action Plan
            </h4>
            <p className="text-xs text-black leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm font-medium">
              {funnelData.diagnostic_summary}
            </p>

            <div className="space-y-2 pt-2">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Recommended Interventions
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {funnelData.recommendations.map((rec, rIdx) => (
                  <div key={rIdx} className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 shadow-sm font-medium">
                    <span className="text-black font-bold block mb-1">Action Step {rIdx + 1}</span>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function roundPct(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}
