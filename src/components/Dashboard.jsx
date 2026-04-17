"use client";
import React, { useState, useEffect } from "react";
import { AlertTriangle, Activity, Search, Filter, ServerCrash, TrendingUp, TrendingDown, Database, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function Dashboard({ data, onSelectApi }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({ key: 'risk_score', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  if (!data) return <div className="text-white">Waiting for engine data...</div>;
  const { metrics, api_data } = data;

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, riskFilter]);

  // Handle Sorting
  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const sortedData = [...api_data].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Apply Filtering and Pagination
  const filteredData = sortedData.filter(api => 
    api.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (riskFilter === "All" || api.risk_level === riskFilter)
  );
  
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Calculate real dynamic percentages based on actual network traffic volume (logs)
  const atRiskTraffic = (metrics.zombie_traffic || 0) + (metrics.suspicious_traffic || 0);
  const atRiskPercent = metrics.total_logs > 0 ? ((atRiskTraffic / metrics.total_logs) * 100).toFixed(1) : 0;
  const zombiePercent = metrics.total_logs > 0 ? (((metrics.zombie_traffic || 0) / metrics.total_logs) * 100).toFixed(1) : 0;
  const suspiciousPercent = metrics.total_logs > 0 ? (((metrics.suspicious_traffic || 0) / metrics.total_logs) * 100).toFixed(1) : 0;

  // Export Report to CSV
  const exportCSV = () => {
    const headers = ["Endpoint", "Risk Score", "Risk Level", "Status", "Error Rate", "Traffic Freq"];
    const csvContent = [
      headers.join(","),
      ...filteredData.map(api => [
        api.endpoint, api.risk_score, api.risk_level,
        api.is_zombie ? "Zombie" : api.is_shadow_api ? "Shadow API" : api.error_rate > 0.5 ? "Suspicious" : "Active",
        `${(api.error_rate * 100).toFixed(1)}%`, `${api.daily_calls.toFixed(1)} req/day`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `aegis_threat_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 🚀 PRO METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total APIs" value={metrics.total_apis} icon={<Search className="text-blue-400"/>} trend={`${atRiskPercent}% of traffic at risk`} trendType={atRiskPercent > 10 ? "bad" : "neutral"} />
        <StatCard title="Zombies" value={metrics.zombie_apis} icon={<Activity className="text-orange-400"/>} isAlert={metrics.zombie_apis > 0} trend={`${zombiePercent}% of traffic`} trendType={metrics.zombie_apis > 0 ? "bad" : "good"} />
        <StatCard title="Suspicious" value={metrics.suspicious_apis} icon={<AlertTriangle className="text-red-400"/>} isAlert={metrics.suspicious_apis > 0} trend={`${suspiciousPercent}% of traffic`} trendType={metrics.suspicious_apis > 0 ? "bad" : "good"} />
        <StatCard title="Logs Analyzed" value={metrics.total_logs?.toLocaleString()} icon={<Database className="text-emerald-400"/>} trend="Live Ingestion" trendType="neutral" />
      </div>

      {/* 🎛️ CONTROLS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Search API endpoints..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-12 pr-4 py-3 text-white outline-none transition-all placeholder:text-slate-600"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-3.5 text-slate-500" size={18} />
          <select 
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="appearance-none bg-[#0f172a] border border-slate-800 focus:border-indigo-500 rounded-xl pl-12 pr-10 py-3 text-white outline-none transition-all cursor-pointer"
          >
            <option value="All">All Risk Levels</option>
            <option value="Critical">Critical Only</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>
        </div>
        <button onClick={exportCSV} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">
          <Download size={18} /> Export CSV
        </button>
      </div>

      {/* ️ SECURITY INVENTORY TABLE */}
      <div className="bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-slate-500 text-xs uppercase font-bold tracking-widest bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('endpoint')}><div className="flex items-center gap-1">API Endpoint {sortConfig.key === 'endpoint' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null}</div></th>
                <th className="px-6 py-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('risk_score')}><div className="flex items-center justify-center gap-1">Security Score {sortConfig.key === 'risk_score' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null}</div></th>
                <th className="px-6 py-4">Anomaly Profile</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('error_rate')}><div className="flex items-center gap-1">Error Rate {sortConfig.key === 'error_rate' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null}</div></th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('daily_calls')}><div className="flex items-center gap-1">Traffic Load {sortConfig.key === 'daily_calls' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null}</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <ServerCrash size={48} className="mb-4 opacity-50" />
                      <p className="text-lg font-medium text-slate-400">No endpoints found</p>
                      <p className="text-sm">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.map((api, i) => (
                <tr key={i} onClick={() => onSelectApi(api.endpoint)} className="hover:bg-indigo-500/10 transition-colors group cursor-pointer relative">
                  <td className="px-6 py-4 font-mono text-sm text-slate-300 group-hover:text-white transition-colors">
                    {api.endpoint}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                       <span className={`text-sm font-bold ${getRiskTextColor(api.risk_level)}`}>
                         {api.risk_score.toFixed(0)}
                       </span>
                       <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${getRiskBgColor(api.risk_level)}`} 
                            style={{ width: `${api.risk_score}%` }}
                          />
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {api.is_zombie ? (
                      <Badge color="orange">Zombie Detected</Badge>
                    ) : api.is_shadow_api ? (
                      <Badge color="purple">Shadow API</Badge>
                    ) : api.error_rate > 0.50 ? (
                      <Badge color="red">Suspicious Behavior</Badge>
                    ) : (
                      <Badge color="emerald">Stable Profile</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${api.error_rate > 0.5 ? 'text-red-400' : 'text-slate-300'}`}>{(api.error_rate * 100).toFixed(1)}%</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 flex items-center gap-3">
                    <span>{api.daily_calls.toFixed(1)} <span className="text-[10px] uppercase">req/day</span></span>
                    <div className={`h-2 w-2 rounded-full shadow-sm ${api.risk_score > 60 ? 'bg-red-500 shadow-red-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/30">
            <span className="text-sm text-slate-500 font-medium">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"><ChevronLeft size={18} /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, isAlert, trend, trendType }) {
  const getTrendColor = () => {
    if (trendType === 'good') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (trendType === 'bad') return 'text-red-400 bg-red-400/10 border-red-400/20';
    return 'text-slate-400 bg-slate-800 border-slate-700';
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-indigo-500/50 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">{icon}</div>
        {isAlert && <div className="h-2 w-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" />}
      </div>
      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">{title}</h3>
      <div className="flex items-end justify-between mt-1">
        <p className="text-3xl font-black text-white">{value}</p>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${getTrendColor()}`}>
          {trendType === 'bad' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {trend}
        </span>
      </div>
      <div className="absolute -bottom-2 -right-2 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
        {React.cloneElement(icon, { size: 100 })}
      </div>
    </div>
  );
}

function Badge({ children, color }) {
  const colors = {
    orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${colors[color]}`}>
      {children}
    </span>
  );
}

function getRiskTextColor(level) {
  if (level === "Critical") return "text-red-500";
  if (level === "High") return "text-orange-500";
  return "text-emerald-500";
}

function getRiskBgColor(level) {
  if (level === "Critical") return "bg-red-500";
  if (level === "High") return "bg-orange-500";
  return "bg-emerald-500";
}
