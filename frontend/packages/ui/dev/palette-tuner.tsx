"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Paintbrush, Copy, RefreshCcw, X, ChevronUp, ChevronDown, Wand2, Monitor, LayoutTemplate } from "lucide-react";
import { cn } from "../lib/utils";

// --- COLOR UTILS ---

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map(s => s + s).join("");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function getBrightness(hex: string): number {
  hex = hex.replace(/^#/, "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

// --- CONSTANTS ---

const VAR_MAP = {
  primary: "--gonia-primary",
  primaryDeep: "--gonia-primary-deep",
  secondary: "--gonia-secondary",
  secondaryPale: "--gonia-secondary-pale",
  accent: "--gonia-accent",
  accentSaturated: "--gonia-accent-saturated",
  warmSand: "--gonia-warm-sand",
  canvas: "--gonia-canvas",
  surface: "--gonia-surface",
  ink: "--gonia-ink",
  success: "--gonia-success",
  warning: "--gonia-warning",
  error: "--gonia-error",
};

const PROFILES = [
    { id: "horizon", name: "Gonia Deep Horizon", class: "" },
    { id: "classic", name: "Gonia Classic Green", class: "theme-classic-green" },
    { id: "monolith", name: "Gonia Monolith", class: "theme-monolith" },
    { id: "prussian", name: "Gonia Prussian", class: "theme-prussian" },
    { id: "glacier", name: "Gonia Glacier", class: "theme-glacier" },
    { id: "twilight", name: "Gonia Twilight", class: "theme-twilight" }
];

export function GoniaPaletteTuner() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeProfile, setActiveProfile] = useState("classic");
  const [palette, setPalette] = useState<Record<string, string>>({});
  const [pasteValue, setPasteValue] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("gonia-theme-profile") || "horizon";
    switchProfile(saved);
  }, []);

  // Update palette state when profile or variables change
  const syncPalette = useCallback(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const updated: Record<string, string> = {};
    Object.entries(VAR_MAP).forEach(([key, varName]) => {
      updated[key] = rootStyle.getPropertyValue(varName).trim().toUpperCase() || "#000000";
    });
    setPalette(updated);
  }, []);

  const switchProfile = (profileId: string) => {
    const profile = PROFILES.find(p => p.id === profileId) || PROFILES[0];
    
    // Remove all profile classes
    PROFILES.forEach(p => {
        if (p.class) document.documentElement.classList.remove(p.class);
    });

    // Add new profile class
    if (profile.class) {
        document.documentElement.classList.add(profile.class);
    }

    setActiveProfile(profile.id);
    localStorage.setItem("gonia-theme-profile", profile.id);
    
    // Slight delay to allow CSS variables to re-evaluate
    setTimeout(syncPalette, 50);
  };

  const updateVar = (key: string, value: string) => {
    const varName = (VAR_MAP as Record<string, string>)[key];
    if (varName && /^#[0-9A-F]{6}$/i.test(value)) {
      document.documentElement.style.setProperty(varName, value);
      setPalette(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleMagicPaste = () => {
    const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/g;
    const matches = pasteValue.match(hexRegex);
    if (!matches || matches.length < 2) return;

    const hexes = matches.map(h => {
        if (h.length === 4) return h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
        return h.toUpperCase();
    });

    const sorted = [...hexes].sort((a, b) => getBrightness(b) - getBrightness(a));
    const lightest = sorted[0];
    const darkest = sorted[sorted.length - 1];
    const accent = sorted.find(h => h !== lightest && h !== darkest) || sorted[1];

    generateFromCore(darkest, accent, lightest);
    setPasteValue("");
  };

  const generateFromCore = (brand: string, accent: string, canvas: string = "var(--gonia-canvas)") => {
    const brandHsl = hexToHsl(brand);
    const accentHsl = hexToHsl(accent);

    const newPalette = {
      primary: brand,
      primaryDeep: hslToHex(brandHsl.h, brandHsl.s, Math.max(0, brandHsl.l - 15)),
      secondary: hslToHex(brandHsl.h, Math.max(0, brandHsl.s - 20), brandHsl.l),
      secondaryPale: hslToHex(brandHsl.h, Math.max(0, brandHsl.s - 10), Math.min(100, brandHsl.l + 35)),
      accent: accent,
      accentSaturated: hslToHex(accentHsl.h, Math.min(100, accentHsl.s + 20), accentHsl.l),
      warmSand: hslToHex(40, 80, 70),
      canvas: canvas,
      surface: "#FFFFFF",
      ink: hslToHex(brandHsl.h, 30, 15),
      success: hslToHex(150, 80, 40),
      warning: hslToHex(45, 90, 50),
      error: hslToHex(0, 80, 50),
    };

    Object.entries(newPalette).forEach(([key, val]) => updateVar(key, val));
  };

  const copyCSS = () => {
    const css = `.theme-custom {
${Object.entries(palette).map(([key, val]) => `  ${(VAR_MAP as any)[key]}: ${val};`).join("\n")}
}`;
    navigator.clipboard.writeText(css);
    alert("Profile CSS Copied! Paste this into globals.css to save forever.");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 bg-primary text-white flex items-center justify-center shadow-2xl border-2 border-white/20 hover:scale-110 active:scale-95 transition-all"
        >
          <Paintbrush size={20} />
        </button>
      ) : (
        <div className={cn(
          "bg-white border-2 border-primary shadow-[8px_8px_0_0_rgba(0,0,0,0.1)] w-[320px] flex flex-col overflow-hidden",
          isMinimized ? "h-[50px]" : "h-auto max-h-[85vh]"
        )}>
          {/* Header */}
          <div className="bg-primary p-3 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2">
              <Paintbrush size={14} />
              <span className="text-[10px] font-black uppercase tracking-normal text-white">Gonia Profile Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMinimized(!isMinimized)} className="hover:opacity-70">
                {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:opacity-70">
                <X size={14} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="p-5 space-y-6 overflow-y-auto no-scrollbar">
              
              {/* Profile Selector */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-primary/60 flex items-center gap-1">
                  <LayoutTemplate size={10} /> Active Profile (Safe Spot)
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {PROFILES.map(p => (
                        <button
                            key={p.id}
                            onClick={() => switchProfile(p.id)}
                            className={cn(
                                "h-8 px-2 text-[9px] font-black uppercase border-2 transition-all",
                                activeProfile === p.id 
                                    ? "bg-primary text-white border-primary" 
                                    : "bg-white text-primary border-primary/10 hover:border-primary/30"
                            )}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
              </div>

              {/* Magic Paste Area */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-primary/60 flex items-center gap-1">
                  <Wand2 size={10} /> Experiment: Magic Paste
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pasteValue}
                    onChange={(e) => setPasteValue(e.target.value)}
                    placeholder="#HEX1 #HEX2..."
                    className="flex-1 h-8 bg-primary/5 border border-primary/20 px-2 text-[10px] font-mono focus:border-primary outline-none"
                  />
                  <button 
                    onClick={handleMagicPaste}
                    className="h-8 px-3 bg-primary text-white text-[9px] font-black uppercase"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Individual Controls */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 border-t border-primary/5">
                {Object.entries(palette).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-primary/40 truncate block">
                      {key.replace(/([A-Z])/g, " $1")}
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={value} 
                        onChange={(e) => updateVar(key, e.target.value)}
                        className="w-5 h-5 border-none bg-transparent cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={value} 
                        onChange={(e) => updateVar(key, e.target.value)}
                        className="w-full h-5 border-b border-primary/10 text-[9px] font-mono uppercase bg-transparent outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-primary/10 space-y-3">
                <button 
                  onClick={copyCSS}
                  className="w-full h-10 bg-emerald-600 text-white flex items-center justify-center gap-2 text-[10px] font-black uppercase"
                >
                  <Copy size={14} /> Copy Custom Profile CSS
                </button>
                <button 
                  onClick={() => {
                      localStorage.removeItem("gonia-theme-profile");
                      window.location.reload();
                  }}
                  className="w-full h-10 border-2 border-primary/20 text-primary flex items-center justify-center gap-2 text-[10px] font-black uppercase"
                >
                  <RefreshCcw size={14} /> Factory Reset Theme
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}