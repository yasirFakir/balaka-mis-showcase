"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown,
  Plus
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/core/api";
import { Logo, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, GoniaIcons, Button, gonia } from "@/ui";
import { UserProfileDialog } from "../users/user-profile-dialog";
import { navigationGroups, NavGroup, NavItem } from "@/lib/navigation-config";
import versionInfo from "../../version.json";


interface AdminSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  className?: string;
}

const TOOLTIP_CONTENT_CLASSES = "bg-primary border-white/20 rounded-none text-[10px] font-black uppercase tracking-normal text-[var(--gonia-canvas)]";

export function AdminSidebar({ isCollapsed, setIsCollapsed, className }: AdminSidebarProps) {
  const pathname = usePathname();
  const { hasPermission, user, imageKey } = useAuth();
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // Separate "Settings" from other groups
  const topGroups = useMemo(() => navigationGroups.filter(g => g.name !== "Settings"), []);
  const settingsGroup = useMemo(() => navigationGroups.find(g => g.name === "Settings"), []);

  useEffect(() => {
    const activeGroup = navigationGroups.find(group => 
      group.items?.some(item => pathname.startsWith(item.href))
    );
    if (activeGroup) {
      setOpenGroups(prev => {
        if (prev.includes(activeGroup.name)) return prev;
        return [...prev, activeGroup.name];
      });
    }
  }, [pathname]);

  const toggleGroup = (name: string) => {
    setOpenGroups(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const renderGroup = (group: NavGroup) => {
    const hasGroupPermission = !group.permission || hasPermission(group.permission);
    const visibleItems = group.items?.filter(item => !item.permission || hasPermission(item.permission)) || [];
    const hasVisibleChildren = visibleItems.length > 0;
    const isGroupVisible = hasGroupPermission && (group.href || hasVisibleChildren);

    if (!isGroupVisible) return null;

    const isExpanded = openGroups.includes(group.name);
    const hasActiveChild = group.items?.some(i => i.exact ? pathname === i.href : pathname.startsWith(i.href));
    
    if (group.href && !hasVisibleChildren) {
      const isActive = group.exact ? pathname === group.href : pathname.startsWith(group.href);
      const content = (
          <Link
              href={group.href}
              className={cn(
              "flex items-center gap-3 px-3 py-3 transition-all rounded-none border-l-4",
              isActive 
                  ? "bg-white text-primary shadow-[4px_4px_0_0_var(--gonia-accent)] border-primary z-10" 
                  : "border-transparent text-primary-foreground/60 hover:bg-white/5 hover:text-white"
              )}
          >
              <group.icon className={cn("h-5 w-5 shrink-0 mx-auto md:mx-0", isActive && "text-primary")} />
              {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-normal">{group.name}</span>}
          </Link>
      );

      return isCollapsed ? (
          <Tooltip key={group.name}>
              <TooltipTrigger asChild>{content}</TooltipTrigger>
              <TooltipContent side="right" className={TOOLTIP_CONTENT_CLASSES}>
                  {group.name}
              </TooltipContent>
          </Tooltip>
      ) : <div key={group.name}>{content}</div>;
    }

    return (
      <div key={group.name} className="space-y-1 relative">
          <Tooltip open={isCollapsed ? undefined : false}>
              <TooltipTrigger asChild>
                  <button
                      onClick={() => toggleGroup(group.name)}
                      className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 transition-all rounded-none border-l-4 border-transparent text-primary-foreground/60 hover:bg-white/5 hover:text-white group relative",
                      isExpanded && !isCollapsed && "text-white",
                      hasActiveChild && isCollapsed && "border-white bg-white/10"
                      )}
                  >
                      <group.icon className={cn("h-5 w-5 shrink-0 mx-auto md:mx-0", hasActiveChild && "text-brand-accent drop-shadow-[0_0_8px_var(--gonia-accent)]")} />
                      {!isCollapsed && (
                      <>
                          <span className="text-[10px] font-black uppercase tracking-normal flex-1 text-left">{group.name}</span>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                              <ChevronDown className="h-3.5 w-3.5" />
                          </motion.div>
                      </>
                      )}
                  </button>
              </TooltipTrigger>
              <TooltipContent side="right" className={TOOLTIP_CONTENT_CLASSES}>{group.name}</TooltipContent>
          </Tooltip>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(
                  "flex flex-col space-y-1 mt-1 relative pb-2",
                  !isCollapsed ? "ml-6 pl-4 border-l-2 border-white/10" : "items-center bg-black/10 py-2"
              )}>
                {visibleItems.map((item) => {
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  const subContent = (
                      <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                          "flex items-center gap-3 px-3 py-2.5 transition-all rounded-none border-l-4",
                          isActive 
                              ? "bg-white text-primary border-primary shadow-[3px_3px_0_0_var(--gonia-accent)]" 
                              : "border-transparent text-primary-foreground/50 hover:text-white"
                          )}
                      >
                          <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-primary")} />
                          {!isCollapsed && <span className="text-[12px] font-bold tracking-tight truncate">{item.title}</span>}
                      </Link>
                  );

                  return isCollapsed ? (
                      <Tooltip key={item.href}>
                          <TooltipTrigger asChild>{subContent}</TooltipTrigger>
                          <TooltipContent side="right" className={TOOLTIP_CONTENT_CLASSES}>{item.title}</TooltipContent>
                      </Tooltip>
                  ) : <div key={item.href} className="pr-2">{subContent}</div>;
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div 
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hidden md:flex flex-col",
          "bg-primary text-primary-foreground shadow-2xl border-r border-primary-foreground/10",
          "will-change-[width] transform-gpu",
          isCollapsed ? "w-16" : "w-64",
          className
        )}
      >
        {/* Header */}
        <div className="flex h-20 items-center border-b border-primary-foreground/10 px-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center font-bold tracking-wide transition-all w-full"
          >
            <motion.div whileHover={{ rotate: -10, scale: 1.1 }} className="shrink-0 mx-auto md:mx-0">
              <Logo className="h-10 w-10 text-white" />
            </motion.div>
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-lg ml-3 truncate font-black uppercase tracking-tighter"
              >
                Balaka Admin
              </motion.span>
            )}
          </button>
        </div>

        {/* Top Navigation */}
        <div className="flex-1 py-6 overflow-y-auto scrollbar-none no-scrollbar">
          {hasPermission("requests.manage") && (
            <div className="px-3 mb-8">
                <Link href="/requests/new">
                    <Tooltip open={isCollapsed ? undefined : false}>
                        <TooltipTrigger asChild>
                            <Button 
                                className={cn(
                                    "w-full bg-white text-primary font-black uppercase tracking-widest shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-white hover:text-primary transition-all rounded-none",
                                    isCollapsed ? "h-10 p-0 flex justify-center" : "h-12 px-4"
                                )}
                            >
                                {isCollapsed ? <Plus className="h-5 w-5" /> : (
                                    <span className="flex items-center gap-2 text-[10px]">
                                        <Plus className="h-4 w-4" /> New Entry
                                    </span>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className={TOOLTIP_CONTENT_CLASSES}>Quick Entry</TooltipContent>
                    </Tooltip>
                </Link>
            </div>
          )}

          <nav className="space-y-4 px-2">
            {topGroups.map(group => renderGroup(group))}
          </nav>
        </div>
        
        {/* Bottom Section: Settings & Profile */}
        <div className="mt-auto border-t border-primary-foreground/10 pt-4 space-y-2">
            {!isCollapsed && (
                <div className="px-6 py-2">
                    <p className="text-[8px] font-black uppercase text-white/20 tracking-[0.2em]">
                        System v{versionInfo.version}
                    </p>
                </div>
            )}

            <nav className="px-2 pb-4">
                {settingsGroup && renderGroup(settingsGroup)}
            </nav>

            <UserProfileDialog 
            trigger={
                <div className={cn(
                    "p-4 bg-black/10 cursor-pointer hover:bg-black/20 transition-colors",
                    isCollapsed && "px-2 flex justify-center"
                )}>
                <div className={cn(
                    "flex items-center gap-3",
                    !isCollapsed && "p-1"
                )}>
                    <div className={cn(
                        "bg-white/10 p-1 shrink-0 overflow-hidden h-9 w-9 border border-white/10 flex items-center justify-center",
                        gonia.radius
                    )}>
                        {user?.profile_picture ? (
                            <img 
                                src={`${API_URL}${user.profile_picture}?v=${imageKey}`} 
                                className="h-full w-full object-cover" 
                                alt="Avatar" 
                            />
                        ) : (
                            <GoniaIcons.User className="h-6 w-6 text-primary-foreground/80" />
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 overflow-hidden text-left">
                            <p className="text-sm font-black uppercase tracking-tight truncate">{user?.full_name || "Admin"}</p>
                            <p className="text-[10px] text-white/40 truncate uppercase font-mono tracking-tighter">{user?.email}</p>
                        </div>
                    )}
                </div>
                </div>
            }
            />
        </div>
      </div>
    </TooltipProvider>
  );
}
