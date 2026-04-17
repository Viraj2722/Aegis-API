import React from 'react'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area
} from 'recharts'
import { threatData as defaultThreatData, ingestionData } from './data/mockData'

/* ───────── TOOLTIP ───────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null

  return (
    <div className="glass-card px-3 py-2 text-xs">
      {label && <p className="text-slate-500 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

/* ───────── DONUT ───────── */
export function ThreatDonut({ data = defaultThreatData.donut }) {
  return (
    <div className="w-full flex flex-col items-center gap-4">

      <div className="w-full h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* LEGEND */}
      <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-400">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded" style={{ background: d.color }} />
            {d.name}
          </div>
        ))}
      </div>

    </div>
  )
}

/* ───────── BAR CHART ───────── */
export function APICategories({ data = defaultThreatData.categories }) {
  return (
    <div className="w-full h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barSize={12}
          barCategoryGap="30%"
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="category"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} />

          <Bar dataKey="suspicious" fill="#38bdf8" radius={[6, 6, 0, 0]} />
          <Bar dataKey="zombie" fill="#a855f7" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ───────── AREA CHART ───────── */
export function LogsLineChart() {
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={ingestionData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="logsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="time"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="logs"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="url(#logsGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ───────── LATENCY GAUGE ───────── */
export function LatencyGauge({ value = 28, max = 100 }) {
  const pct = value / max
  const color = pct < 0.4 ? '#34d399' : pct < 0.7 ? '#fbbf24' : '#f87171'

  return (
    <div className="flex flex-col items-center gap-2">

      <svg viewBox="0 0 120 70" className="w-32 h-24">
        <path
          d="M10,65 A50,50 0 0,1 110,65"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />

        <path
          d="M10,65 A50,50 0 0,1 110,65"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray="157"
          strokeDashoffset={157 - (157 * value) / max}
        />
      </svg>

      <span className="mono text-lg font-semibold" style={{ color }}>
        {value} ms
      </span>

    </div>
  )
}

/* ───────── PROFESSION BARS ───────── */
export function ProfessionBar({ data }) {
  const max = Math.max(...data.map((d) => d.value))

  return (
    <div className="space-y-5 w-full">
      {data.map((d, i) => (
        <motion.div
          key={d.name}
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >

          <span className="text-sm text-slate-400 w-32 text-right">
            {d.name}
          </span>

          <div className="flex-1 h-2 bg-slate-700/40 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: d.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.7 }}
            />
          </div>

          <span className="mono text-sm text-white w-14 text-right">
            {d.value}
          </span>

        </motion.div>
      ))}
    </div>
  )
}