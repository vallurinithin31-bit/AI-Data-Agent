'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { DatasetMetadata, AnomalyDetectionResponse } from '@/types';
import { fetchAnomalies } from '@/lib/api';

interface AnomaliesViewProps {
  dataset: DatasetMetadata | null;
}

export default function AnomaliesView({ dataset }: AnomaliesViewProps) {
  const [anomalyData, setAnomalyData] = useState<AnomalyDetectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) return;
    setLoading(true);
    setError(null);

    fetchAnomalies(dataset.id)
      .then(setAnomalyData)
      .catch((err: any) => {
        setError(err.message || 'Failed to detect anomalies');
      })
      .finally(() => setLoading(false));
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl text-slate-600 shadow-sm font-medium">
        Please select a dataset to view Anomaly Detection.
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
              Risk & Integrity Audit
            </span>
            <span className="text-xs text-slate-600 font-mono font-medium">
              Multi-Model Anomaly Detection
            </span>
          </div>
          <h2 className="text-xl font-bold text-black tracking-tight">
            Anomaly Detection: {dataset.name}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Combines Z-score statistical tests, Interquartile Range (IQR) bounds, and scikit-learn Isolation Forests to isolate severe deviations.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">Anomaly Agent running Isolation Forest & multi-model bounds...</p>
        </div>
      ) : error ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-6 text-center text-amber-800 text-xs shadow-sm">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
          <p className="font-bold">{error}</p>
        </div>
      ) : anomalyData ? (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 text-xs text-black font-medium leading-relaxed shadow-sm">
            {anomalyData.summary}
          </div>

          {/* Anomaly Table */}
          <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-black flex items-center justify-between">
              <span>Flagged Statistical Anomalies ({anomalyData.anomalies.length} Records)</span>
              <span className="text-xs font-semibold text-slate-500">
                Methods: {anomalyData.methods_used.join(' • ')}
              </span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Identifier</th>
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">Actual Value</th>
                    <th className="py-2.5 px-3">Expected Mean</th>
                    <th className="py-2.5 px-3">Deviation</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Diagnosis & Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {anomalyData.anomalies.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-semibold text-black font-mono text-[11px]">{item.key_identifier}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{item.metric_name}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-black">${item.actual_value.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">${item.expected_value.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span className={item.deviation_pct > 0 ? 'text-amber-700' : 'text-blue-700'}>
                          {item.deviation_pct > 0 ? `+${item.deviation_pct}%` : `${item.deviation_pct}%`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          item.severity === 'Critical'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : item.severity === 'High'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <p className="text-[11px] text-slate-800 leading-snug font-medium">{item.potential_cause}</p>
                        <span className="text-[10px] text-black font-bold block mt-0.5">{item.recommendation}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
