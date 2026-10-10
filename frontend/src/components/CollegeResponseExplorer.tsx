'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2, Phone, Mail, MapPin, User, Briefcase, Award,
  Search, Filter, Download, ExternalLink, Copy, Check,
  ChevronLeft, ChevronRight, X, PhoneCall, MailCheck, Eye,
  BarChart3, LayoutGrid, Table as TableIcon, Sparkles
} from 'lucide-react';
import { CollegeResponsesResult, CollegeResponseItem } from '@/types';

interface CollegeResponseExplorerProps {
  data: CollegeResponsesResult;
  datasetName: string;
}

export default function CollegeResponseExplorer({ data, datasetName }: CollegeResponseExplorerProps) {
  const [selectedResponse, setSelectedResponse] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [page, setPage] = useState<number>(1);
  const pageSize = viewMode === 'cards' ? 12 : 15;

  // Modal inspection
  const [activeCollege, setActiveCollege] = useState<CollegeResponseItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Filtered colleges list
  const filteredColleges = useMemo(() => {
    return data.institutions.filter((item) => {
      // Filter by standard response
      if (selectedResponse !== 'ALL' && item.response !== selectedResponse) {
        return false;
      }
      // Filter by category
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      // Filter by district
      if (selectedDistrict !== 'ALL' && item.district !== selectedDistrict) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.college_name.toLowerCase().includes(q);
        const matchesContact = item.contact_person.toLowerCase().includes(q);
        const matchesDistrict = item.district.toLowerCase().includes(q);
        const matchesDept = item.department.toLowerCase().includes(q);
        const matchesDesig = item.designation.toLowerCase().includes(q);
        const matchesPhone = item.phone.includes(q);
        const matchesEmail = item.email.toLowerCase().includes(q);
        const matchesResp = item.response.toLowerCase().includes(q) || item.raw_response.toLowerCase().includes(q);

        if (!matchesName && !matchesContact && !matchesDistrict && !matchesDept && !matchesDesig && !matchesPhone && !matchesEmail && !matchesResp) {
          return false;
        }
      }
      return true;
    });
  }, [data.institutions, selectedResponse, selectedCategory, selectedDistrict, searchQuery]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [selectedResponse, selectedCategory, selectedDistrict, searchQuery, viewMode]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredColleges.length / pageSize) || 1;
  const paginatedColleges = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredColleges.slice(start, start + pageSize);
  }, [filteredColleges, page, pageSize]);

  // CSV Export
  const exportToCSV = () => {
    if (filteredColleges.length === 0) return;

    const headers = [
      'College/University Name',
      'Response',
      'Raw Response',
      'Disposition Category',
      'District',
      'School / Department',
      'Designation',
      'Contact Person Name',
      'Phone Number',
      'Email Address',
      'NIRF Ranking',
      'QS Ranking'
    ];

    const rows = filteredColleges.map((c) => [
      `"${c.college_name.replace(/"/g, '""')}"`,
      `"${c.response.replace(/"/g, '""')}"`,
      `"${c.raw_response.replace(/"/g, '""')}"`,
      `"${c.category.replace(/"/g, '""')}"`,
      `"${c.district.replace(/"/g, '""')}"`,
      `"${c.department.replace(/"/g, '""')}"`,
      `"${c.designation.replace(/"/g, '""')}"`,
      `"${c.contact_person.replace(/"/g, '""')}"`,
      `"${c.phone.replace(/"/g, '""')}"`,
      `"${c.email.replace(/"/g, '""')}"`,
      `"${c.nirf_rank.replace(/"/g, '""')}"`,
      `"${c.qs_rank.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filterTag = selectedResponse !== 'ALL' ? selectedResponse.replace(/\s+/g, '_') : 'All_Colleges';
    link.setAttribute('download', `Colleges_${filterTag}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper badge color
  const getBadgeClass = (response: string) => {
    switch (response) {
      case 'Share Me The Details':
      case 'Interested':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Call Me Back (Busy)':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Not Interested':
      case 'College Is Closed':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'No Answer':
      case 'Switch Off':
      case 'Not Reachable':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusDot = (response: string) => {
    switch (response) {
      case 'Share Me The Details':
      case 'Interested':
        return 'bg-emerald-500';
      case 'Call Me Back (Busy)':
        return 'bg-amber-500';
      case 'Not Interested':
      case 'College Is Closed':
        return 'bg-rose-500';
      case 'No Answer':
      case 'Switch Off':
      case 'Not Reachable':
      default:
        return 'bg-slate-400';
    }
  };

  // Quick stats
  const positiveCount = data.responses_summary
    .filter(r => r.name === 'Share Me The Details' || r.name === 'Interested')
    .reduce((acc, curr) => acc + curr.count, 0);
  const callBackCount = data.responses_summary
    .filter(r => r.name === 'Call Me Back (Busy)')
    .reduce((acc, curr) => acc + curr.count, 0);
  const unreachableCount = data.responses_summary
    .filter(r => r.name === 'No Answer' || r.name === 'Switch Off' || r.name === 'Not Reachable')
    .reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-6" id="college-response-explorer">
      {/* Executive Explorer Header Panel */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-sm flex items-center gap-1">
                <Building2 className="w-3 h-3 text-white" />
                Response Intelligence
              </span>
              <span className="text-xs text-slate-600 font-medium">
                {data.total_institutions} Institutions Tracked
              </span>
            </div>
            <h2 className="text-xl font-bold text-black tracking-tight flex items-center gap-2">
              College Outreach & Response Directory
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Filter and inspect individual college details, key decision makers, department heads, contact information, and follow-up status based on the responses recorded.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={exportToCSV}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-white to-slate-50 hover:bg-slate-100 text-black text-xs font-semibold border border-slate-300 shadow-sm transition-all flex items-center gap-1.5"
              title="Download currently filtered institutions as CSV"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              Export CSV ({filteredColleges.length})
            </button>

            <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-300 shadow-inner">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'cards'
                    ? 'bg-white text-black shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-black'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-white text-black shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-black'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Executive Metric Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Total Tracked Colleges</span>
            <div className="text-xl font-bold text-black font-mono">
              {data.total_institutions}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Across {data.districts.length} Andhra Pradesh districts
            </span>
          </div>

          <div
            onClick={() => { setSelectedResponse('ALL'); setSelectedCategory('Positive & Interested'); }}
            className="bg-white border border-emerald-200/90 rounded-xl p-3.5 shadow-sm cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800">Share Details & Interested</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
            </div>
            <div className="text-xl font-bold text-emerald-950 font-mono mt-1">
              {positiveCount} <span className="text-xs font-normal text-emerald-700">({((positiveCount / (data.total_institutions || 1)) * 100).toFixed(1)}%)</span>
            </div>
            <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">
              Click to view positive outreach leads
            </span>
          </div>

          <div
            onClick={() => { setSelectedResponse('Call Me Back (Busy)'); }}
            className="bg-white border border-amber-200/90 rounded-xl p-3.5 shadow-sm cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800">Callback / Discussion</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 group-hover:scale-125 transition-transform" />
            </div>
            <div className="text-xl font-bold text-amber-950 font-mono mt-1">
              {callBackCount} <span className="text-xs font-normal text-amber-700">({((callBackCount / (data.total_institutions || 1)) * 100).toFixed(1)}%)</span>
            </div>
            <span className="text-[10px] text-amber-700 mt-0.5 block font-medium">
              Click to filter follow-up calls
            </span>
          </div>

          <div
            onClick={() => { setSelectedResponse('No Answer'); }}
            className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm cursor-pointer hover:border-slate-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">No Answer / Unreachable</span>
              <span className="w-2 h-2 rounded-full bg-slate-400 group-hover:scale-125 transition-transform" />
            </div>
            <div className="text-xl font-bold text-black font-mono mt-1">
              {unreachableCount} <span className="text-xs font-normal text-slate-500">({((unreachableCount / (data.total_institutions || 1)) * 100).toFixed(1)}%)</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">
              Click to review retry pool
            </span>
          </div>
        </div>
      </div>

      {/* Response Category Filter Pills & Search Controls */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Top Filters Row: Search and District */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by college, contact person, phone, email, district, or role..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="appearance-none bg-white border border-slate-300 text-black text-xs font-semibold rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black shadow-sm cursor-pointer"
              >
                <option value="ALL">All Districts ({data.districts.length})</option>
                {data.districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {(selectedResponse !== 'ALL' || selectedCategory !== 'ALL' || selectedDistrict !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedResponse('ALL');
                  setSelectedCategory('ALL');
                  setSelectedDistrict('ALL');
                  setSearchQuery('');
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-black text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                title="Reset all active filters"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Response Filter Pills Strip */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <Filter className="w-3 h-3 text-black" />
              Filter by Recorded Response:
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-black">{filteredColleges.length}</strong> of {data.total_institutions} colleges
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => {
                setSelectedResponse('ALL');
                setSelectedCategory('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 shadow-sm ${
                selectedResponse === 'ALL' && selectedCategory === 'ALL'
                  ? 'bg-black text-white border-black ring-2 ring-black/10'
                  : 'bg-white text-black border-slate-200 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <span>All Responses</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedResponse === 'ALL' && selectedCategory === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-black'
              }`}>
                {data.total_institutions}
              </span>
            </button>

            {data.responses_summary.map((resp) => {
              const isSelected = selectedResponse === resp.name;
              return (
                <button
                  key={resp.name}
                  onClick={() => {
                    setSelectedResponse(isSelected ? 'ALL' : resp.name);
                    setSelectedCategory('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 shadow-sm ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-black/20'
                      : 'bg-white text-black border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${getStatusDot(resp.name)}`} />
                  <span>{resp.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 text-slate-800 font-mono'
                  }`}>
                    {resp.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Results Container: Cards or Table */}
      {filteredColleges.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-black mb-1">No colleges match the selected filter criteria</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Try adjusting your search keywords, resetting the response filter pill, or clearing the district filter.
          </p>
          <button
            onClick={() => {
              setSelectedResponse('ALL');
              setSelectedCategory('ALL');
              setSelectedDistrict('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedColleges.map((college) => (
            <div
              key={college.id}
              onClick={() => setActiveCollege(college)}
              className="bg-gradient-to-br from-white via-slate-50 to-slate-100/70 border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div>
                {/* Card Top: Response Badge & District */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shadow-xs flex items-center gap-1.5 ${getBadgeClass(college.response)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(college.response)}`} />
                    {college.response}
                  </span>

                  {college.district && (
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {college.district}
                    </span>
                  )}
                </div>

                {/* College Title */}
                <h3 className="text-sm font-bold text-black leading-snug line-clamp-2 group-hover:text-slate-900 transition-colors mb-3">
                  {college.college_name}
                </h3>

                {/* Contact Person & Role Details */}
                <div className="space-y-1.5 bg-white/90 border border-slate-200/70 rounded-xl p-3 mb-3 text-xs">
                  <div className="flex items-start gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-black block">
                        {college.contact_person || 'Not Specified / General Office'}
                      </span>
                      {college.designation && (
                        <span className="text-[11px] text-slate-600 block">
                          {college.designation}
                        </span>
                      )}
                    </div>
                  </div>

                  {college.department && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                      <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{college.department}</span>
                    </div>
                  )}
                </div>

                {/* Contact Direct Actions */}
                <div className="space-y-1.5 text-xs">
                  {college.phone ? (
                    <div
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-2xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={`tel:${college.phone}`}
                        className="text-xs font-semibold text-black hover:underline flex items-center gap-1.5 truncate"
                      >
                        <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{college.phone}</span>
                      </a>
                      <button
                        onClick={() => handleCopy(college.phone, `phone-${college.id}`)}
                        className="p-1 text-slate-400 hover:text-black transition-colors rounded"
                        title="Copy Phone Number"
                      >
                        {copiedField === `phone-${college.id}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ) : null}

                  {college.email ? (
                    <div
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-2xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={`mailto:${college.email}`}
                        className="text-[11px] font-semibold text-slate-800 hover:underline flex items-center gap-1.5 truncate"
                      >
                        <Mail className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">{college.email}</span>
                      </a>
                      <button
                        onClick={() => handleCopy(college.email, `email-${college.id}`)}
                        className="p-1 text-slate-400 hover:text-black transition-colors rounded shrink-0"
                        title="Copy Email Address"
                      >
                        {copiedField === `email-${college.id}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Card Footer: Rankings and View More */}
              <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {college.nirf_rank ? (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-medium">
                      NIRF: {college.nirf_rank}
                    </span>
                  ) : null}
                  {college.qs_rank ? (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-medium truncate max-w-[140px]" title={college.qs_rank}>
                      QS: {college.qs_rank}
                    </span>
                  ) : null}
                </div>

                <span className="font-semibold text-black flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Details <Eye className="w-3 h-3 text-black" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Detailed Table View */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">College / University</th>
                  <th className="py-3 px-3">Recorded Response</th>
                  <th className="py-3 px-3">Contact Person</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">District</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Rankings</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-black">
                {paginatedColleges.map((college) => (
                  <tr
                    key={college.id}
                    onClick={() => setActiveCollege(college)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-bold max-w-[220px]">
                      <span className="line-clamp-2">{college.college_name}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${getBadgeClass(college.response)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(college.response)}`} />
                        {college.response}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-black truncate max-w-[150px]">
                        {college.contact_person || '—'}
                      </div>
                      {college.designation && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                          {college.designation}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {college.department || '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {college.district ? (
                        <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {college.district}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {college.phone ? (
                        <div className="flex items-center gap-1">
                          <a href={`tel:${college.phone}`} className="font-mono text-black hover:underline font-semibold">
                            {college.phone}
                          </a>
                          <button
                            onClick={() => handleCopy(college.phone, `tbl-phone-${college.id}`)}
                            className="text-slate-400 hover:text-black p-0.5"
                          >
                            {copiedField === `tbl-phone-${college.id}` ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3 max-w-[150px] truncate" onClick={(e) => e.stopPropagation()}>
                      {college.email ? (
                        <div className="flex items-center gap-1">
                          <a href={`mailto:${college.email}`} className="text-slate-700 hover:underline truncate">
                            {college.email}
                          </a>
                          <button
                            onClick={() => handleCopy(college.email, `tbl-email-${college.id}`)}
                            className="text-slate-400 hover:text-black p-0.5 shrink-0"
                          >
                            {copiedField === `tbl-email-${college.id}` ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3 text-[10px] text-slate-600 whitespace-nowrap">
                      {college.nirf_rank ? <div>NIRF: {college.nirf_rank}</div> : null}
                      {college.qs_rank ? <div className="truncate max-w-[100px]">QS: {college.qs_rank}</div> : null}
                      {!college.nirf_rank && !college.qs_rank && '—'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setActiveCollege(college)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-black font-semibold text-[11px] transition-colors inline-flex items-center gap-1"
                      >
                        Profile <Eye className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="text-xs text-slate-600 font-medium">
            Showing <strong className="text-black">{((page - 1) * pageSize) + 1}</strong> to{' '}
            <strong className="text-black">{Math.min(page * pageSize, filteredColleges.length)}</strong> of{' '}
            <strong className="text-black">{filteredColleges.length}</strong> colleges
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 text-black hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-black px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-black hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* College Full Profile Modal Dialog */}
      {activeCollege && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border mb-2 ${getBadgeClass(activeCollege.response)}`}>
                  <span className={`w-2 h-2 rounded-full ${getStatusDot(activeCollege.response)}`} />
                  Response: {activeCollege.response}
                </span>
                <h3 className="text-lg font-bold text-black leading-snug">
                  {activeCollege.college_name}
                </h3>
                {activeCollege.raw_response && activeCollege.raw_response !== activeCollege.response && (
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    Original Logged Response: &quot;{activeCollege.raw_response}&quot;
                  </p>
                )}
              </div>
              <button
                onClick={() => setActiveCollege(null)}
                className="p-1.5 text-slate-400 hover:text-black bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4 text-xs">
              {/* Decision Maker Card */}
              <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Institutional Contact Person
                </span>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-black shrink-0" />
                  <span className="text-sm font-bold text-black">
                    {activeCollege.contact_person || 'Not specified'}
                  </span>
                  {activeCollege.gender && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                      {activeCollege.gender}
                    </span>
                  )}
                </div>

                {activeCollege.designation && (
                  <div className="text-xs text-slate-700 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeCollege.designation}</span>
                  </div>
                )}

                {activeCollege.department && (
                  <div className="text-xs text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeCollege.department}</span>
                  </div>
                )}
              </div>

              {/* Direct Communication Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Phone Number
                  </span>
                  <div className="text-sm font-bold font-mono text-black">
                    {activeCollege.phone || 'No phone recorded'}
                  </div>
                  {activeCollege.phone && (
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`tel:${activeCollege.phone}`}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                      >
                        <PhoneCall className="w-3 h-3" /> Call
                      </a>
                      <button
                        onClick={() => handleCopy(activeCollege.phone, 'modal-phone')}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-black border border-slate-300 font-semibold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                      >
                        {copiedField === 'modal-phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'modal-phone' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Email Address
                  </span>
                  <div className="text-xs font-semibold text-black break-all">
                    {activeCollege.email || 'No email recorded'}
                  </div>
                  {activeCollege.email && (
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`mailto:${activeCollege.email}`}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                      >
                        <MailCheck className="w-3 h-3" /> Email
                      </a>
                      <button
                        onClick={() => handleCopy(activeCollege.email, 'modal-email')}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-black border border-slate-300 font-semibold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                      >
                        {copiedField === 'modal-email' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'modal-email' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Location & Academic Accreditation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    District / Region
                  </span>
                  <div className="text-xs font-bold text-black flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {activeCollege.district || 'Unspecified'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Rankings & Accreditations
                  </span>
                  <div className="text-xs font-semibold text-black space-y-0.5">
                    <div>NIRF: {activeCollege.nirf_rank || 'Not ranked'}</div>
                    <div className="truncate">QS: {activeCollege.qs_rank || 'Not ranked'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setActiveCollege(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-black text-xs font-semibold rounded-xl transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
