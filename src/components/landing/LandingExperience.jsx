"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ShieldAnimation from "./ShieldAnimation";
import Landing from "./Landing";

export default function LandingExperience() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      {!splashDone && (
        <ShieldAnimation onComplete={() => setSplashDone(true)} />
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={splashDone ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        <Landing splashDone={splashDone} />
      </motion.div>
    </>
  );
}
