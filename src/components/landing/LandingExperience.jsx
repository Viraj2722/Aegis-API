"use client";

import { useEffect, useState } from "react";
import ShieldAnimation from "./ShieldAnimation";
import Landing from "./Landing";

export default function LandingExperience() {
  const [showShield, setShowShield] = useState(false);

  useEffect(() => {
    // Run intro only after mount so SSR and hydration markup stay identical.
    const timer = setTimeout(() => setShowShield(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showShield && <ShieldAnimation onComplete={() => setShowShield(false)} />}
      <Landing />
    </>
  );
}
