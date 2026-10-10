'use client';

import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { DatasetMetadata, SegmentationResponse } from '@/types';
import { fetchSegmentation } from '@/lib/api';
import DynamicChart from './DynamicChart';

interface SegmentationViewProps {
  dataset: DatasetMetadata | null;
}

export default function SegmentationView({ dataset }: SegmentationViewProps) {
  const [segData, setSegData] = useState<SegmentationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) return;
    setLoading(true);
    setError(null);

    fetchSegmentation(dataset.id)
      .then(setSegData)
      .catch((err: any) => {
        setError(err.message || 'Failed to compute customer segments');
      })
      .finally(() => setLoading(false));
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl text-slate-600 shadow-sm font-medium">
        Please select a dataset to view Customer Segmentation.
      </div>
    );
  }

  const chartConfig = segData ? {
    chart_type: 'donut',
    title: 'Customer Segment Distribution',
    description: 'Proportion of accounts across RFM behavioral clusters.',
    data: segData.segments.map((s) => ({
      name: s.segment_name,
      value: s.customer_count,
    }))
  } : null;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-slate-100/90 border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-sm">
              Customer Intelligence
            </span>
            <span className="text-xs text-slate-600 font-mono font-medium">
              RFM & K-Means Clustering
            </span>
          </div>
          <h2 className="text-xl font-bold text-black tracking-tight">
            Customer Segmentation: {dataset.name}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Classifies accounts into Champions, Loyalists, At Risk, and Lost segments based on recency, frequency, and monetary spend.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">Segmentation Agent computing RFM quintiles and cluster centroids...</p>
        </div>
      ) : error ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-6 text-center text-amber-800 text-xs shadow-sm">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
          <p className="font-bold">{error}</p>
          <p className="text-slate-600 mt-1">
            Requires customer ID, transaction date, and revenue/amount numerical columns.
          </p>
        </div>
      ) : segData ? (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 text-xs text-black font-medium leading-relaxed shadow-sm">
            {segData.summary}
          </div>

          {/* Donut Chart */}
          {chartConfig && <DynamicChart config={chartConfig} />}

          {/* Segment Profiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segData.segments.map((seg, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs font-bold text-black">{seg.segment_name}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                      {seg.percentage}% of base
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-3">{seg.description}</p>

                  <div className="space-y-1.5 p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono shadow-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Accounts:</span>
                      <span className="text-black font-bold">{seg.customer_count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Avg Spend:</span>
                      <span className="text-black font-bold">${seg.avg_monetary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Avg Recency:</span>
                      <span className="text-black font-bold">{seg.avg_recency} days</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px]">
                  <span className="text-slate-700 font-bold block mb-1">Tailored Playbook:</span>
                  <div className="flex flex-wrap gap-1">
                    {seg.key_traits.map((t, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 rounded bg-white text-slate-800 text-[10px] border border-slate-200 font-medium shadow-sm"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
