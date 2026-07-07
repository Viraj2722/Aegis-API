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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Fixed Nav Bar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        {/* Top pill bar */}
        <div className={`transition-all duration-500 ${scrolled ? "py-2" : "py-4"}`}>
          <div
            className={`mx-4 sm:mx-6 lg:mx-auto lg:max-w-6xl px-4 sm:px-6 rounded-2xl transition-all duration-500 ${
              scrolled || mobileOpen ? "glass shadow-2xl border border-emerald-500/20" : ""
            }`}
          >
            <div className="flex items-center justify-between h-12">
              <BrandLogo size="sm" href="/" />

              {/* Desktop nav links */}
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

              {/* Desktop auth buttons */}
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

              {/* Hamburger button */}
              <button
                className="md:hidden text-slate-400 hover:text-white transition-colors p-1"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Mobile dropdown menu — inside pill so glass style continues */}
            <AnimatePresence>
              {mobileOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="md:hidden overflow-hidden"
                >
                  <div className="pt-3 pb-4 border-t border-white/10 space-y-1 mt-1">
                    {navLinks.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center text-slate-300 hover:text-white py-2.5 px-2 text-sm font-medium transition-colors rounded-lg hover:bg-white/5"
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    {showAgentsLink && (
                      <Link
                        href="/agents"
                        className="flex items-center text-slate-300 hover:text-white py-2.5 px-2 text-sm font-medium transition-colors rounded-lg hover:bg-white/5"
                        onClick={() => setMobileOpen(false)}
                      >
                        Agents
                      </Link>
                    )}

                    {isReady && !isSignedIn && !hideAuthActions && (
                      <div className="pt-3 flex flex-col gap-2 border-t border-white/10 mt-2">
                        <Link
                          href="/login"
                          className="w-full text-center text-sm text-slate-300 hover:text-white py-2.5 font-medium transition-colors rounded-lg hover:bg-white/5"
                          onClick={() => setMobileOpen(false)}
                        >
                          Sign In
                        </Link>
                        <Link href="/signup" onClick={() => setMobileOpen(false)}>
                          <button className="btn-primary w-full py-2.5 rounded-xl text-white text-sm font-semibold">
                            Get Started
                          </button>
                        </Link>
                      </div>
                    )}

                    {isReady && isSignedIn && !hideAuthActions && (
                      <div className="pt-3 flex flex-col gap-2 border-t border-white/10 mt-2">
                        <Link
                          href="/profile"
                          className="flex items-center text-slate-300 hover:text-white py-2.5 px-2 text-sm font-medium transition-colors rounded-lg hover:bg-white/5"
                          onClick={() => setMobileOpen(false)}
                        >
                          Profile
                        </Link>
                        <button
                          className="w-full text-left text-sm text-red-300 hover:text-red-200 py-2.5 px-2 font-medium transition-colors rounded-lg hover:bg-red-500/10"
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
        </div>
      </motion.nav>
    </>
  );
}
