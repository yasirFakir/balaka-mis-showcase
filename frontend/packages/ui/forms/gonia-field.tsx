"use client";

import * as React from "react";
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from "../forms/form";
import { cn } from "../lib/utils";
import { Control, FieldPath, FieldValues, ControllerRenderProps, FieldError } from "react-hook-form";

interface GoniaFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  required?: boolean;
  customControl?: boolean;
  children: (props: { 
    field: ControllerRenderProps<TFieldValues, TName>; 
    error: FieldError | undefined 
  }) => React.ReactNode;
  className?: string;
}

/**
 * A "Gonia" branded field wrapper that automatically handles:
 * 1. Technical Uppercase Labels with Required indicators
 * 2. Standardized Spacing
 * 3. Validation Feedback (via FormMessage)
 * 4. Error state propagation to children (for border styling)
 */
export function GoniaField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ 
  control, 
  name, 
  label, 
  required, 
  customControl,
  children,
  className 
}: GoniaFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <FormItem className={cn("space-y-1.5", className)}>
          <FormLabel className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1">
            {label}
            {required && <span className="text-destructive font-bold text-sm leading-none">*</span>}
          </FormLabel>
          {customControl ? children({ field, error }) : (
            <FormControl>
              {children({ field, error })}
            </FormControl>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Common Gonia Theme classes for Inputs/Selects/etc
 */
export const GONIA_INPUT_CLASSES = "h-11 rounded-none bg-muted/50 border-border/40 focus-visible:bg-background transition-colors disabled:opacity-100 disabled:bg-muted/50";
export const GONIA_ERROR_CLASSES = "border-destructive/50 ring-destructive/20";
