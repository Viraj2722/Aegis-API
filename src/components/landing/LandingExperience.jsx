"use client";

import { useEffect, useState } from "react";
import ShieldAnimation from "./ShieldAnimation";
import Landing from "./Landing";

export default function LandingExperience() {
  const [showShield, setShowShield] = useState(false);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem("shield_shown");
    if (!alreadySeen) {
      setShowShield(true);
    }
  }, []);

  return (
    <>
      {showShield && <ShieldAnimation onComplete={() => { sessionStorage.setItem("shield_shown", "1"); setShowShield(false); }} />}
      <Landing />
    </>
  );
}
