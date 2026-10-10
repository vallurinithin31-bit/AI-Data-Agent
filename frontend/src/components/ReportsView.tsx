'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, CheckCircle2, AlertTriangle, TrendingUp, Sparkles, FileSpreadsheet } from 'lucide-react';
import { DatasetMetadata } from '@/types';
import { fetchExecutiveReport, exportReportExcel, exportDatasetCSV } from '@/lib/api';

interface ReportsViewProps {
  dataset: DatasetMetadata | null;
}

export default function ReportsView({ dataset }: ReportsViewProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dataset) return;
    setLoading(true);
    fetchExecutiveReport(dataset.id)
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dataset]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = async () => {
    if (!dataset) return;
    try {
      const blob = await exportReportExcel(dataset.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `executive_report_${dataset.name}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleDownloadCSV = async () => {
    if (!dataset) return;
    try {
      const blob = await exportDatasetCSV(dataset.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dataset_${dataset.name}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl text-slate-600 shadow-sm font-medium">
        Please select a dataset to view and generate the Executive Report.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-slate-50 to-slate-100/90 border border-slate-200/90 rounded-2xl p-5 shadow-sm print:hidden">
        <div>
          <h2 className="text-lg font-bold text-black flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-900" />
            Executive Management Report
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Compiled autonomously by Report Agent • Ready for C-suite review & export
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadExcel}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-white to-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel Report (.xlsx)
          </button>
          <button
            onClick={handleDownloadCSV}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-white to-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-blue-600" />
            Clean CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-black hover:from-black hover:to-slate-900 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors border border-black"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">Report Agent compiling full 12-section executive dossier...</p>
        </div>
      ) : report ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl p-8 shadow-sm space-y-8 print:border-none print:bg-white print:text-black">
          {/* Header */}
          <div className="border-b border-slate-200 pb-6 print:border-black">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
              <span className="font-bold uppercase tracking-wider text-black">
                AI Data Analyst Enterprise Report
              </span>
              <span>Generated: {report.generated_at}</span>
            </div>
            <h1 className="text-2xl font-bold text-black print:text-black tracking-tight">
              Executive Analytical Brief: {report.dataset_name}
            </h1>
          </div>

          {/* 1. Executive Summary */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black print:text-black border-l-2 border-black pl-2">
              1. Executive Summary
            </h3>
            <p className="text-xs text-black print:text-gray-800 leading-relaxed bg-white print:bg-gray-50 p-4 rounded-xl border border-slate-200 print:border-gray-200 shadow-sm font-medium">
              {report.executive_summary}
            </p>
          </section>

          {/* 2. Key Performance Indicators */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black print:text-black border-l-2 border-black pl-2">
              2. Headline Key Performance Indicators
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {report.kpis?.map((kpi: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200 print:bg-gray-50 print:border-gray-200 shadow-sm">
                  <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">{kpi.label}</span>
                  <div className="text-lg font-bold text-black print:text-black font-mono">{kpi.value}</div>
                  <span className="text-[10px] text-slate-600 font-medium block mt-0.5">{kpi.change}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Data Quality Audit */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black print:text-black border-l-2 border-black pl-2">
              3. Data Integrity & Quality Evaluation
            </h3>
            <div className="p-4 rounded-xl bg-white border border-slate-200 print:bg-gray-50 text-xs text-black space-y-2 shadow-sm">
              <div className="flex items-center justify-between font-bold">
                <span>Overall Quality Health Score: {report.quality_report.overall_score}/100</span>
                <span className="text-emerald-700 font-bold">Grade {report.quality_report.grade}</span>
              </div>
              <p className="text-slate-600 font-medium">{report.quality_report.summary_text}</p>
            </div>
          </section>

          {/* 4. Conversion Funnel (if applicable) */}
          {report.funnel_analysis && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-black print:text-black border-l-2 border-black pl-2">
                4. Conversion Funnel & Drop-off Dynamics
              </h3>
              <div className="p-4 rounded-xl bg-white border border-slate-200 print:bg-gray-50 text-xs text-black space-y-3 shadow-sm">
                <p className="font-medium text-slate-800">{report.funnel_analysis.summary}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {report.funnel_analysis.stages.map((stg: any, sIdx: number) => (
                    <div key={sIdx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 print:bg-white text-[11px]">
                      <span className="font-bold text-black block truncate">{stg.stage_name}</span>
                      <span className="font-mono text-black font-semibold">{stg.conversion_rate}% conversion</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 5. Key Verified Insights */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black print:text-black border-l-2 border-black pl-2">
              5. Strategic Insights & Findings
            </h3>
            <div className="space-y-2">
              {report.key_insights.map((insight: string, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white border border-slate-200 print:bg-gray-50 text-xs text-black flex items-start gap-2.5 shadow-sm font-medium"
                >
                  <span className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-sm">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Prioritized Recommendations */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black print:text-black border-l-2 border-black pl-2">
              6. Executive Action Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {report.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 print:bg-gray-50 text-xs space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-black">{rec.action}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border bg-rose-50 text-rose-800 border-rose-200">
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed font-medium">{rec.details}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Limitations & Governance */}
          <section className="space-y-2 border-t border-slate-200 pt-6">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Methodological Assumptions & Governance
            </h4>
            <p className="text-[11px] text-slate-500 italic">
              {report.limitations}
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
