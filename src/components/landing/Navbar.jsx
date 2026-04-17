"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div
        className={`mx-auto max-w-6xl px-6 rounded-2xl transition-all duration-500 ${
          scrolled ? "glass neon-border shadow-2xl" : ""
        }`}
      >
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
              <path
                d="M12 2L22 7V13C22 18 17.5 22.5 12 24C6.5 22.5 2 18 2 13V7L12 2Z"
                fill="rgba(0,212,255,0.12)"
                stroke="#00d4ff"
                strokeWidth="1.5"
                style={{ filter: "drop-shadow(0 0 6px rgba(0,212,255,0.5))" }}
              />
              <path
                d="M12 8L14.5 14M12 8L9.5 14M10.5 12H13.5"
                stroke="#00d4ff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-black text-lg text-white tracking-tight">
              Aegis<span className="gradient-text">API</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            {["Features", "Dashboard", "Security", "Pricing"].map((item) => (
              <span
                key={item}
                className="hover:text-cyan-400 cursor-pointer transition-colors duration-200 font-medium"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 font-medium">
              Sign In
            </button>
            <motion.button
              className="btn-primary px-4 py-2 rounded-xl text-white text-sm font-semibold"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Get Started
            </motion.button>
          </div>

          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden pb-4"
            >
              <div className="pt-4 border-t border-white/8 space-y-2">
                {["Features", "Dashboard", "Security", "Pricing"].map(
                  (item) => (
                    <div
                      key={item}
                      className="text-slate-400 hover:text-white py-2 text-sm font-medium cursor-pointer transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item}
                    </div>
                  ),
                )}
                <div className="pt-2 flex gap-3">
                  <button className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
                    Sign In
                  </button>
                  <button className="btn-primary px-4 py-2 rounded-xl text-white text-sm font-semibold">
                    Get Started
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
