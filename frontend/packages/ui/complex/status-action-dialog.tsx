"use client";

import * as React from "react";
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "../feedback/dialog";
import { Button } from "../base/button";
import { Input } from "../forms/input";
import { Label } from "../forms/label";
import { Textarea } from "../forms/textarea";
import { LoadingSpinner } from "../base/loading-spinner";
import { cn } from "../lib/utils";
import { gonia } from "../lib/gonia-theme";
import { GoniaIcons } from "../lib/icon-registry";
import { useServiceWorkflow } from "@/core/hooks/use-service-workflow";

export interface ActionField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number";
  placeholder?: string;
  required?: boolean;
}

export interface StatusActionDialogProps {
  requestId: number | string;
  targetStatus: string;
  title: string;
  description: string;
  icon?: keyof typeof GoniaIcons;
  fields?: ActionField[];
  onComplete?: () => void;
  trigger?: React.ReactNode;
  variant?: "primary" | "destructive" | "outline";
  confirmText?: string;
}

/**
 * Meta-system for Status Actions.
 * Replaces specific dialogs like RejectDialog, CancelDialog, etc.
 */
export function StatusActionDialog({
  requestId,
  targetStatus,
  title,
  description,
  icon = "Process",
  fields = [],
  onComplete,
  trigger,
  variant = "primary",
  confirmText = "Confirm Action"
}: StatusActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { updateStatus, cancelRequest, isProcessing } = useServiceWorkflow();
  
  const Icon = GoniaIcons[icon];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let success = false;
    if (targetStatus === "Cancelled") {
        success = await cancelRequest(requestId, () => {
            setOpen(false);
            setFormData({});
            if (onComplete) onComplete();
        });
    } else {
        success = await updateStatus(requestId, targetStatus, formData, () => {
            setOpen(false);
            setFormData({});
            if (onComplete) onComplete();
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant={variant === "destructive" ? "destructive" : "outline"} className={cn(gonia.button.base)}>
            {title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-none border-2">
        <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className={cn("p-2", variant === "destructive" ? "bg-destructive text-white" : "bg-primary text-white")}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-primary">{title}</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-normal opacity-60">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-[var(--gonia-canvas)]">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label className={gonia.text.label}>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                  className={cn(gonia.input.base, "min-h-[100px] py-3")}
                />
              ) : (
                <Input
                  type={field.type}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                  className={gonia.input.base}
                />
              )}
            </div>
          ))}

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              disabled={isProcessing}
              className={cn(
                "w-full h-12 rounded-none font-black uppercase tracking-normal transition-all",
                variant === "destructive" ? gonia.button.destructive : gonia.button.primary
              )}
            >
              {isProcessing ? <LoadingSpinner size="sm" /> : confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
