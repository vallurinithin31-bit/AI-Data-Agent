'use client';

import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend
} from 'recharts';
import { Download } from 'lucide-react';
import { VisualizationConfig } from '@/types';

interface DynamicChartProps {
  config: VisualizationConfig;
}

// Executive High-Contrast Color Palette
const PALETTE = [
  '#0F172A', // Slate 900 Charcoal
  '#2563EB', // Royal Blue
  '#7C3AED', // Vivid Violet
  '#059669', // Emerald
  '#D97706', // Amber Gold
  '#DB2777', // Rose Pink
  '#0891B2', // Cyan
  '#4F46E5', // Indigo
  '#0D9488', // Teal
  '#475569'  // Steel Slate
];

export default function DynamicChart({ config }: DynamicChartProps) {
  const { chart_type, title, description, x_axis, y_axis, series_keys, data } = config;

  if (!data || data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-6 text-center text-slate-500 shadow-sm">
        <p className="text-sm font-medium">No data points available to render visualization.</p>
      </div>
    );
  }

  // Export CSV
  const handleDownloadCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderChartContent = () => {
    switch (chart_type.toLowerCase()) {
      case 'bar':
        const barKey = y_axis || (series_keys && series_keys[0]) || Object.keys(data[0])[1];
        const barX = x_axis || Object.keys(data[0])[0];
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey={barX} stroke="#475569" fontSize={11} tickLine={false} interval={0} angle={-15} textAnchor="end" />
              <YAxis stroke="#475569" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '8px', color: '#000000', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey={barKey} fill="#0F172A" radius={[6, 6, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        const lineX = x_axis || 'date';
        const linesToRender = (series_keys && series_keys.length > 0) ? series_keys : [y_axis || Object.keys(data[0])[1]];
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey={lineX} stroke="#475569" fontSize={11} tickLine={false} angle={-15} textAnchor="end" />
              <YAxis stroke="#475569" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '8px', color: '#000000', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {linesToRender.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: PALETTE[i % PALETTE.length] }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        const areaX = x_axis || Object.keys(data[0])[0];
        const areaY = y_axis || Object.keys(data[0])[1];
        return (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F172A" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey={areaX} stroke="#475569" fontSize={11} />
              <YAxis stroke="#475569" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '8px', color: '#000000', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey={areaY} stroke="#0F172A" fillOpacity={1} fill="url(#areaGradient)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'donut':
      case 'pie':
        const nameKey = x_axis || Object.keys(data[0])[0];
        const valKey = y_axis || Object.keys(data[0])[1];
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '8px', color: '#000000', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Pie
                data={data}
                dataKey={valKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                innerRadius={chart_type === 'donut' ? 65 : 0}
                outerRadius={105}
                paddingAngle={4}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        const scatterX = x_axis || Object.keys(data[0])[0];
        const scatterY = y_axis || Object.keys(data[0])[1];
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey={scatterX} stroke="#475569" fontSize={11} name={scatterX} />
              <YAxis dataKey={scatterY} stroke="#475569" fontSize={11} name={scatterY} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '8px', color: '#000000', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <Scatter name="Points" data={data} fill="#0F172A" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'funnel':
        return (
          <div className="space-y-3 py-2">
            {data.map((item, idx) => {
              const maxUsers = data[0].users || 1;
              const widthPct = Math.max(12, Math.round((item.users / maxUsers) * 100));
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-black">{item.stage}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-mono">{Number(item.users).toLocaleString()} users</span>
                      <span className="text-black font-bold font-mono">{item.conversion_rate}%</span>
                      {idx > 0 && item.drop_off_rate > 0 && (
                        <span className="text-rose-700 text-[11px] font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          -{item.drop_off_rate}% drop
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 border border-slate-200 rounded-lg h-7 overflow-hidden p-0.5 flex items-center">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-slate-900 to-slate-700 flex items-center justify-end pr-2 transition-all duration-500 text-[10px] text-white font-extrabold shadow-sm"
                      style={{ width: `${widthPct}%` }}
                    >
                      {widthPct > 20 && `${item.conversion_rate}%`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'cohort':
        const periodKeys = series_keys || Object.keys(data[0]).filter(k => k !== 'cohort' && k !== 'size');
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700">
                  <th className="py-2.5 px-3 font-bold">Cohort</th>
                  <th className="py-2.5 px-3 font-bold">Size</th>
                  {periodKeys.map((pk) => (
                    <th key={pk} className="py-2.5 px-3 font-bold text-center">{pk}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-semibold text-black">{row.cohort}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{row.size}</td>
                    {periodKeys.map((pk) => {
                      const val = row[pk];
                      if (val === null || val === undefined) {
                        return <td key={pk} className="py-2 px-3 text-center text-slate-400">-</td>;
                      }
                      const intensity = Math.min(100, Math.max(0, val));
                      const bgOpacity = (intensity / 100) * 0.75 + 0.15;
                      return (
                        <td key={pk} className="py-2 px-3 text-center">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-sm"
                            style={{ backgroundColor: `rgba(15, 23, 42, ${bgOpacity})` }}
                          >
                            {val}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        const keys = Object.keys(data[0]).slice(0, 6);
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700">
                  {keys.map((k) => (
                    <th key={k} className="py-2.5 px-3 font-bold">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.slice(0, 8).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80">
                    {keys.map((k) => (
                      <td key={k} className="py-1.5 px-3 text-black font-mono text-[11px]">{String(row[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-xl p-4 shadow-sm transition-all">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-black">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-0.5 font-medium">{description}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownloadCSV}
            title="Download CSV dataset"
            className="p-1.5 rounded-lg bg-gradient-to-b from-white to-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-sm transition-colors text-xs flex items-center gap-1 font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>
      <div>{renderChartContent()}</div>
    </div>
  );
}
