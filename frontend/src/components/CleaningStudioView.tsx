'use client';

import React, { useState, useEffect } from 'react';
import { Wand2, Check, X, ShieldAlert, Sparkles, RefreshCw, CheckCircle2, Code2 } from 'lucide-react';
import { DatasetMetadata, CleaningPlan, CleaningAction } from '@/types';
import { fetchCleaningPlan, applyCleaningPlan } from '@/lib/api';

interface CleaningStudioViewProps {
  dataset: DatasetMetadata | null;
  onDatasetUpdated: (cleanMeta: DatasetMetadata) => void;
}

export default function CleaningStudioView({ dataset, onDatasetUpdated }: CleaningStudioViewProps) {
  const [plan, setPlan] = useState<CleaningPlan | null>(null);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) return;
    setLoading(true);
    fetchCleaningPlan(dataset.id)
      .then((data) => {
        setPlan(data);
        // By default, pre-select all actions for convenience
        setSelectedActionIds(data.actions.map(a => a.id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dataset]);

  const toggleAction = (id: string) => {
    setSelectedActionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleApplyCleaning = async () => {
    if (!dataset || selectedActionIds.length === 0) return;
    setApplying(true);
    try {
      const cleanMeta = await applyCleaningPlan(dataset.id, selectedActionIds);
      setSuccessMessage(`Dataset successfully cleaned! Created "${cleanMeta.name}" with ${cleanMeta.row_count.toLocaleString()} rows.`);
      onDatasetUpdated(cleanMeta);
    } catch (err: any) {
      alert(`Cleaning error: ${err.message || 'Operation failed'}`);
    } finally {
      setApplying(false);
    }
  };

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl text-slate-600 shadow-sm font-medium">
        Please select a dataset to access the Data Cleaning Studio.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-slate-100/90 border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-sm">
              Autonomous Data Cleaner
            </span>
            <span className="text-xs text-slate-600 font-mono font-medium">
              Non-Destructive Execution
            </span>
          </div>
          <h2 className="text-xl font-bold text-black tracking-tight">
            Data Cleaning Studio: {dataset.name}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Review and approve individual cleaning transformations before committing. The original dataset remains untouched.
          </p>
        </div>

        <button
          onClick={handleApplyCleaning}
          disabled={applying || selectedActionIds.length === 0}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-black hover:from-black hover:to-slate-900 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all shrink-0 border border-black"
        >
          {applying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating Clean Dataset...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Apply {selectedActionIds.length} Approved Action(s)
            </>
          )}
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Cleaning Plan Pipeline */}
      {loading ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">Data Cleaning Agent synthesizing remediation plan...</p>
        </div>
      ) : plan ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span>
              Generated <strong className="text-black font-bold">{plan.total_actions}</strong> recommended actions
            </span>
            <div className="flex items-center gap-3 font-semibold">
              <button
                onClick={() => setSelectedActionIds(plan.actions.map(a => a.id))}
                className="text-black hover:underline"
              >
                Approve All
              </button>
              <span>•</span>
              <button
                onClick={() => setSelectedActionIds([])}
                className="text-slate-500 hover:underline"
              >
                Reject All
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {plan.actions.map((action, idx) => {
              const isSelected = selectedActionIds.includes(action.id);
              return (
                <div
                  key={action.id}
                  onClick={() => toggleAction(action.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                    isSelected
                      ? 'bg-gradient-to-br from-white via-slate-50 to-slate-100/80 border-slate-400'
                      : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                        isSelected
                          ? 'bg-slate-900 border-black text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-black uppercase tracking-wider">
                            {action.action_type.replace('_', ' ')}
                          </span>
                          {action.column && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                              column: {action.column}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 mb-2 leading-relaxed font-medium">
                          {action.reason}
                        </p>
                        <div className="p-2 rounded-lg bg-white border border-slate-200 text-black font-mono text-[11px] flex items-center gap-2 shadow-sm">
                          <Code2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{action.suggested_code}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border shrink-0 ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {isSelected ? 'Approved' : 'Rejected'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
