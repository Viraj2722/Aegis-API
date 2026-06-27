"use client";

const links = {
  Product: ["Features", "Dashboard", "API Docs", "Pricing"],
  Company: ["About", "Blog", "Careers", "Press"],
  Security: ["Trust Center", "Compliance", "Bug Bounty", "CVE Disclosure"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-10 md:py-16 overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-20" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6 md:gap-8 mb-8 md:mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                <path
                  d="M12 2L22 7V13C22 18 17.5 22.5 12 24C6.5 22.5 2 18 2 13V7L12 2Z"
                  fill="rgba(0,212,255,0.15)"
                  stroke="#00d4ff"
                  strokeWidth="1.5"
                  style={{ filter: "drop-shadow(0 0 6px rgba(0,212,255,0.6))" }}
                />
                <path
                  d="M12 8L14.5 14M12 8L9.5 14M10.5 12H13.5"
                  stroke="#00d4ff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-lg font-black text-white tracking-tight">
                Aegis<span className="gradient-text">API</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              AI-powered API security intelligence. Expose the invisible, secure
              the forgotten.
            </p>
            <div className="flex gap-3">
              {["github", "twitter", "linkedin"].map((s) => (
                <div
                  key={s}
                  className="w-8 h-8 rounded-lg glass border border-white/8 flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:border-cyan-400/30 cursor-pointer transition-all duration-200"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {s === "github" && (
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    )}
                    {s === "twitter" && (
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    )}
                    {s === "linkedin" && (
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    )}
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-mono tracking-widest text-slate-500 uppercase mb-3">
                {category}
              </h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <span className="text-sm text-slate-500 hover:text-cyan-400 cursor-pointer transition-colors duration-200">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="h-px mb-6"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(0,212,255,0.2), transparent)",
          }}
        />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div>© 2025 AegisAPI, Inc. All rights reserved.</div>
          <div className="flex items-center gap-2 font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400/60">All systems nominal</span>
          </div>
          <div className="flex gap-4">
            {["Privacy", "Terms", "Cookies"].map((l) => (
              <span
                key={l}
                className="hover:text-slate-400 cursor-pointer transition-colors"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
