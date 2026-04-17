import React from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { agentsData } from './data/mockData'

/* ── Status Styles ── */
const statusColor = {
  online:  { dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', label: 'Online' },
  offline: { dot: 'bg-red-400',     badge: 'bg-red-400/10 text-red-400 border-red-400/20',             label: 'Offline' },
  idle:    { dot: 'bg-yellow-400',  badge: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',    label: 'Idle' },
}

const pieData = [
  { name: 'Online',  value: agentsData.online,  color: '#34d399' },
  { name: 'Offline', value: agentsData.offline, color: '#f87171' },
  { name: 'Idle',    value: agentsData.idle,    color: '#fbbf24' },
]

/* ── Tooltip ── */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p style={{ color: payload[0].payload.color }}>
        {payload[0].name}: {payload[0].value}
      </p>
    </div>
  )
}

/* ── MAIN COMPONENT ── */
export default function AgentStatus() {
  return (
    <div className="flex flex-col gap-12">

      {/* ── TOP SECTION ── */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-12">

        {/* Chart */}
        <div className="w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-4">
          {pieData.map((d) => (
            <div key={d.name} className="flex items-center gap-4">
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: d.color }}
              />
              <span className="text-sm text-slate-400 w-24">
                {d.name}
              </span>
              <span className="mono text-xl font-semibold text-white">
                {d.value}
              </span>
            </div>
          ))}

          <div className="pt-3 border-t border-slate-700/40">
            <span className="text-xs text-slate-500">
              Total Agents:
            </span>
            <span className="mono text-sm font-semibold text-white ml-2">
              {agentsData.total}
            </span>
          </div>
        </div>

      </div>

      {/* ── TABLE ── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-700/30">
        <table className="w-full text-sm">

          {/* Header */}
          <thead>
            <tr className="border-b border-slate-700/40 bg-white/[0.02]">
              {['Agent ID', 'Name', 'Region', 'Status', 'Load'].map((h) => (
                <th
                  key={h}
                  className="text-left py-4 px-8 text-slate-500 font-medium uppercase tracking-wider text-[11px]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {agentsData.agents.map((agent, i) => {
              const s = statusColor[agent.status]

              return (
                <motion.tr
                  key={agent.id}
                  className="border-b border-slate-800/30 hover:bg-white/[0.02] transition"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td className="py-4 px-8 mono text-slate-500 text-xs">
                    {agent.id}
                  </td>

                  <td className="py-4 px-8 text-white font-medium">
                    {agent.name}
                  </td>

                  <td className="py-4 px-8 text-slate-400">
                    {agent.region}
                  </td>

                  <td className="py-4 px-8">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs ${s.badge}`}>
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </td>

                  <td className="py-4 px-8">
                    {agent.status !== 'offline' ? (
                      <div className="flex items-center gap-3 w-32">
                        <div className="flex-1 h-2 bg-slate-700/40 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${agent.load}%`,
                              background:
                                agent.load > 80
                                  ? '#f87171'
                                  : agent.load > 60
                                  ? '#fbbf24'
                                  : '#34d399',
                            }}
                          />
                        </div>
                        <span className="mono text-slate-400 text-xs w-8">
                          {agent.load}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </motion.tr>
              )
            })}
          </tbody>

        </table>
      </div>
    </div>
  )
}