"use client";

import { useState } from "react";
import ShieldAnimation from "./ShieldAnimation";
import Landing from "./Landing";

export default function LandingExperience() {
  const [shieldDone, setShieldDone] = useState(false);

  return (
    <>
      <ShieldAnimation onComplete={() => setShieldDone(true)} />
      {shieldDone && <Landing />}
    </>
  );
}
