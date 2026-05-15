"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { navigationGroups, NavGroup, NavItem } from "@/lib/navigation-config";
import { GoniaIcons } from "@/ui";
import { ChevronUp } from "lucide-react";

/**
 * Mobile Bottom Navigation for Gonia Admin.
 * Features upward-expanding sub-menus (Speed Dial style).
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveGroup(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setActiveGroup(null);
  }, [pathname]);

  const visibleGroups = navigationGroups.filter(
    (group) => !group.permission || hasPermission(group.permission)
  );

  return (
    <div 
      ref={navRef}
      className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-primary border-t border-white/10 safe-area-pb"
    >
      <div className="flex items-stretch justify-around h-16 relative">
        {visibleGroups.map((group, index) => {
          const isCurrentGroup = group.href 
            ? (group.exact ? pathname === group.href : pathname.startsWith(group.href))
            : group.items?.some(i => i.exact ? pathname === i.href : pathname.startsWith(i.href));
          
          const isOpen = activeGroup === group.name;
          const isFirst = index === 0;
          const isLast = index === visibleGroups.length - 1;

          return (
            <div key={group.name} className="flex-1 flex flex-col items-center justify-center relative">
              <AnimatePresence>
                {isOpen && group.items && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className={cn(
                        "absolute bottom-full mb-4 w-48 bg-primary border-2 border-white/10 shadow-2xl p-2 space-y-1 z-[110]",
                        isFirst ? "left-0" : isLast ? "right-0" : "left-1/2 -translate-x-1/2"
                    )}
                  >
                    {group.items.map((item) => {
                      if (item.permission && !hasPermission(item.permission)) return null;
                      const isItemActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                      
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 text-[10px] font-black uppercase tracking-normal transition-all",
                            isItemActive 
                              ? "bg-white text-primary" 
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      );
                    })}
                    {/* Little arrow at bottom of menu */}
                    <div className={cn(
                        "absolute top-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-primary/90",
                        isFirst ? "left-4" : isLast ? "right-4" : "left-1/2 -translate-x-1/2"
                    )} />
                  </motion.div>
                )}
              </AnimatePresence>

              {group.href ? (
                <Link
                  href={group.href}
                  className={cn(
                    "w-full h-full flex flex-col items-center justify-center gap-1 transition-all",
                    isCurrentGroup ? "text-white" : "text-white/40"
                  )}
                >
                  <group.icon className="h-6 w-6" />
                  <span className="text-[8px] font-black uppercase tracking-tighter">{group.name}</span>
                  {isCurrentGroup && <motion.div layoutId="activeTab" className="absolute bottom-0 w-8 h-1 bg-white" />}
                </Link>
              ) : (
                <button
                  onClick={() => setActiveGroup(isOpen ? null : group.name)}
                  className={cn(
                    "w-full h-full flex flex-col items-center justify-center gap-1 transition-all relative",
                    isCurrentGroup || isOpen ? "text-white" : "text-white/40"
                  )}
                >
                  <group.icon className="h-6 w-6" />
                  <div className="flex items-center gap-0.5">
                    <span className="text-[8px] font-black uppercase tracking-tighter">{group.name}</span>
                    <ChevronUp className={cn("h-2.5 w-2.5 transition-transform", isOpen && "rotate-180")} />
                  </div>
                  {(isCurrentGroup || isOpen) && <motion.div layoutId="activeTab" className="absolute bottom-0 w-8 h-1 bg-white" />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
