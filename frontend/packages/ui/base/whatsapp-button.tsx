"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { GoniaIcons } from "../lib/icon-registry";
import { motion, AnimatePresence } from "framer-motion";

export interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
  variant?: "default" | "outline" | "fab" | "ghost";
  size?: "sm" | "lg" | "default";
  label?: string;
  className?: string;
  showTooltip?: boolean;
}

/**
 * Gonia WhatsApp Integration Component.
 * Supports standard buttons and a persistent Floating Action Button (FAB).
 */
export function WhatsAppButton({
  phoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+966501902789",
  message = "Hello Balaka Support! I need some information regarding your services.",
  variant = "default",
  size = "default",
  label = "Chat on WhatsApp",
  className,
  showTooltip = false,
}: WhatsAppButtonProps) {
  
  const cleanNumber = phoneNumber.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

  const handleClick = () => {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  // 1. Floating Action Button (FAB) Variant
  if (variant === "fab") {
    return (
      <div className={cn("fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3", className)}>
        <AnimatePresence>
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClick}
            className={cn(
              "h-12 w-12 flex items-center justify-center bg-[var(--gonia-success)] text-white border-2 border-[var(--gonia-success)]",
              "rounded-none shadow-[3px_3px_0_0_var(--gonia-primary)] transition-all duration-200",
              "hover:bg-[var(--gonia-canvas)] hover:text-[var(--gonia-success)] hover:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] group/wa"
            )}
            title="Chat with us on WhatsApp"
          >
            <GoniaIcons.WhatsApp className="h-6 w-6 fill-white group-hover/wa:fill-[var(--gonia-success)] transition-colors" />
          </motion.button>
        </AnimatePresence>
      </div>
    );
  }

  // 2. Standard Button Variant
  return (
    <Button
      variant={variant === "ghost" || variant === "outline" ? variant : "default"}
      size={size}
      onClick={handleClick}
      className={cn(
        variant === "default" && "bg-[var(--gonia-success)] hover:bg-[var(--gonia-primary)] text-white hover:text-white border-none shadow-[3px_3px_0_0_var(--gonia-primary)]",
        "gap-2 font-bold uppercase tracking-normal text-[10px]",
        className
      )}
    >
      <GoniaIcons.WhatsApp className="h-4 w-4" />
      {label}
    </Button>
  );
}