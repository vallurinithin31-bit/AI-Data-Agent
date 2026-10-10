'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, AlertCircle,
  Database, RefreshCw, Download, ArrowUpDown, ChevronLeft, ChevronRight,
  Trash2
} from 'lucide-react';
import { DatasetMetadata, DataQualityReport } from '@/types';
import { uploadDataset, fetchQualityReport, fetchDatasetPreview } from '@/lib/api';

interface DatasetsViewProps {
  dataset: DatasetMetadata | null;
  onDatasetUploaded: (newMeta: DatasetMetadata) => void;
  onDeleteDataset?: (id: string) => void;
}

export default function DatasetsView({ dataset, onDatasetUploaded, onDeleteDataset }: DatasetsViewProps) {
  const [quality, setQuality] = useState<DataQualityReport | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    if (!dataset) return;
    fetchQualityReport(dataset.id).then(setQuality).catch(() => null);
    fetchDatasetPreview(dataset.id, 100).then(setPreview).catch(() => null);
  }, [dataset]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const newDataset = await uploadDataset(file);
      onDatasetUploaded(newDataset);
    } catch (err: any) {
      setUploadError(err.message || 'File upload and parsing failed');
    } finally {
      setIsUploading(false);
    }
  };

  const paginatedRows = preview?.rows?.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  ) || [];

  const totalPages = preview?.rows ? Math.ceil(preview.rows.length / rowsPerPage) : 1;

  return (
    <div className="space-y-6">
      {/* Upload Drag & Drop Area */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-gradient-to-br from-white via-slate-50 to-slate-100/70 shadow-sm ${
          isUploading
            ? 'border-slate-800 bg-slate-50'
            : 'border-slate-300 hover:border-slate-800 hover:shadow-md'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          onChange={handleFileUpload}
          accept=".csv,.tsv,.xlsx,.xls,.json"
          className="hidden"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md group-hover:scale-105 transition-transform">
            {isUploading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-sm font-bold text-black">
            {isUploading ? 'Validating & Profiling Dataset...' : 'Drag & Drop Dataset or Click to Browse'}
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Supported formats: <span className="text-black font-semibold">CSV, TSV, Excel (.xlsx, .xls), JSON</span> (Up to 100 MB)
          </p>
        </label>
        {uploadError && (
          <p className="text-xs text-rose-600 mt-2 font-bold">{uploadError}</p>
        )}
      </div>

      {dataset && (
        <>
          {/* Metadata Overview Banner */}
          <div className="bg-gradient-to-r from-white via-slate-50 to-slate-100/90 border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-black flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-900" />
                  {dataset.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Uploaded: {new Date(dataset.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-mono font-medium shadow-sm">
                  {dataset.row_count.toLocaleString()} rows
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-mono font-medium shadow-sm">
                  {dataset.column_count} columns
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-mono font-medium shadow-sm">
                  {(dataset.file_size_bytes / 1024).toFixed(1)} KB
                </span>
                {onDeleteDataset && (
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${dataset.name}"?`)) {
                        onDeleteDataset(dataset.id);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors ml-1 shadow-sm"
                    title="Delete dataset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete File
                  </button>
                )}
              </div>
            </div>

            {/* Column Category Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200 shadow-sm">
                <span className="text-slate-500 font-semibold block mb-1">Numerical Columns ({dataset.numerical_columns.length}):</span>
                <span className="text-black font-mono text-[11px] font-semibold truncate block">
                  {dataset.numerical_columns.join(', ') || 'None'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200 shadow-sm">
                <span className="text-slate-500 font-semibold block mb-1">Categorical Columns ({dataset.categorical_columns.length}):</span>
                <span className="text-black font-mono text-[11px] font-semibold truncate block">
                  {dataset.categorical_columns.join(', ') || 'None'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200 shadow-sm">
                <span className="text-slate-500 font-semibold block mb-1">Date/Time Columns ({dataset.date_columns.length}):</span>
                <span className="text-black font-mono text-[11px] font-semibold truncate block">
                  {dataset.date_columns.join(', ') || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Data Quality Report Card */}
          {quality && (
            <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-black">Data Quality Audit</h4>
                    <p className="text-xs text-slate-600 font-medium">{quality.summary_text}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono text-emerald-700">
                    {quality.overall_score}/100
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Health Score (Grade {quality.grade})
                  </span>
                </div>
              </div>

              {/* Quality Issues List */}
              {quality.issues.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Detected Quality Issues ({quality.issues.length})
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {quality.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-start gap-2.5 shadow-sm"
                      >
                        {issue.severity === 'critical' ? (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-black capitalize">
                              {issue.type.replace('_', ' ')}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                              issue.severity === 'critical'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] mb-1">{issue.description}</p>
                          <span className="text-black font-semibold text-[10px] block">
                            Fix: {issue.suggested_action}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schema & Column Profiling Explorer */}
          <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-black">Schema & Column Profile</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Column Name</th>
                    <th className="py-2.5 px-3">Data Type</th>
                    <th className="py-2.5 px-3">Semantic Type</th>
                    <th className="py-2.5 px-3">Unique Values</th>
                    <th className="py-2.5 px-3">Missing Count</th>
                    <th className="py-2.5 px-3">Sample Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dataset.columns.map((col, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-semibold text-black font-mono">{col.name}</td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{col.data_type}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold uppercase">
                          {col.semantic_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-black">{col.unique_count.toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono">
                        {col.missing_count > 0 ? (
                          <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {col.missing_count.toLocaleString()} ({col.missing_pct}%)
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">0 (0%)</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-1 overflow-x-auto max-w-xs">
                          {col.sample_values?.slice(0, 3).map((val, vIdx) => (
                            <span
                              key={vIdx}
                              className="px-1.5 py-0.5 rounded bg-white text-slate-800 text-[10px] font-mono border border-slate-200 truncate shadow-sm"
                            >
                              {String(val)}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Data Preview Table */}
          {preview && (
            <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="text-sm font-bold text-black">Data Records Preview</h4>
                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-black shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-black shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 font-bold">
                      {preview.columns?.map((col: string) => (
                        <th key={col} className="py-2.5 px-3 font-mono text-[11px]">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedRows.map((row: any, rIdx: number) => (
                      <tr key={rIdx} className="hover:bg-slate-50/80">
                        {preview.columns?.map((col: string) => (
                          <td key={col} className="py-1.5 px-3 font-mono text-[11px] text-black truncate max-w-xs">
                            {row[col] === null ? (
                              <span className="text-slate-400 italic">null</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
