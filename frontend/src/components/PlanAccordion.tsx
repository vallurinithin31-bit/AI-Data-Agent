'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Clock, Cpu, ShieldCheck } from 'lucide-react';
import { AnalysisPlan } from '@/types';

interface PlanAccordionProps {
  plan: AnalysisPlan;
}

export default function PlanAccordion({ plan }: PlanAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl overflow-hidden mb-4 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gradient-to-r from-white to-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-900 text-white shadow-sm">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-black">
                Autonomous Analysis Plan ({plan.steps.length} Steps)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Executed
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Intent: <span className="font-bold text-black capitalize">{plan.intent}</span>
              {plan.execution_time_ms && (
                <span className="ml-2 font-mono text-[10px] text-slate-500 font-medium">
                  • {plan.execution_time_ms} ms
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="text-slate-600">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/60 space-y-2.5">
          {plan.steps.map((step) => (
            <div
              key={step.step_number}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-sm"
            >
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-sm">
                {step.step_number}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-black">{step.title}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {step.agent}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">{step.description}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
