"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (isReady && !user) {
      router.replace("/login");
    }
  }, [isReady, user]);

  if (!isReady || !user) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  return children;
}
