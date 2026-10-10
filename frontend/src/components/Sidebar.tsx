'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Database, Sparkles, Filter, Users,
  Layers, TrendingUp, AlertTriangle, FileText, Settings,
  Wand2, ChevronRight, Activity, ChevronDown, Trash2, Check,
  X, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { DatasetMetadata } from '@/types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  datasets: DatasetMetadata[];
  selectedDataset: DatasetMetadata | null;
  onSelectDataset: (d: DatasetMetadata) => void;
  onDeleteDataset?: (id: string) => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  datasets,
  selectedDataset,
  onSelectDataset,
  onDeleteDataset
}: SidebarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'datasets', label: 'Datasets & Profiling', icon: Database, badge: datasets.length },
    { id: 'cleaning', label: 'Data Cleaning Studio', icon: Wand2 },
    { id: 'chat', label: 'AI Data Analyst', icon: Sparkles, glow: true },
    { id: 'funnel', label: 'Funnel Analysis', icon: Filter },
    { id: 'cohort', label: 'Cohort & Retention', icon: Layers },
    { id: 'segmentation', label: 'Customer Segments', icon: Users },
    { id: 'forecasting', label: 'Predictive Forecast', icon: TrendingUp },
    { id: 'anomalies', label: 'Anomaly Detection', icon: AlertTriangle },
    { id: 'reports', label: 'Executive Reports', icon: FileText },
    { id: 'settings', label: 'System & LLM Settings', icon: Settings },
  ];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setDeleteConfirmId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmId === id) {
      if (onDeleteDataset) {
        onDeleteDataset(id);
      }
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-white via-slate-50 to-slate-100/90 border-r border-slate-200 flex flex-col h-screen select-none shrink-0 relative shadow-sm">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 via-slate-800 to-black flex items-center justify-center shadow-md shadow-slate-900/15 border border-slate-700">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-black flex items-center gap-1.5">
              AI Data Analyst
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white">
                Agent
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Autonomous SaaS Platform</p>
          </div>
        </div>
      </div>

      {/* Dataset Context Bar with Custom Manage & Delete Dropdown */}
      <div className="p-3 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/70 relative" ref={dropdownRef}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
            Active Dataset Context
          </label>
          <span className="text-[10px] text-slate-500 font-mono">
            {datasets.length} files
          </span>
        </div>

        {/* Selected Dataset Trigger */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(prev => !prev);
              setDeleteConfirmId(null);
            }}
            className="flex-1 bg-gradient-to-b from-white to-slate-50 hover:from-slate-50 hover:to-slate-100 border border-slate-300 text-xs text-black rounded-xl px-2.5 py-2 flex items-center justify-between transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-800 truncate text-left"
          >
            <div className="truncate pr-1">
              {selectedDataset ? (
                <>
                  <div className="font-bold text-black truncate text-xs">
                    {selectedDataset.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {selectedDataset.row_count.toLocaleString()} rows • {selectedDataset.file_type.toUpperCase()}
                  </div>
                </>
              ) : (
                <span className="text-slate-500">Select a dataset...</span>
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180 text-black' : ''}`} />
          </button>

          {/* Quick Active Dataset Delete Button */}
          {selectedDataset && onDeleteDataset && (
            <button
              type="button"
              onClick={(e) => handleDelete(e, selectedDataset.id)}
              title={deleteConfirmId === selectedDataset.id ? "Confirm delete file" : "Delete active file"}
              className={`p-2 rounded-xl border transition-colors shrink-0 shadow-sm ${
                deleteConfirmId === selectedDataset.id
                  ? 'bg-rose-50 text-rose-600 border-rose-400 animate-pulse'
                  : 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-300 hover:border-rose-300'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Floating Custom Dropdown Menu with Per-File Delete Options */}
        {isDropdownOpen && (
          <div className="absolute left-3 right-3 top-full mt-1.5 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 max-h-72 overflow-y-auto space-y-1">
            <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 flex items-center justify-between">
              <span>Manage Existing Files</span>
              <span>Click trash to delete</span>
            </div>

            {datasets.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">
                No datasets uploaded.
              </div>
            ) : (
              datasets.map((d) => {
                const isSelected = selectedDataset?.id === d.id;
                const isConfirming = deleteConfirmId === d.id;

                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      onSelectDataset(d);
                      setIsDropdownOpen(false);
                      setDeleteConfirmId(null);
                    }}
                    className={`p-2 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="truncate pr-2 flex-1">
                      <div className="font-semibold text-xs flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white' : 'bg-slate-400'}`}></span>
                        <span className="truncate">{d.name}</span>
                      </div>
                      <div className={`text-[10px] font-mono ml-3 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {d.row_count.toLocaleString()} rows • {d.column_count} cols
                      </div>
                    </div>

                    {/* Delete Option for this file */}
                    {onDeleteDataset && (
                      <div className="shrink-0 flex items-center gap-1">
                        {isConfirming ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, d.id)}
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-sm transition-colors"
                              title="Confirm Delete"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelDelete}
                              className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, d.id)}
                            className={`p-1.5 rounded-md transition-colors ${
                              isSelected
                                ? 'text-slate-300 hover:text-rose-300 hover:bg-white/10'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={`Delete ${d.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {selectedDataset && (
          <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 px-1">
            <span>{selectedDataset.column_count} columns</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Ready
            </span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-slate-900 to-black text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-black'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-white'
                      : item.glow
                      ? 'text-slate-900'
                      : 'text-slate-500 group-hover:text-black'
                  }`}
                />
                <span>
                  {item.label}
                </span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                  isActive ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
              {item.glow && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white text-black' : 'bg-slate-900 text-white'
                }`}>
                  AI
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-200 text-xs text-slate-600 bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-[11px] text-slate-800 font-medium">FastAPI & DuckDB Online</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">v1.0.0</span>
      </div>
    </aside>
  );
}
