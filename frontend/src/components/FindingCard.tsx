'use client';

import React from 'react';
import { Lightbulb, ShieldCheck, AlertCircle } from 'lucide-react';
import { KeyFinding } from '@/types';

interface FindingCardProps {
  finding: KeyFinding;
  index: number;
}

export default function FindingCard({ finding, index }: FindingCardProps) {
  const isHighConf = finding.confidence === 'High';

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-slate-800">Key Finding</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            isHighConf
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {finding.confidence} Confidence
          </span>
        </div>
      </div>

      <p className="text-xs text-black font-semibold mb-3 leading-relaxed">
        {finding.finding}
      </p>

      <div className="space-y-2 pt-2 border-t border-slate-200 text-[11px]">
        <div className="flex items-center justify-between text-slate-600">
          <span className="font-medium">Supporting Metric:</span>
          <span className="font-mono font-bold text-black bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {finding.supporting_metric}
          </span>
        </div>
        <div className="text-slate-700">
          <span className="text-slate-900 font-bold">Business Impact: </span>
          {finding.business_impact}
        </div>
        {finding.limitations && (
          <div className="text-slate-500 text-[10px] italic flex items-center gap-1 pt-1">
            <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Limitation: {finding.limitations}</span>
          </div>
        )}
      </div>
    </div>
  );
}
