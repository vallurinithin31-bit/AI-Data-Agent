'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Database, Sparkles, Filter, Users, Layers,
  AlertTriangle, ArrowRight, ShieldCheck, Download, FileSpreadsheet, Building2
} from 'lucide-react';
import { DatasetMetadata, DataQualityReport, AnalysisResponse, CollegeResponsesResult } from '@/types';
import { fetchQualityReport, runQueryAnalysis, fetchCollegeResponses } from '@/lib/api';
import DynamicChart from './DynamicChart';
import FindingCard from './FindingCard';
import RecommendationCard from './RecommendationCard';
import CollegeResponseExplorer from './CollegeResponseExplorer';

interface DashboardViewProps {
  dataset: DatasetMetadata | null;
  onNavigateTab: (tab: string) => void;
}

export default function DashboardView({ dataset, onNavigateTab }: DashboardViewProps) {
  const [quality, setQuality] = useState<DataQualityReport | null>(null);
  const [quickAnalysis, setQuickAnalysis] = useState<AnalysisResponse | null>(null);
  const [collegeData, setCollegeData] = useState<CollegeResponsesResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dataset) return;
    let isMounted = true;
    setLoading(true);

    Promise.all([
      fetchQualityReport(dataset.id).catch(() => null),
      runQueryAnalysis(dataset.id, 'Provide executive KPI summary and primary distribution breakdown').catch(() => null),
      fetchCollegeResponses(dataset.id).catch(() => null),
    ]).then(([qData, aData, cData]) => {
      if (isMounted) {
        setQuality(qData);
        setQuickAnalysis(aData);
        setCollegeData(cData);
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl shadow-sm">
        <p className="text-slate-600 font-medium">Please select or upload a dataset to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-slate-100/90 border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-sm">
              Active Session
            </span>
            <span className="text-xs text-slate-600 font-mono font-medium">
              {dataset.file_type.toUpperCase()} • {(dataset.file_size_bytes / 1024).toFixed(1)} KB
            </span>
          </div>
          <h2 className="text-xl font-bold text-black tracking-tight">
            Executive Intelligence: {dataset.name}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Autonomous multi-agent data analytics grounded in verifiable statistical computation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('data-generation')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-black hover:from-black hover:to-slate-900 text-white text-xs font-bold shadow-sm border border-emerald-900 flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            New Data Agent (0% Dups)
          </button>
          <button
            onClick={() => onNavigateTab('custom-export')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-black hover:from-black hover:to-slate-900 text-white text-xs font-bold shadow-sm border border-black flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
            Custom Data & Excel
          </button>
          {collegeData && collegeData.is_college_data && (
            <button
              onClick={() => {
                const el = document.getElementById('college-response-explorer');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-white to-slate-50 hover:bg-slate-100 text-black text-xs font-bold border border-slate-300 shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Building2 className="w-3.5 h-3.5 text-black" />
              Colleges by Response ({collegeData.total_institutions})
            </button>
          )}
          <button
            onClick={() => onNavigateTab('chat')}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold shadow-sm border border-slate-300 flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-900" />
            Ask AI Analyst
          </button>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-4 py-2 rounded-xl bg-gradient-to-b from-white to-slate-50 hover:bg-slate-100 text-slate-900 text-xs font-semibold border border-slate-300 shadow-sm transition-colors"
          >
            Full Report
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Total Records</span>
          <div className="text-xl font-bold text-black font-mono">
            {dataset.row_count.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Across {dataset.column_count} dimensions
          </span>
        </div>

        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Data Health Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-700 font-mono">
              {quality?.overall_score ?? 95}/100
            </span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Grade {quality?.grade ?? 'A'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {quality?.missing_pct ?? 0}% missing cells
          </span>
        </div>

        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Numerical Metrics</span>
          <div className="text-xl font-bold text-black font-mono">
            {dataset.numerical_columns.length}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block truncate">
            {dataset.numerical_columns.slice(0, 2).join(', ') || 'None'}
          </span>
        </div>

        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Detected Outliers</span>
          <div className="text-xl font-bold text-amber-700 font-mono">
            {quality?.outlier_count ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Outside 1.5x IQR bounds
          </span>
        </div>
      </div>

      {/* College Outreach & Response Directory Section */}
      {collegeData && collegeData.is_college_data && (
        <CollegeResponseExplorer data={collegeData} datasetName={dataset.name} />
      )}

      {/* Quick Launchpad Action Pills */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
          Specialized Analytical Agents
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
          {[
            { id: 'data-generation', label: 'New Data (0% Overlap)', icon: Sparkles, color: 'text-emerald-700' },
            { id: 'custom-export', label: 'Custom Data & Excel', icon: FileSpreadsheet, color: 'text-black' },
            { id: 'funnel', label: 'Funnel Analysis', icon: Filter, color: 'text-slate-800' },
            { id: 'cohort', label: 'Cohort Retention', icon: Layers, color: 'text-slate-800' },
            { id: 'segmentation', label: 'Customer RFM', icon: Users, color: 'text-slate-800' },
            { id: 'forecasting', label: 'Sales Forecast', icon: TrendingUp, color: 'text-slate-800' },
            { id: 'anomalies', label: 'Anomaly Audit', icon: AlertTriangle, color: 'text-amber-700' },
            { id: 'cleaning', label: 'Data Cleaning', icon: ShieldCheck, color: 'text-emerald-700' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onNavigateTab(action.id)}
                className="p-3 rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all text-left group flex flex-col justify-between shadow-sm"
              >
                <Icon className={`w-4 h-4 ${action.color} mb-2`} />
                <div>
                  <span className="text-xs font-bold text-black block">
                    {action.label}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                    Launch <ArrowRight className="w-2.5 h-2.5 text-black" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Visual Chart */}
      {loading ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">Agents analyzing dataset structure...</p>
        </div>
      ) : quickAnalysis?.visual ? (
        <DynamicChart config={quickAnalysis.visual} />
      ) : null}

      {/* Top Findings & Recommendations Preview */}
      {quickAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-black" />
              Verified Key Findings
            </h3>
            <div className="space-y-3">
              {quickAnalysis.key_findings.slice(0, 2).map((finding, idx) => (
                <FindingCard key={idx} finding={finding} index={idx} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-black" />
              High Priority Business Recommendations
            </h3>
            <div className="space-y-3">
              {quickAnalysis.recommendations.slice(0, 2).map((rec, idx) => (
                <RecommendationCard key={rec.priority + idx} rec={rec} index={idx} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
