'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Sparkles, Bot, User, Code2, AlertCircle, CheckCircle2,
  TrendingUp, ArrowRight, RefreshCw, Layers
} from 'lucide-react';
import { DatasetMetadata, AnalysisResponse } from '@/types';
import { runQueryAnalysis } from '@/lib/api';
import DynamicChart from './DynamicChart';
import FindingCard from './FindingCard';
import RecommendationCard from './RecommendationCard';
import PlanAccordion from './PlanAccordion';

interface AiChatViewProps {
  dataset: DatasetMetadata | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  response?: AnalysisResponse;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Analyze this dataset and give me the key insights",
  "Where are users dropping off in the funnel?",
  "Calculate retention and cohort performance",
  "Which factors influence revenue the most?",
  "Find anomalies in the metrics",
  "Identify customer segments using RFM"
];

export default function AiChatView({ dataset }: AiChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (dataset && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'agent',
          text: `Hello! I am your Autonomous Data Analyst Agent initialized on **${dataset.name}** (${dataset.row_count.toLocaleString()} rows, ${dataset.column_count} columns).\n\nI can perform deep exploratory analysis, funnel optimization, cohort retention, RFM clustering, predictive forecasting, and anomaly detection. Ask me any analytical question or click one of the suggested prompts below!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [dataset]);

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || !dataset || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsThinking(true);

    try {
      const response = await runQueryAnalysis(dataset.id, textToSend);

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: response.formatted_answer || 'Analysis executed successfully.',
        response: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: `I encountered an issue executing the analysis: ${err.message || 'Server connection failure'}. Please verify dataset integrity or try another query.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl text-slate-600 shadow-sm font-medium">
        Please select or upload a dataset to converse with the AI Data Analyst Agent.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-900 to-black flex items-center justify-center text-white shadow-sm border border-slate-700">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-black flex items-center gap-2">
              AI Data Analyst Agent
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Ground truth: {dataset.name} ({dataset.row_count.toLocaleString()} records)
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([])}
          className="text-xs text-slate-500 hover:text-black font-semibold transition-colors"
        >
          Clear History
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'agent' && (
              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-3xl space-y-3 ${
              msg.sender === 'user'
                ? 'bg-gradient-to-r from-slate-900 to-black text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs font-semibold shadow-sm'
                : 'bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl rounded-tl-sm p-5 text-xs text-black shadow-sm w-full'
            }`}>
              {/* Message Text with Simple Markdown Line formatting */}
              <div className="prose prose-xs max-w-none space-y-2 leading-relaxed text-black">
                {msg.text.split('\n\n').map((paragraph, pIdx) => (
                  <p key={pIdx} className="whitespace-pre-wrap">{paragraph}</p>
                ))}
              </div>

              {/* Agent Structured Artifacts (Plan, Chart, Findings, Recommendations) */}
              {msg.response && (
                <div className="space-y-4 pt-3 border-t border-slate-200">
                  {/* Analysis Plan Accordion */}
                  {msg.response.plan && (
                    <PlanAccordion plan={msg.response.plan} />
                  )}

                  {/* SQL or Code Execution Transparency */}
                  {msg.response.sql_query && (
                    <div className="p-3 rounded-lg bg-gradient-to-b from-slate-50 to-slate-100/90 border border-slate-200 text-[11px] font-mono text-slate-900">
                      <div className="flex items-center gap-1.5 text-slate-700 mb-1 font-sans font-bold">
                        <Code2 className="w-3.5 h-3.5 text-slate-900" />
                        Executed Safe DuckDB SQL Query:
                      </div>
                      <pre className="text-black overflow-x-auto p-2 bg-white rounded border border-slate-200">
                        {msg.response.sql_query}
                      </pre>
                    </div>
                  )}

                  {/* Interactive Dynamic Chart */}
                  {msg.response.visual && (
                    <DynamicChart config={msg.response.visual} />
                  )}

                  {/* Key Findings Grid */}
                  {msg.response.key_findings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Key Verifiable Findings ({msg.response.key_findings.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {msg.response.key_findings.map((finding, fIdx) => (
                          <FindingCard key={fIdx} finding={finding} index={fIdx} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actionable Recommendations */}
                  {msg.response.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-black" />
                        Actionable Recommendations ({msg.response.recommendations.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {msg.response.recommendations.map((rec, rIdx) => (
                          <RecommendationCard key={rIdx} rec={rec} index={rIdx} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[10px] text-slate-500 pt-1 text-right font-medium">
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 shrink-0 mt-0.5 border border-slate-300 shadow-sm">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-r from-white to-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-3 shadow-sm font-medium">
              <RefreshCw className="w-4 h-4 text-black animate-spin" />
              <span>Analyzing dataset, selecting analytical agents, and validating calculations...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Question Pills */}
      <div className="px-4 py-2 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendQuery(prompt)}
            disabled={isThinking}
            className="px-2.5 py-1 rounded-full bg-gradient-to-b from-white to-slate-50 hover:bg-slate-100 text-slate-800 hover:text-black border border-slate-200 hover:border-slate-400 text-[11px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 shadow-sm"
          >
            <Sparkles className="w-2.5 h-2.5 text-black" />
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-200 bg-gradient-to-b from-white to-slate-50 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={`Ask anything about ${dataset.name} (e.g. "What are the biggest drop-offs in the funnel?")`}
            disabled={isThinking}
            className="flex-1 bg-white border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl px-4 py-2.5 text-xs text-black placeholder-slate-400 focus:outline-none transition-colors shadow-sm"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isThinking}
            className="p-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-black hover:from-black hover:to-slate-900 disabled:opacity-40 text-white font-bold transition-all shadow-sm border border-black"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
