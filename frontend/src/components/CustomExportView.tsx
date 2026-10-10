'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet, Sparkles, Download, ArrowRight, ArrowLeft,
  CheckCircle2, AlertTriangle, XCircle, Filter, ArrowUpDown,
  Layers, ShieldCheck, Database, RefreshCw, ChevronLeft,
  ChevronRight, Search, Eye, HelpCircle, Check, Info, Sliders,
  Trash2, Plus, Copy
} from 'lucide-react';
import {
  DatasetMetadata, CustomExportRequest, CustomExportPreview,
  ParsedPromptResult, CellValidationInfo
} from '@/types';
import { generateCustomExport, parseExportPrompt, getExportDownloadUrl } from '@/lib/api';

interface CustomExportViewProps {
  dataset: DatasetMetadata | null;
  datasets?: DatasetMetadata[];
  onSelectDataset?: (d: DatasetMetadata) => void;
}

export default function CustomExportView({
  dataset,
  datasets = [],
  onSelectDataset
}: CustomExportViewProps) {
  // Request parameters state
  const [prompt, setPrompt] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deduplicate, setDeduplicate] = useState<boolean>(false);
  const [rowLimit, setRowLimit] = useState<number | undefined>(undefined);
  const [separateUnverified, setSeparateUnverified] = useState<boolean>(false);

  // Execution & results state
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<CustomExportPreview | null>(null);
  const [parseExplanation, setParseExplanation] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Table preview search & pagination
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [previewPage, setPreviewPage] = useState<number>(1);
  const pageSize = 12;

  // Sync available columns when dataset changes
  useEffect(() => {
    if (dataset && dataset.columns) {
      const allCols = dataset.columns.map(c => c.name);
      setSelectedColumns(allCols);
      setPreviewData(null);
      setErrorMsg(null);
      setParseExplanation(null);
    }
  }, [dataset]);

  const availableCols = useMemo(() => {
    return dataset?.columns?.map(c => c.name) || [];
  }, [dataset]);

  // Prompt suggestion chips
  const promptSuggestions = [
    {
      label: 'AP Colleges Directory',
      text: 'Give me 50 colleges in sequence: College/University Name, District, Contact Person Name, Phone Number, Email Address, Response. Sort by District asc. Highlight missing in red.'
    },
    {
      label: 'Executive Contact List',
      text: 'Arrange in sequence: Contact Person Name, Designation, School / Department, Phone Number, Email Address. Exclude duplicate records.'
    },
    {
      label: 'Response & Outreach',
      text: 'Give me colleges in sequence: College/University Name, Response, District, Phone Number. Sort by Response asc.'
    },
    {
      label: 'Verified Decision Makers',
      text: 'Sequence: College/University Name, Contact Person Name, Email Address, Phone Number. Green for verified, Yellow for unverified, Red for missing.'
    }
  ];

  // Column Sequencer controls
  const moveColumn = (index: number, direction: 'left' | 'right') => {
    const newCols = [...selectedColumns];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCols.length) return;
    const temp = newCols[index];
    newCols[index] = newCols[targetIndex];
    newCols[targetIndex] = temp;
    setSelectedColumns(newCols);
  };

  const removeColumn = (colName: string) => {
    setSelectedColumns(prev => prev.filter(c => c !== colName));
  };

  const addColumn = (colName: string) => {
    if (!selectedColumns.includes(colName)) {
      setSelectedColumns(prev => [...prev, colName]);
    }
  };

  const resetAllColumns = () => {
    setSelectedColumns(availableCols);
  };

  // AI Prompt Parsing
  const handleAutoParsePrompt = async () => {
    if (!dataset || !prompt.trim()) return;
    setIsParsing(true);
    setErrorMsg(null);
    try {
      const result: ParsedPromptResult = await parseExportPrompt(dataset.id, prompt);
      if (result.column_sequence && result.column_sequence.length > 0) {
        setSelectedColumns(result.column_sequence);
      }
      if (result.sort_column) {
        setSortColumn(result.sort_column);
        setSortDirection(result.sort_direction as 'asc' | 'desc');
      }
      if (result.deduplicate !== undefined) {
        setDeduplicate(result.deduplicate);
      }
      if (result.row_limit) {
        setRowLimit(result.row_limit);
      }
      setParseExplanation(result.summary_explanation);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse natural language instructions');
    } finally {
      setIsParsing(false);
    }
  };

  // Generate Export
  const handleGenerateExport = async () => {
    if (!dataset) return;
    if (selectedColumns.length === 0) {
      setErrorMsg('Please select at least one column in your sequence.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const req: CustomExportRequest = {
        dataset_id: dataset.id,
        natural_language_prompt: prompt.trim() || undefined,
        column_sequence: selectedColumns,
        sort_column: sortColumn || undefined,
        sort_direction: sortDirection,
        deduplicate: deduplicate,
        row_limit: rowLimit,
        separate_unverified_sheet: separateUnverified
      };

      const result = await generateCustomExport(req);
      setPreviewData(result);
      setPreviewPage(1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate custom export');
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter preview rows by search
  const filteredPreviewRows = useMemo(() => {
    if (!previewData) return [];
    if (!previewSearch.trim()) return previewData.preview_rows;
    const q = previewSearch.toLowerCase();
    return previewData.preview_rows.filter(row => {
      return Object.values(row).some(v => String(v).toLowerCase().includes(q));
    });
  }, [previewData, previewSearch]);

  const totalPreviewPages = Math.ceil(filteredPreviewRows.length / pageSize) || 1;
  const paginatedPreviewRows = useMemo(() => {
    const start = (previewPage - 1) * pageSize;
    return filteredPreviewRows.slice(start, start + pageSize);
  }, [filteredPreviewRows, previewPage, pageSize]);

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl shadow-sm">
        <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-black mb-1">No Active Dataset Selected</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please upload or choose a dataset from the sidebar to launch Custom Data Request & Excel Export.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-slate-100/90 border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-sm flex items-center gap-1">
              <FileSpreadsheet className="w-3 h-3 text-white" />
              Custom Data Engine
            </span>
            <span className="text-xs text-slate-600 font-medium">
              Source: <strong className="text-black">{dataset.name}</strong> ({dataset.row_count} records)
            </span>
          </div>
          <h2 className="text-xl font-bold text-black tracking-tight">
            Custom Data Request & Sequential Excel Export
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Request any specific data using natural language, lock in your exact column sequence, enforce data validation, and export a professional color-coded multi-sheet Excel workbook.
          </p>
        </div>

        {datasets.length > 1 && onSelectDataset && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Switch Source:</span>
            <select
              value={dataset.id}
              onChange={(e) => {
                const found = datasets.find(d => d.id === e.target.value);
                if (found) onSelectDataset(found);
              }}
              className="bg-white border border-slate-300 text-black text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10 shadow-sm"
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.row_count} rows)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Request Form & Configuration Card */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Section 1: Natural Language Request */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-black" />
              1. Describe The Data You Need (Natural Language)
            </label>
            <span className="text-[11px] text-slate-500">
              The agent strictly follows your requested columns and sequence
            </span>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Give me 50 colleges in Andhra Pradesh with name, district, contact person, phone number, email, and response. Arrange columns in this exact sequence: College Name, District, Contact Person, Phone, Email, Response. Sort by District. Highlight missing in red."
              className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all shadow-sm leading-relaxed"
            />
            {prompt.trim() && (
              <button
                onClick={handleAutoParsePrompt}
                disabled={isParsing}
                className="absolute right-3 bottom-3 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 disabled:opacity-50"
              >
                {isParsing ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-white" />
                )}
                Auto-Parse Instructions
              </button>
            )}
          </div>

          {/* Quick Prompt Templates */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-semibold mr-1">Sample Queries:</span>
            {promptSuggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(item.text);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] rounded-lg transition-colors font-medium shadow-2xs"
              >
                {item.label}
              </button>
            ))}
          </div>

          {parseExplanation && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-black flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-emerald-950">Instructions Understood & Applied:</span>
                <span className="text-slate-700">{parseExplanation}</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Exact Column Sequence Editor */}
        <div className="pt-4 border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <label className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-black" />
                2. Exact Column Sequence Specification ({selectedColumns.length} Columns)
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                The generated Excel workbook will place columns from left to right in this <strong>exact sequence</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetAllColumns}
                className="text-[11px] text-slate-600 hover:text-black underline font-medium"
              >
                Reset to All Columns
              </button>
            </div>
          </div>

          {/* Selected Columns Sequence Strip */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl min-h-[64px] flex flex-wrap items-center gap-2 shadow-inner">
            {selectedColumns.length === 0 ? (
              <span className="text-xs text-slate-400 italic">
                No columns selected. Click columns below to add them to your sequence.
              </span>
            ) : (
              selectedColumns.map((colName, idx) => (
                <div
                  key={colName}
                  className="bg-gradient-to-r from-slate-900 to-black text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs group"
                >
                  <span className="text-[10px] text-slate-300 font-mono font-normal">
                    #{idx + 1}
                  </span>
                  <span className="truncate max-w-[180px]" title={colName}>
                    {colName}
                  </span>

                  <div className="flex items-center gap-1 text-slate-300">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveColumn(idx, 'left')}
                      className="hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
                      title="Move Left in Sequence"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === selectedColumns.length - 1}
                      onClick={() => moveColumn(idx, 'right')}
                      className="hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
                      title="Move Right in Sequence"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeColumn(colName)}
                      className="hover:text-rose-400 transition-colors p-0.5 ml-0.5"
                      title="Remove Column"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Available Columns Pills */}
          {availableCols.length > selectedColumns.length && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-semibold mr-1">Available to add:</span>
              {availableCols
                .filter(c => !selectedColumns.includes(c))
                .map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => addColumn(c)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 text-[11px] rounded-md transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    {c}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Section 3: Sorting, Deduplication, Limits & Sheet Settings */}
        <div className="pt-4 border-t border-slate-200/80">
          <label className="text-xs font-bold text-black uppercase tracking-wider block mb-3">
            3. Data Processing & Excel Formatting Preferences
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Sorting */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-600 block">Row Sorting</span>
              <select
                value={sortColumn}
                onChange={(e) => setSortColumn(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-black text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="">Default (No Sorting)</option>
                {selectedColumns.map(col => (
                  <option key={col} value={col}>
                    Sort by {col}
                  </option>
                ))}
              </select>

              {sortColumn && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSortDirection('asc')}
                    className={`flex-1 py-1 rounded text-[11px] font-bold border text-center transition-colors ${
                      sortDirection === 'asc' ? 'bg-slate-900 text-white border-black' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Ascending (A-Z)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortDirection('desc')}
                    className={`flex-1 py-1 rounded text-[11px] font-bold border text-center transition-colors ${
                      sortDirection === 'desc' ? 'bg-slate-900 text-white border-black' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Descending (Z-A)
                  </button>
                </div>
              )}
            </div>

            {/* Deduplication */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-600 block">Deduplication</span>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={deduplicate}
                  onChange={(e) => setDeduplicate(e.target.checked)}
                  className="w-4 h-4 rounded text-black border-slate-300 focus:ring-black"
                />
                <span className="text-xs font-semibold text-black">
                  Exclude Duplicate Records
                </span>
              </label>
              <p className="text-[10px] text-slate-500">
                Audits and eliminates identical observations across primary fields.
              </p>
            </div>

            {/* Row Limit */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-600 block">Record Volume Limit</span>
              <div className="flex items-center gap-1.5">
                {[25, 50, 100].map(lim => (
                  <button
                    key={lim}
                    type="button"
                    onClick={() => setRowLimit(rowLimit === lim ? undefined : lim)}
                    className={`flex-1 py-1 rounded text-[11px] font-bold border transition-colors ${
                      rowLimit === lim ? 'bg-slate-900 text-white border-black' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {lim}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRowLimit(undefined)}
                  className={`flex-1 py-1 rounded text-[11px] font-bold border transition-colors ${
                    rowLimit === undefined ? 'bg-slate-900 text-white border-black' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                {rowLimit ? `Capped at top ${rowLimit} records` : 'All available observations included'}
              </p>
            </div>

            {/* Sheet Options */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-600 block">Sheet Architecture</span>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={separateUnverified}
                  onChange={(e) => setSeparateUnverified(e.target.checked)}
                  className="w-4 h-4 rounded text-black border-slate-300 focus:ring-black"
                />
                <span className="text-xs font-semibold text-black">
                  Separate Unverified Sheet
                </span>
              </label>
              <p className="text-[10px] text-slate-500">
                Creates an extra Sheet 4 dedicated solely to items requiring review.
              </p>
            </div>
          </div>

          {/* Color Legend Rule Summary */}
          <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Dynamic Excel Color Palette Rules Enforced:
            </span>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-700 pt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-900 border border-blue-950 inline-block" />
                <strong>Navy Blue:</strong> Column Headers in exact sequence
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400 inline-block" />
                <strong>Soft Green:</strong> Verified & valid records
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-200 border border-amber-400 inline-block" />
                <strong>Soft Yellow:</strong> Unverified / Needs review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-200 border border-rose-400 inline-block" />
                <strong>Soft Red:</strong> Missing values & syntax errors
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block" />
                <strong>Zebra Shading:</strong> Alternating rows for clean scanning
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Generate Button */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleGenerateExport}
            disabled={isGenerating || selectedColumns.length === 0}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-black hover:from-black hover:to-slate-900 text-white text-xs font-bold shadow-md border border-black flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
                Validating & Generating Excel Workbook...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 text-white" />
                Generate Custom Data & Excel Workbook
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Results & Live Preview Section */}
      {previewData && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Executive Download & Success Banner */}
          <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/90 border border-slate-300/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-800 text-white shadow-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                  Workbook Generated
                </span>
                <span className="text-xs text-slate-600 font-mono font-medium">
                  {previewData.total_rows} Records • {previewData.column_sequence.length} Columns
                </span>
              </div>
              <h3 className="text-lg font-bold text-black tracking-tight">
                Data Successfully Extracted in Specified Sequence
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Multi-sheet workbook created with frozen headers, dynamic color conditioning, and full data-quality audits.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={getExportDownloadUrl(previewData.export_id)}
                download
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 hover:from-emerald-900 hover:to-emerald-800 text-white text-xs font-bold shadow-md border border-emerald-950 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <Download className="w-4 h-4 text-white" />
                Download Excel (.xlsx)
              </a>
            </div>
          </div>

          {/* Quality Audit Summary KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">Total Observations</span>
              <div className="text-xl font-bold text-black font-mono">
                {previewData.total_rows}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Across {previewData.column_sequence.length} sequential fields
              </span>
            </div>

            <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800">Quality Health Score</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-emerald-950 font-mono mt-1">
                {previewData.quality_summary.overall_quality_score}%
              </div>
              <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">
                {previewData.quality_summary.valid_cells_count} valid cells highlighted in Green
              </span>
            </div>

            <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-800">Unverified / Review</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-amber-950 font-mono mt-1">
                {previewData.quality_summary.unverified_records_count}
              </div>
              <span className="text-[10px] text-amber-700 mt-0.5 block font-medium">
                {previewData.quality_summary.warning_cells_count} cells flagged in Yellow
              </span>
            </div>

            <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-800">Missing / Errors</span>
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-xl font-bold text-rose-950 font-mono mt-1">
                {previewData.quality_summary.error_cells_count}
              </div>
              <span className="text-[10px] text-rose-700 mt-0.5 block font-medium">
                Missing required values highlighted in Red
              </span>
            </div>
          </div>

          {/* Live Color-Coded Preview Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Table Controls Bar */}
            <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-black" />
                  Live Color-Coded Spreadsheet Preview (Sheet 1 — Requested Data)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Showing actual cell-level color fills as rendered in the generated Excel file.
                </p>
              </div>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={previewSearch}
                  onChange={(e) => {
                    setPreviewSearch(e.target.value);
                    setPreviewPage(1);
                  }}
                  placeholder="Filter preview rows..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-black placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-900 text-white font-bold text-[11px]">
                    <th className="py-3 px-3 border-r border-blue-950 w-12 text-center">#</th>
                    {previewData.column_sequence.map((col, idx) => (
                      <th
                        key={col}
                        className="py-3 px-3 border-r border-blue-950 whitespace-nowrap"
                        title={`Sequence #${idx + 1}`}
                      >
                        <span className="text-[10px] text-blue-200 font-normal mr-1 font-mono">
                          #{idx + 1}
                        </span>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-black">
                  {paginatedPreviewRows.map((row, rIdx) => {
                    const originalRowIndex = (previewPage - 1) * pageSize + rIdx;
                    const rowMatrix = previewData.cell_validation_matrix[originalRowIndex] || {};

                    return (
                      <tr key={rIdx} className="hover:opacity-95 transition-opacity">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 bg-slate-50 border-r border-slate-200 text-center font-bold">
                          {originalRowIndex + 1}
                        </td>
                        {previewData.column_sequence.map(col => {
                          const val = row[col];
                          const cellStat = rowMatrix[col];
                          const status = cellStat?.status || 'valid';
                          const reason = cellStat?.reason || '';

                          let cellStyle = 'bg-white text-black';
                          if (status === 'error') {
                            cellStyle = 'bg-rose-100 text-rose-950 font-semibold border-rose-200';
                          } else if (status === 'warning') {
                            cellStyle = 'bg-amber-100 text-amber-950 border-amber-200';
                          } else if (status === 'valid') {
                            cellStyle = 'bg-emerald-50 text-emerald-950 border-emerald-100';
                          }

                          return (
                            <td
                              key={col}
                              className={`py-2 px-3 border-r border-slate-200 whitespace-nowrap max-w-[240px] truncate ${cellStyle}`}
                              title={`${val || '[Empty]'} (${reason})`}
                            >
                              {val ? String(val) : <span className="text-rose-500 italic">[Missing]</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPreviewPages > 1 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Showing <strong>{((previewPage - 1) * pageSize) + 1}</strong> to{' '}
                  <strong>{Math.min(previewPage * pageSize, filteredPreviewRows.length)}</strong> of{' '}
                  <strong>{filteredPreviewRows.length}</strong> rows
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    disabled={previewPage === 1}
                    className="p-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded">
                    Page {previewPage} of {totalPreviewPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewPage(p => Math.min(totalPreviewPages, p + 1))}
                    disabled={previewPage === totalPreviewPages}
                    className="p-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Generated Workbook Architecture Card */}
          <div className="p-4 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
            <span className="text-[11px] font-bold text-black uppercase tracking-wider block">
              Multi-Sheet Workbook Structure (.xlsx)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <span className="font-bold text-blue-900 block mb-0.5">Sheet 1: Requested Data</span>
                <p className="text-[11px] text-slate-600">
                  Exact sequential columns, frozen header, auto-filter, zebra striping, and cell-level color fills.
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <span className="font-bold text-blue-900 block mb-0.5">Sheet 2: Data Quality Report</span>
                <p className="text-[11px] text-slate-600">
                  Verification KPI table, column-by-column completeness percentages, and color legend.
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <span className="font-bold text-blue-900 block mb-0.5">Sheet 3: Sources & Methodology</span>
                <p className="text-[11px] text-slate-600">
                  Dataset metadata, retrieval timestamp, user prompt, and sequence verification trail.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
