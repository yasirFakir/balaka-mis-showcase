"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Cloud } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Plane {
  id: string;
  direction: "ltr" | "rtl";
  top: string;
}

interface Ship {
  id: string;
  direction: "ltr" | "rtl";
}

const PHRASES = [
  "Seamless Travel",
  "Trusted Partner",
  "Safe Cargo",
  "Global Logistics",
  "Best Service Ever",
  "Expert Visas",
  "Hajj & Umrah",
  "24/7 Support",
  "Authorized Agent",
  "Door to Door"
];

// Pre-defined static arrays to avoid re-creation on render
const CLOUD_LAYERS = {
    slow: [...Array(8)],
    mid: [...Array(5)],
    fast: [...Array(4)]
};

export function HeroAnimation() {
  const [planes, setPlanes] = useState<Plane[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const spawnPlane = () => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Date.now() + Math.random()).toString();
      const direction = Math.random() > 0.5 ? "ltr" : "rtl";
      const randomTop = Math.floor(Math.random() * 35) + 10;
      const newPlane: Plane = { id: id as any, direction, top: `${randomTop}%` };
      setPlanes(prev => [...prev, newPlane]);
      setTimeout(() => {
        setPlanes(prev => prev.filter(p => p.id !== id));
      }, 30000);
    };

    spawnPlane();
    // Reduce spawn rate on mobile (15s vs 9s)
    const interval = isMobile ? 15000 : 9000;
    const planeInterval = setInterval(spawnPlane, interval);
    return () => clearInterval(planeInterval);
  }, [isMobile]);

  useEffect(() => {
    const spawnShip = () => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Date.now() + Math.random()).toString();
      const direction = Math.random() > 0.5 ? "ltr" : "rtl";
      const newShip: Ship = { id: id as any, direction };
      setShips(prev => [...prev, newShip]);
      setTimeout(() => {
        setShips(prev => prev.filter(s => s.id !== id));
      }, 70000);
    };

    spawnShip();
    // Reduce spawn rate on mobile (25s vs 15s)
    const interval = isMobile ? 25000 : 15000;
    const shipInterval = setInterval(spawnShip, interval);
    return () => clearInterval(shipInterval);
  }, [isMobile]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-transparent select-none">
      
      {/* --- ATMOSPHERIC LAYER (Parallax Clouds) --- */}
      <div className="absolute top-[5%] left-0 w-full overflow-hidden opacity-25 pointer-events-none">
        <motion.div className="flex w-[200%] gap-[15vw]" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 180, repeat: Infinity, ease: "linear" }}>
           {CLOUD_LAYERS.slow.map((_, i) => (<Cloud key={i} size={isMobile ? 40 : 100} className="text-[var(--gonia-secondary)] fill-[var(--gonia-secondary)] shrink-0" />))}
        </motion.div>
      </div>
      <div className="absolute top-[12%] left-0 w-full overflow-hidden opacity-30 pointer-events-none">
        <motion.div className="flex w-[200%] gap-[25vw]" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 120, repeat: Infinity, ease: "linear" }}>
           {CLOUD_LAYERS.mid.map((_, i) => (<Cloud key={i} size={isMobile ? 35 : 85} className="text-[var(--gonia-warning)] fill-[var(--gonia-warning)] shrink-0" />))}
        </motion.div>
      </div>
      <div className="absolute top-[3%] left-0 w-full overflow-hidden opacity-20 pointer-events-none">
        <motion.div className="flex w-[200%] gap-[35vw]" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 90, repeat: Infinity, ease: "linear" }}>
           {CLOUD_LAYERS.fast.map((_, i) => (<Cloud key={i} size={isMobile ? 80 : 220} className="text-[var(--gonia-secondary)] fill-[var(--gonia-secondary)] shrink-0" />))}
        </motion.div>
      </div>

      {/* --- AERIAL LAYER (Planes) --- */}
      <AnimatePresence>
        {planes.map((plane) => (
          <motion.div
            key={plane.id}
            className="absolute z-10 opacity-80"
            style={{ top: plane.top, willChange: "transform" }}
            initial={{ x: plane.direction === "ltr" ? "-30vw" : "130vw" }}
            animate={{ x: plane.direction === "ltr" ? "130vw" : "-30vw" }}
            transition={{ duration: isMobile ? 20 : 25, ease: "linear" }}
          >
            <motion.div
                animate={{ y: [0, -30, 0], rotate: plane.direction === "ltr" ? [-1, -3, -1] : [1, 3, 1] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                className={isMobile ? "scale-50" : "scale-100"}
            >
                <div className={plane.direction === "rtl" ? "scale-x-[-1]" : ""}>
                    <div className="relative">
                        <div className="absolute top-[18px] left-[-15px] flex">
                            {[...Array(isMobile ? 2 : 4)].map((_, i) => (
                                <motion.div key={i} className="absolute w-2.5 h-2.5 bg-[var(--gonia-warning)]/60 backdrop-blur-sm" initial={{ x: 0, scale: 1, opacity: 1 }} animate={{ x: -100, scale: 0, opacity: 0 }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: i * 0.5 }} />
                            ))}
                        </div>
                        <svg width={isMobile ? "70" : "100"} height={isMobile ? "28" : "40"} viewBox="0 0 140 50" fill="none" className="text-primary drop-shadow-2xl">
                            <path d="M20 28 C20 21 30 18 45 18 H110 C125 18 138 21 140 25 C138 29 125 32 110 32 H45 C30 32 20 29 20 28 Z" fill="currentColor" />
                            <path d="M40 18 L22 3 H48 L58 18 H40 Z" fill="currentColor" />
                            <path d="M75 30 L60 44 H90 L100 30 H75 Z" fill="currentColor" className="opacity-90" />
                            <rect x="70" y="34" width="20" height="8" rx="2" fill="var(--gonia-ink)" />
                            <path d="M122 20 H132 L130 24 H122 V20 Z" fill="white" className="opacity-60" />
                        </svg>
                    </div>
                </div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* --- SEA LAYER (Ships) --- */}
      <div className="absolute bottom-0 w-full h-[25vh] overflow-hidden flex flex-col justify-end">
          <AnimatePresence>
            {ships.map((ship) => (
              <motion.div
                key={ship.id}
                className="absolute bottom-[20px] z-10 opacity-90"
                initial={{ x: ship.direction === "ltr" ? "-40vw" : "140vw" }}
                animate={{ x: ship.direction === "ltr" ? "140vw" : "-40vw" }}
                transition={{ duration: isMobile ? 45 : 60, ease: "linear" }}
                style={{ willChange: "transform" }}
              >
                {/* 1. Scale Wrapper */}
                <div className={isMobile ? "scale-[0.4]" : "scale-100"}>
                  {/* 2. Flip Wrapper */}
                  <div className={ship.direction === "rtl" ? "scale-x-[-1]" : ""}>
                    <motion.div animate={{ y: [0, 5, 0], rotate: [0, 1, -1, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
                      <svg width={isMobile ? "100" : "150"} height={isMobile ? "46" : "70"} viewBox="0 0 100 50" fill="none" className="text-[var(--gonia-primary)]">
                          <path d="M0 32 L10 46 H90 L100 32 H0 Z" fill="currentColor" stroke="var(--gonia-ink)" strokeWidth="0.6" />
                          <rect x="82" y="22" width="12" height="10" fill="var(--gonia-secondary)" stroke="var(--gonia-ink)" strokeWidth="0.6"/>
                          <rect x="84" y="24" width="6" height="3" fill="var(--gonia-warning)" opacity="0.6" /> 
                          <rect x="10" y="26" width="8" height="6" fill="var(--gonia-warning)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                          <rect x="18" y="26" width="8" height="6" fill="var(--gonia-error)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                          <rect x="26" y="26" width="8" height="6" fill="var(--gonia-primary)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                          <rect x="34" y="26" width="8" height="6" fill="var(--gonia-secondary)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                          <rect x="42" y="26" width="8" height="6" fill="var(--gonia-warning)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                          <rect x="50" y="26" width="8" height="6" fill="var(--gonia-error)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                          <rect x="14" y="20" width="8" height="6" fill="var(--gonia-secondary)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                          <rect x="22" y="20" width="8" height="6" fill="var(--gonia-warning)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                          <rect x="30" y="20" width="8" height="6" fill="var(--gonia-error)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                          <rect x="38" y="20" width="8" height="6" fill="var(--gonia-primary)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                          <rect x="22" y="14" width="8" height="6" fill="var(--gonia-error)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                          <rect x="30" y="14" width="8" height="6" fill="var(--gonia-primary)" stroke="var(--gonia-ink)" strokeWidth="0.4" />
                      </svg>
                    </motion.div>
                    <motion.div className="absolute bottom-[5px] left-[-40px] w-32 h-2 bg-white/40 blur-sm rounded-full" animate={{ width: [80, 120, 80], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Ocean Waves */}
          <div className="absolute bottom-0 w-[200%] h-32 opacity-50 text-[var(--gonia-warning)]">
              <motion.svg className="w-full h-full fill-current" viewBox="0 0 1200 120" preserveAspectRatio="none" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                  <path d="M0,60 C150,90 300,30 450,60 C600,90 750,30 900,60 C1050,90 1200,30 1350,60 V120 H0 Z" />
              </motion.svg>
          </div>
          <div className="absolute -bottom-4 w-[200%] h-32 opacity-40 text-[var(--gonia-secondary)]">
              <motion.svg className="w-full h-full fill-current" viewBox="0 0 1200 120" preserveAspectRatio="none" animate={{ x: ["-50%", "0%"] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}>
                  <path d="M0,60 C200,30 400,90 600,60 C800,30 1000,90 1200,60 V120 H0 Z" />
              </motion.svg>
          </div>
      </div>
    </div>
  );
}