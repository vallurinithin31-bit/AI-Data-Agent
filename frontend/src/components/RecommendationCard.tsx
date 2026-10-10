'use client';

import React from 'react';
import { ArrowUpRight, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { RecommendationItem } from '@/types';

interface RecommendationCardProps {
  rec: RecommendationItem;
  index: number;
}

export default function RecommendationCard({ rec, index }: RecommendationCardProps) {
  const isHigh = rec.priority === 'High';
  const isMed = rec.priority === 'Medium';

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
              isHigh
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : isMed
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              {rec.priority} Priority
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono font-medium">Action #{index + 1}</span>
        </div>

        <h4 className="text-xs font-bold text-black mb-1.5">{rec.title}</h4>
        <p className="text-[11px] text-slate-600 mb-3">{rec.reason}</p>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-200 text-[11px]">
        <div className="text-emerald-800 font-semibold flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span>Impact: {rec.expected_impact}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-gradient-to-b from-slate-50 to-slate-100/90 border border-slate-200 text-slate-900">
          <span className="text-black font-bold block mb-0.5">Recommended Next Action:</span>
          {rec.suggested_action}
        </div>
      </div>
    </div>
  );
}
