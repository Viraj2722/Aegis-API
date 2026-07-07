"use client";

import Hero from "./Hero";
import ProductVisual from "./ProductVisual";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import TrustSecurity from "./TrustSecurity";
import FinalCTA from "./FinalCTA";
import Footer from "./Footer";
import Navbar from "./Navbar";

export default function Landing({ splashDone = false }) {
  return (
    <div className="min-h-screen bg-[#050810] overflow-x-hidden w-full">
      <Navbar splashDone={splashDone} />
      <Hero />
      <ProductVisual />
      <Features />
      <HowItWorks />
      <TrustSecurity />
      <FinalCTA />
      <Footer />
    </div>
  );
}
