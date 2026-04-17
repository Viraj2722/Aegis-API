"use client";

import { motion } from "framer-motion";
import Hero from "./Hero";
import ProductVisual from "./ProductVisual";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import TrustSecurity from "./TrustSecurity";
import FinalCTA from "./FinalCTA";
import Footer from "./Footer";
import Navbar from "./Navbar";

export default function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="min-h-screen bg-[#050810]"
    >
      <Navbar />
      <Hero />
      <ProductVisual />
      <Features />
      <HowItWorks />
      <TrustSecurity />
      <FinalCTA />
      <Footer />
    </motion.div>
  );
}
