"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

export default function FinalCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <section ref={ref} id="pricing" className="relative py-16 md:py-32 overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-30" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,212,255,0.08) 0%, rgba(34,197,94,0.06) 40%, transparent 70%)",
        }}
      />

      {[200, 350, 500].map((size, i) => (
        <motion.div
          key={size}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10"
          style={{ width: size, height: size }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.8 }}
        />
      ))}

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400/60 uppercase mb-8">
            <div className="w-8 h-px bg-cyan-400/30" />
            Get Started Today
            <div className="w-8 h-px bg-cyan-400/30" />
          </div>

          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Start Securing Your
            <br />
            <span className="gradient-text">APIs</span>
          </h2>

          <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Join 500+ security teams that trust AegisAPI to protect their API
            perimeter. Setup takes under 5 minutes. No credit card required.
          </p>

          <Link href="/signup">
            <motion.button
              className="btn-primary px-6 sm:px-10 py-4 sm:py-5 rounded-2xl text-white font-bold text-sm sm:text-base tracking-wide relative overflow-hidden group"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              animate={
                isInView
                  ? {
                      boxShadow: [
                        "0 0 20px rgba(14,165,233,0.4)",
                        "0 0 50px rgba(14,165,233,0.7)",
                        "0 0 20px rgba(14,165,233,0.4)",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                  animation: "shimmer 1.5s infinite",
                }}
              />
              <span className="relative flex items-center gap-2 sm:gap-3">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 hidden sm:block"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                Start Securing Your APIs - Free
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </span>
            </motion.button>
          </Link>

          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[
                  "bg-blue-500",
                  "bg-green-500",
                  "bg-cyan-500",
                  "bg-green-500",
                ].map((c, i) => (
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-full border-2 border-[#050810] ${c} flex items-center justify-center text-white text-[10px] font-bold`}
                  >
                    {["A", "B", "C", "D"][i]}
                  </div>
                ))}
              </div>
              <span>500+ security teams</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="w-3.5 h-3.5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
              <span className="ml-1">4.9 / 5 rating</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              No credit card required
            </div>
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  );
}
