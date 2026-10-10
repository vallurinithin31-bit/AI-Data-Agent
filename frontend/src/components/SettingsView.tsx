'use client';

import React, { useState } from 'react';
import { Settings, Key, ShieldCheck, CheckCircle2, Sparkles, Server } from 'lucide-react';
import { saveGeminiKey } from '@/lib/api';

export default function SettingsView() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveGeminiKey(apiKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to update API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-black flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-900" />
            System & LLM Configuration
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Configure Google Gemini API keys or inspect active execution engines.
          </p>
        </div>

        {/* Gemini API Key Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-slate-200">
          <div>
            <label className="text-xs font-bold text-black block mb-1">
              Google Gemini API Key (Optional)
            </label>
            <p className="text-[11px] text-slate-600 mb-2 font-medium">
              If left blank, the system automatically uses its autonomous local multi-agent statistical reasoning engine with 100% calculation grounding.
            </p>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white border border-slate-300 focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-black placeholder-slate-400 focus:outline-none shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-black hover:from-black hover:to-slate-900 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 border border-black"
            >
              <Key className="w-3.5 h-3.5" />
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>

            {saved && (
              <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Updated Successfully
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Engine Status Card */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-black flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-600" />
          Active Agent Architecture Status
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">SQL Analytics</span>
            <span className="text-emerald-700 font-bold font-mono">DuckDB In-Memory (Online)</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Execution Sandbox</span>
            <span className="text-emerald-700 font-bold font-mono">Restricted Python AST (Sandboxed)</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Modeling Engine</span>
            <span className="text-emerald-700 font-bold font-mono">Statsmodels & Scikit-Learn</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Validation Gate</span>
            <span className="text-emerald-700 font-bold font-mono">Ground-Truth Audit (Zero-Hallucination)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
