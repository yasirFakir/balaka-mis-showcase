"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Logo } from "../base/logo"
import { cn } from "../lib/utils"

export function LoadingSpinner({ 
  className, 
  size = "md",
  full = false
}: { 
  className?: string, 
  size?: "sm" | "md" | "lg" | "xl",
  full?: boolean
}) {
  const sizeMap = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-20 w-20",
    xl: "h-32 w-32"
  }

  const dotSizeMap = {
    sm: "text-[6px]",
    md: "text-[8px]",
    lg: "text-[10px]",
    xl: "text-[12px]"
  }

  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-0",
      className
    )}>
      <motion.div
        animate={{ 
          y: [5, -5, 5],
          rotate: [-5, 5, -5]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className={cn(sizeMap[size], "flex items-center justify-center")}
      >
        <Logo className="w-full h-full text-primary" />
      </motion.div>
      
      {/* Boxy Dot Loader */}
      <div className={cn("flex gap-1 font-mono font-black text-primary select-none", dotSizeMap[size])}>
        <motion.span
          animate={{ opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, times: [0, 0.2, 0.4, 0.8, 1] }}
        >■</motion.span>
        <motion.span
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, times: [0, 0.2, 0.4, 0.8, 1] }}
        >■</motion.span>
        <motion.span
          animate={{ opacity: [0, 0, 0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, times: [0, 0.2, 0.4, 0.8, 1] }}
        >■</motion.span>
      </div>
    </div>
  );

  if (full) {
      return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
              {content}
          </div>
      );
  }

  return content;
}
