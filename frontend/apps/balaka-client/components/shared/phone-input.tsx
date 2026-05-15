"use client";

import React, { useMemo } from "react";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, GONIA_INPUT_CLASSES } from "@/ui";
import { cn } from "@/lib/utils";



// Curated list for performance
export const countries = [
  { code: "SA", name: "Saudi Arabia", dial: "+966" },
  { code: "BD", name: "Bangladesh", dial: "+880" },
];

// SVG Flag components to avoid 'src' prop errors on img tags
const FlagBD = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 12" className="h-3 w-4"><rect width="20" height="12" fill="#006a4e"/><circle cx="9" cy="6" r="4" fill="#f42a41"/></svg>;
const FlagSA = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" className="h-3 w-4"><rect width="30" height="20" fill="#006C35"/><path d="M5 10l5 5 10-10" stroke="#fff" fill="none" strokeWidth="2"/></svg>;
const FlagDefault = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 12" className="h-3 w-4"><rect width="20" height="12" fill="#ccc"/></svg>;

const flagMap: Record<string, React.ReactNode> = {
  BD: <FlagBD />,
  SA: <FlagSA />,
};

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, className, placeholder }: PhoneInputProps) {
  // Split value into country and number (e.g., "+880 1711...")
  const [dialCode, number] = useMemo(() => {
    const match = value.match(/^(\+\d+)\s(.*)$/);
    return match ? [match[1], match[2]] : ["+966", value];
  }, [value]);

  const handleCountryChange = (newDial: string) => {
    onChange(`${newDial} ${number}`);
  };

  const handleNumberChange = (newNumber: string) => {
    onChange(`${dialCode} ${newNumber}`);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={dialCode} onValueChange={handleCountryChange}>
        <SelectTrigger className={cn("w-[100px] bg-white", GONIA_INPUT_CLASSES)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-none border-2 border-primary/10">
          {countries.map((c) => (
            <SelectItem key={c.code} value={c.dial} className="text-xs font-bold uppercase py-3">
              <div className="flex items-center gap-2">
                {flagMap[c.code] || <FlagDefault />}
                <span>{c.dial}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        placeholder={placeholder || "1711-000000"}
        value={number}
        onChange={(e) => handleNumberChange(e.target.value)}
        className={cn("flex-1 bg-white", GONIA_INPUT_CLASSES)}
      />
    </div>
  );
}