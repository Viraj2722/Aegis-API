"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const sizeClasses = {
  sm: {
    icon: "w-8 h-8",
    iconSize: 16,
    text: "text-lg",
    gap: "gap-2.5",
  },
  md: {
    icon: "w-10 h-10",
    iconSize: 20,
    text: "text-2xl",
    gap: "gap-3",
  },
};

export default function BrandLogo({
  href = "/",
  size = "sm",
  showText = true,
  className = "",
}) {
  const preset = sizeClasses[size] || sizeClasses.sm;

  const content = (
    <div className={`flex items-center ${preset.gap} ${className}`}>
      <div
        className={`${preset.icon} rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center glow-blue`}
      >
        <ShieldCheck size={preset.iconSize} className="text-white" />
      </div>
      {showText && (
        <span className={`${preset.text} font-bold gradient-text`}>
          Aegis API
        </span>
      )}
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
