import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { riskMatrixData as defaultRiskMatrixData } from './data/mockData'

/* ── Color Logic (slightly softened) ── */
function heatColor(value) {
  if (value >= 75) return { bg: 'rgba(248,113,113,0.7)', text: '#fff' }
  if (value >= 55) return { bg: 'rgba(251,146,60,0.6)', text: '#fff' }
  if (value >= 35) return { bg: 'rgba(251,191,36,0.5)', text: '#1a1a1a' }
  if (value >= 15) return { bg: 'rgba(56,189,248,0.3)', text: '#e2e8f0' }
  return { bg: 'rgba(100,116,139,0.15)', text: '#64748b' }
}

export default function Heatmap({ data = defaultRiskMatrixData }) {
  const { regions, riskLevels, matrix } = data
  const [active, setActive] = useState(null)

  return (
    <div className="w-full overflow-x-auto">

      <div className="min-w-[500px] space-y-4">

        {/* COLUMN HEADERS */}
        <div
          className="grid mb-2"
          style={{ gridTemplateColumns: `120px repeat(${regions.length}, 1fr)` }}
        >
          <div />
          {regions.map((r) => (
            <div
              key={r}
              className="text-center text-xs text-slate-500 uppercase tracking-wider"
            >
              {r}
            </div>
          ))}
        </div>

        {/* GRID */}
        <div className="space-y-3">
          {riskLevels.map((level, ri) => (
            <div
              key={level}
              className="grid items-center"
              style={{ gridTemplateColumns: `120px repeat(${regions.length}, 1fr)` }}
            >

              {/* ROW LABEL */}
              <div className="text-xs text-slate-400 pr-3">
                {level}
              </div>

              {/* CELLS */}
              {matrix[ri].map((val, ci) => {
                const { bg, text } = heatColor(val)

                return (
                  <motion.div
                    key={ci}
                    className="mx-1 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: bg }}
                    whileHover={{ scale: 1.05 }}
                    onMouseEnter={() =>
                      setActive({ level, region: regions[ci], val })
                    }
                    onMouseLeave={() => setActive(null)}
                  >
                    <span
                      className="mono text-[11px] font-semibold"
                      style={{ color: text }}
                    >
                      {val}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          ))}
        </div>

        {/* LEGEND */}
        <div className="flex flex-wrap gap-6 pt-4">
          {[
            { label: 'Critical', color: 'rgba(248,113,113,0.7)' },
            { label: 'High', color: 'rgba(251,146,60,0.6)' },
            { label: 'Medium', color: 'rgba(251,191,36,0.5)' },
            { label: 'Low', color: 'rgba(56,189,248,0.3)' },
            { label: 'Info', color: 'rgba(100,116,139,0.15)' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-3 h-3 rounded" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* TOOLTIP */}
        {active && (
          <motion.div
            className="glass-card px-4 py-2 text-xs mt-4 inline-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-slate-400">{active.region}</span>
            <span className="mx-2 text-slate-600">•</span>
            <span className="text-slate-400">{active.level}</span>
            <span className="mx-2 text-slate-600">•</span>
            <span className="text-white font-semibold mono">
              {active.val}
            </span>
          </motion.div>
        )}

      </div>
    </div>
  )
}