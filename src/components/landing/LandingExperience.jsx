"use client";

import { useEffect, useState } from "react";
import ShieldAnimation from "./ShieldAnimation";
import Landing from "./Landing";

export default function LandingExperience() {
  const [showShield, setShowShield] = useState(true);

  return (
    <>
      {showShield && <ShieldAnimation onComplete={() => setShowShield(false)} />}
      <Landing />
    </>
  );
}
