"use client";

import { useEffect } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowUnauthed = false }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isReady } = useAuth();
  const [queryReady, setQueryReady] = useState(false);
  const [urlHasAgentKey, setUrlHasAgentKey] = useState(false);

  useEffect(() => {
    const hasFromHook =
      !!searchParams.get("agent_key") || !!searchParams.get("secret_key");

    let hasFromLocation = false;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search || "");
      hasFromLocation = !!params.get("agent_key") || !!params.get("secret_key");
    }

    setUrlHasAgentKey(hasFromHook || hasFromLocation);
    setQueryReady(true);
  }, [searchParams]);

  const canBypassAuth = allowUnauthed || urlHasAgentKey;

  useEffect(() => {
    if (!queryReady) return;
    if (!canBypassAuth && isReady && !user) {
      router.replace("/login");
    }
  }, [queryReady, canBypassAuth, isReady, user, router]);

  if (!queryReady || !isReady || (!canBypassAuth && !user)) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  return children;
}
