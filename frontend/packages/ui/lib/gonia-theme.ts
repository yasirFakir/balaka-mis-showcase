import { goniaClassic } from "./themes/classic";
import { goniaCandy } from "./themes/candy";

/**
 * Gonia Theme Engine
 * Dynamically exports the active theme based on local storage or system settings.
 * Defaults to 'classic' (Gonia v1.5 Deep Horizon).
 */

const getActiveTheme = () => {
  // Check if we are in a browser environment
  if (typeof window === "undefined") return goniaClassic;

  const savedTheme = localStorage.getItem("gonia_theme_v2");
  
  if (savedTheme === "candy") {
    return goniaCandy;
  }
  
  return goniaClassic;
};

// Export the active theme proxy
export const gonia = getActiveTheme();

export type GoniaStatus = keyof typeof gonia.statusTheme;
export type GoniaStatusConfig = typeof gonia.statusTheme[GoniaStatus];
