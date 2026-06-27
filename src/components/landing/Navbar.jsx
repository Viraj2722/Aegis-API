"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import BrandLogo from "../BrandLogo";
import { useAuth } from "../../context/AuthContext";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Security", href: "/#security" },
  { label: "Pricing", href: "/#pricing" },
];

export default function Navbar({ hideAuthActions = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady, logout } = useAuth();
  const showAgentsLink = pathname !== "/agents";
  const isSignedIn = !!user;

  const handleSignOut = async () => {
    await logout();
    router.replace("/login");
  };

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
        className={`mx-auto max-w-6xl px-4 sm:px-6 rounded-2xl neon-border transition-all duration-500 ${
          scrolled ? "glass shadow-2xl" : ""
        }`}
        style={{
          borderColor: scrolled
            ? "rgba(16, 185, 129, 0.3)"
            : "rgba(16, 185, 129, 0)",
        }}
      >
        <div className="flex items-center justify-between h-12">
          <BrandLogo size="sm" href="/" />

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="hover:text-cyan-400 transition-colors duration-200 font-medium"
              >
                {item.label}
              </Link>
            ))}
            {showAgentsLink && (
              <Link
                href="/agents"
                className="hover:text-cyan-400 transition-colors duration-200 font-medium"
              >
                Agents
              </Link>
            )}
          </div>

          {isReady && !isSignedIn && !hideAuthActions && (
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 font-medium"
              >
                Sign In
              </Link>
              <Link href="/signup">
                <motion.button
                  className="btn-primary px-4 py-2 rounded-xl text-white text-sm font-semibold"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Get Started
                </motion.button>
              </Link>
            </div>
          )}

          {isReady && isSignedIn && !hideAuthActions && (
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/profile"
                className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-1.5 font-medium"
              >
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm text-red-300 hover:text-red-200 transition-colors px-3 py-1.5 font-medium border border-red-500/30 rounded-xl hover:bg-red-500/10"
              >
                Sign out
              </button>
            </div>
          )}

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
                {navLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block text-slate-400 hover:text-white py-2 text-sm font-medium transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                {showAgentsLink && (
                  <Link
                    href="/agents"
                    className="block text-slate-400 hover:text-white py-2 text-sm font-medium transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Agents
                  </Link>
                )}
                {isReady && !isSignedIn && !hideAuthActions && (
                  <div className="pt-2 flex gap-3">
                    <Link
                      href="/login"
                      className="text-sm text-slate-400 hover:text-white transition-colors font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link href="/signup" onClick={() => setMobileOpen(false)}>
                      <button className="btn-primary px-4 py-2 rounded-xl text-white text-sm font-semibold">
                        Get Started
                      </button>
                    </Link>
                  </div>
                )}
                {isReady && isSignedIn && !hideAuthActions && (
                  <div className="pt-2 flex gap-4 items-center">
                    <Link
                      href="/profile"
                      className="text-sm text-slate-300 hover:text-white transition-colors font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      className="text-sm text-red-300 hover:text-red-200 transition-colors font-medium"
                      onClick={async () => {
                        setMobileOpen(false);
                        await handleSignOut();
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
