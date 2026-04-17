"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronUp,
  ChevronDown,
  Filter,
  ArrowUpDown,
} from "lucide-react";

const STATUS_STYLES = {
  Normal: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  Zombie: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  Suspicious: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25",
  Critical: "bg-red-500/15 text-red-400 border border-red-500/25",
};

const RELATIONSHIP_STYLES = {
  Duplicate: "bg-yellow-500/15 text-yellow-400",
  Renamed: "bg-blue-500/15 text-blue-400",
  Shadow: "bg-green-500/15 text-green-400",
};

const RISK_COLOR = (score) => {
  if (score >= 0.8) return "text-red-400";
  if (score >= 0.5) return "text-yellow-400";
  return "text-emerald-400";
};

const RISK_BAR_COLOR = (score) => {
  if (score >= 0.8) return "bg-red-500";
  if (score >= 0.5) return "bg-yellow-500";
  return "bg-emerald-500";
};

export default function ApiTable({ apis, onSelect, selected }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState({ key: "risk_score", dir: "desc" });

  const filtered = useMemo(() => {
    let data = [...apis];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (a) =>
          a.endpoint.toLowerCase().includes(q) ||
          a.status.toLowerCase().includes(q),
      );
    }
    if (filter === "zombie") data = data.filter((a) => a.status === "Zombie");
    if (filter === "critical")
      data = data.filter((a) => a.status === "Critical");
    if (filter === "duplicate")
      data = data.filter((a) => a.relationship === "Duplicate");
    if (filter === "high_risk") data = data.filter((a) => a.risk_score >= 0.7);

    data.sort((a, b) => {
      const av = a[sort.key] ?? 0;
      const bv = b[sort.key] ?? 0;
      return sort.dir === "asc" ? av - bv : bv - av;
    });
    return data;
  }, [apis, search, filter, sort]);

  const toggleSort = (key) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  };

  const SortIcon = ({ k }) =>
    sort.key === k ? (
      sort.dir === "asc" ? (
        <ChevronUp size={13} className="text-emerald-400" />
      ) : (
        <ChevronDown size={13} className="text-emerald-400" />
      )
    ) : (
      <ArrowUpDown size={12} className="text-slate-600" />
    );

  return (
    <div className="glass rounded-xl border border-slate-800/60">
      <div className="px-4 py-3 border-b border-slate-800/60 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search endpoints..."
            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-slate-500" />
          {["all", "zombie", "critical", "duplicate", "high_risk"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize ${filter === f ? "bg-emerald-600 text-white" : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"}`}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
        <span className="text-slate-500 text-xs">
          {filtered.length} results
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/60">
              {[
                { label: "Endpoint", key: null },
                { label: "Risk", key: "risk_score" },
                { label: "Status", key: null },
                { label: "Error Rate", key: "error_rate" },
                { label: "Inactive Days", key: "inactive_days" },
                { label: "Similar API", key: null },
                { label: "Similarity", key: "similarity" },
                { label: "Relationship", key: null },
              ].map((col) => (
                <th
                  key={col.label}
                  onClick={() => col.key && toggleSort(col.key)}
                  className={`text-left px-4 py-3 text-slate-400 text-xs font-semibold whitespace-nowrap uppercase tracking-wide ${col.key ? "cursor-pointer hover:text-slate-200 select-none" : ""}`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.key && <SortIcon k={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {filtered.map((api, i) => (
                <motion.tr
                  key={api.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onSelect(api)}
                  className={`border-b border-slate-800/40 cursor-pointer transition-all hover:bg-slate-800/30 ${selected?.id === api.id ? "bg-emerald-600/10 border-l-2 border-l-emerald-500" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-200 max-w-[200px] truncate">
                    <span className="text-emerald-400 mr-1 text-[10px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {api.method}
                    </span>
                    {api.endpoint}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${RISK_BAR_COLOR(api.risk_score)}`}
                          style={{ width: `${api.risk_score * 100}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-bold ${RISK_COLOR(api.risk_score)}`}
                      >
                        {(api.risk_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[api.status] || ""}`}
                    >
                      {api.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {api.error_rate?.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {api.inactive_days}d
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400 max-w-[140px] truncate">
                    {api.similar_api || "-"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {api.similarity != null ? (
                      <span className="text-cyan-400 font-semibold">
                        {api.similarity}%
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {api.relationship ? (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${RELATIONSHIP_STYLES[api.relationship] || ""}`}
                      >
                        {api.relationship}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-10 text-slate-500 text-sm"
                >
                  No APIs match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
