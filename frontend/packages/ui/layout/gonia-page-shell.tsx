"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { gonia } from "../lib/gonia-theme";
import { GoniaContainer, GoniaStack } from "./gonia-primitives";

interface GoniaPageShellProps {
  children: React.ReactNode;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

/**
 * Standard Page Layout for Gonia v1.5.
 * Handles header alignment, responsive spacing, and content containers.
 */
export function GoniaPageShell({
  children,
  title,
  subtitle,
  icon,
  actions,
  className,
  size = "xl",
}: GoniaPageShellProps) {
  return (
    <GoniaContainer size={size} className={cn("py-6 md:py-10", className)}>
      <GoniaStack gap="lg">
        {/* Page Header */}
        <div className={gonia.layout.pageHeader}>
          <div className="flex items-start gap-4">
            {icon && (
              <div className="hidden md:flex mt-1 text-primary shrink-0">
                {icon}
              </div>
            )}
            <div className="space-y-1">
              {typeof title === "string" ? (
                <h1 className={gonia.text.h1}>{title}</h1>
              ) : (
                title
              )}
              {subtitle && (
                typeof subtitle === "string" ? (
                  <p className={gonia.text.caption}>{subtitle}</p>
                ) : (
                  subtitle
                )
              )}
            </div>
          </div>
          
          {actions && (
            <div className="flex items-center gap-3 w-full md:w-auto">
              {actions}
            </div>
          )}
        </div>

        {/* Page Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </div>
      </GoniaStack>
    </GoniaContainer>
  );
}
