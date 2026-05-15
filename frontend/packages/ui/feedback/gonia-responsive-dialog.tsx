"use client";

import * as React from "react";
import { useMediaQuery } from "@/core/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../feedback/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../feedback/sheet";
import { cn } from "../lib/utils";

interface GoniaResponsiveDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
}

/**
 * A responsive dialog that switches between a centered Dialog (desktop)
 * and a full-height Side Sheet (mobile).
 */
export function GoniaResponsiveDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  maxWidth = "lg",
}: GoniaResponsiveDialogProps) {
  const isMobileView = useMediaQuery("(max-width: 767px)");

  if (isMobileView) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className={cn("w-full sm:max-w-md p-0 flex flex-col border-none", className)}>
          <div className="flex-1 overflow-y-auto px-6 pt-16 pb-24">
            <SheetHeader className="text-left mb-6">
              <SheetTitle>{title}</SheetTitle>
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
            <div className="py-2">
                {children}
            </div>
          </div>
          {footer && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-primary/10 p-4 z-[110] safe-area-pb">
              <SheetFooter className="sm:flex-col gap-2">
                {footer}
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  const maxWidthClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    "4xl": "sm:max-w-4xl",
    "5xl": "sm:max-w-5xl",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidthClasses[maxWidth], "p-0 overflow-hidden", className)}>
        <div className="max-h-[85vh] flex flex-col">
            <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6">
                {children}
            </div>
            {footer && (
                <DialogFooter className="p-6 bg-muted/30 border-t border-primary/10">
                    {footer}
                </DialogFooter>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
