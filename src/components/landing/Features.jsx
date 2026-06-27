"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const features = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
    ),
    title: "Zombie API Detection",
    description:
      "Automatically surface deprecated, forgotten, or undocumented APIs that remain exposed - invisible to teams but visible to attackers.",
    color: "#ef4444",
    accent: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.25)",
    tag: "Core",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33"
        />
      </svg>
    ),
    title: "Behavioral Fingerprinting",
    description:
      "Build behavioral profiles of every API caller. Detect anomalies, credential stuffing, and bot-like patterns that evade rule-based systems.",
    color: "#00d4ff",
    accent: "rgba(0,212,255,0.10)",
    border: "rgba(0,212,255,0.25)",
    tag: "AI-Powered",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
        />
      </svg>
    ),
    title: "Attack Surface Mapping",
    description:
      "Generate a complete, interactive map of every exposed endpoint across microservices, third-party integrations, and legacy systems.",
    color: "#22c55e",
    accent: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.25)",
    tag: "Visualization",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
    title: "Risk Intelligence",
    description:
      "Get context-aware risk scores backed by CVSS, OWASP API Top 10, and proprietary threat intelligence - prioritized for your team.",
    color: "#f59e0b",
    accent: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.25)",
    tag: "Intelligence",
  },
];

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section ref={ref} id="features" className="relative py-14 md:py-24 overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-50" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.08) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-10 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-green-400/60 uppercase mb-4">
            <div className="w-8 h-px bg-green-400/30" />
            Core Capabilities
            <div className="w-8 h-px bg-green-400/30" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            Built for <span className="gradient-text">Modern Threat</span>{" "}
            Landscapes
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Four powerful engines working in unison to give your security team
            the edge it needs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="group relative rounded-2xl p-6 cursor-default overflow-hidden"
              style={{
                background: feature.accent,
                border: `1px solid ${feature.border}`,
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{
                  background: `radial-gradient(ellipse at top left, ${feature.accent}, transparent)`,
                  boxShadow: `inset 0 0 30px ${feature.border}`,
                }}
              />

              <div className="flex items-start justify-between mb-4 relative z-10">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${feature.color}15`,
                    border: `1px solid ${feature.color}30`,
                    color: feature.color,
                    boxShadow: `0 0 20px ${feature.color}20`,
                  }}
                >
                  {feature.icon}
                </div>
                <span
                  className="text-[10px] font-mono tracking-widest uppercase px-2 py-1 rounded-full"
                  style={{
                    color: feature.color,
                    background: `${feature.color}15`,
                    border: `1px solid ${feature.color}25`,
                  }}
                >
                  {feature.tag}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 relative z-10">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed relative z-10">
                {feature.description}
              </p>

              <div
                className="mt-5 h-px w-full opacity-30 relative z-10"
                style={{
                  background: `linear-gradient(90deg, ${feature.color}, transparent)`,
                }}
              />

              <div
                className="mt-3 flex items-center gap-2 text-xs relative z-10"
                style={{ color: feature.color }}
              >
                <span className="font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more
                </span>
                <motion.span
                  className="opacity-0 group-hover:opacity-100"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  -&gt;
                </motion.span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
