"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Upload Logs",
    description:
      "Drop your API logs, HAR files, or connect via our agent. Supports JSON, CSV, and all major gateway formats.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
    ),
    color: "#00d4ff",
  },
  {
    number: "02",
    title: "AI Analysis",
    description:
      "Our multi-model AI pipeline inspects call patterns, payload signatures, timing anomalies, and behavioral drift.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        />
      </svg>
    ),
    color: "#22c55e",
  },
  {
    number: "03",
    title: "Risk Detection",
    description:
      "Critical threats are surfaced with context: attack vectors, exploitability scores, and recommended remediation steps.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    ),
    color: "#ef4444",
  },
  {
    number: "04",
    title: "Visualization",
    description:
      "Explore your full API attack surface in an interactive graph. Export reports, share with teams, and track remediation progress.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
        />
      </svg>
    ),
    color: "#10b981",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section ref={ref} className="relative py-14 md:py-24">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(0,212,255,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-10 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400/60 uppercase mb-4">
            <div className="w-8 h-px bg-cyan-400/30" />
            How It Works
            <div className="w-8 h-px bg-cyan-400/30" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            From Log to <span className="gradient-text">Intelligence</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Four steps from raw data to actionable security insights - fully
            automated.
          </p>
        </motion.div>

        <div className="relative">
          <div
            className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px hidden md:block"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,212,255,0.4), rgba(34,197,94,0.4), rgba(239,68,68,0.4), rgba(16,185,129,0.4))",
            }}
          />

          <div className="space-y-12 md:space-y-0">
            {steps.map((step, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.15,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`relative flex items-center gap-8 md:gap-0 ${isEven ? "md:flex-row" : "md:flex-row-reverse"} mb-12 last:mb-0`}
                >
                  <div
                    className={`flex-1 ${isEven ? "md:pr-16 md:text-right" : "md:pl-16 md:text-left"}`}
                  >
                    <motion.div
                      className="glass rounded-2xl p-6 neon-border group cursor-default"
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      style={{
                        borderColor: `${step.color}20`,
                        background: `${step.color}05`,
                      }}
                    >
                      <div
                        className={`flex ${isEven ? "md:justify-end" : "md:justify-start"} mb-4`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: `${step.color}15`,
                            border: `1px solid ${step.color}30`,
                            color: step.color,
                            boxShadow: `0 0 20px ${step.color}20`,
                          }}
                        >
                          {step.icon}
                        </div>
                      </div>

                      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                        <span
                          className="text-3xl font-black font-mono opacity-20"
                          style={{ color: step.color }}
                        >
                          {step.number}
                        </span>
                        <h3 className="text-lg font-bold text-white">
                          {step.title}
                        </h3>
                      </div>

                      <p className="text-sm text-slate-400 leading-relaxed">
                        {step.description}
                      </p>
                    </motion.div>
                  </div>

                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 z-10">
                    <motion.div
                      className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                      style={{
                        background: "#050810",
                        borderColor: step.color,
                        boxShadow: `0 0 20px ${step.color}50`,
                      }}
                      animate={{
                        boxShadow: [
                          `0 0 10px ${step.color}30`,
                          `0 0 30px ${step.color}70`,
                          `0 0 10px ${step.color}30`,
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.5,
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: step.color }}
                      />
                    </motion.div>
                  </div>

                  <div className="flex-1 hidden md:block" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
