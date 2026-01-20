import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  className?: string;
  hover?: boolean;
  glow?: boolean;
  children?: ReactNode;
}

export function GlassCard({ className, hover = true, glow = false, children }: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-card/80 backdrop-blur-xl",
        "border border-white/20",
        "shadow-lg",
        hover && "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        glow && "shadow-glow",
        className
      )}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
