"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, X, Check, ArrowUpRight, AlertCircle, Info, CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation"
import { cn } from "../lib/utils"
import { useNotifications } from "../lib/notification-context"
import { Button } from "../base/button"
import { Notification } from "@/core/types"

/**
 * Robust locale detection that doesn't throw if next-intl context is missing.
 */
function useSafeLocale() {
    try {
      const { useLocale } = require("next-intl");
      return useLocale();
    } catch (e) {
      return 'en';
    }
}

export function NotificationToast() {
  const { activeToasts, removeToast, markAsRead } = useNotifications()
  
  return (
    <div className="fixed top-20 right-4 md:right-8 z-[200] pointer-events-none flex flex-col gap-3 items-end overflow-visible max-h-[80vh]">
      <AnimatePresence mode="popLayout">
        {activeToasts.map((notification, index) => (
          <ToastItem 
            key={notification.id} 
            notification={notification} 
            removeToast={removeToast}
            markAsRead={markAsRead}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ 
    notification, 
    removeToast,
    markAsRead 
}: { 
    notification: Notification, 
    removeToast: (id: string | number) => void,
    markAsRead: (id: string | number) => Promise<void>
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isBtnHovered, setIsBtnHovered] = React.useState(false)
  const [isRevealed, setIsRevealed] = React.useState(false)
  const [isDismissing, setIsDismissing] = React.useState(false)
  const router = useRouter()
  const locale = useSafeLocale();

  // Responsive check
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // SEQUENCE: Reveal
  React.useEffect(() => {
    if (notification.id) {
      setIsDismissing(false)
      setIsRevealed(false)
      const timer = setTimeout(() => setIsRevealed(true), 400)
      return () => clearTimeout(timer)
    }
  }, [notification.id])

  // Helper for staged dismissal
  const triggerDismissal = React.useCallback(() => {
    setIsHovered(false) // Step 1: Close drawer height
    setIsRevealed(false) // Step 2: Slide header back (width)
    setIsDismissing(true)
    setTimeout(() => {
      removeToast(notification.id) // Step 3: Remove from state
    }, 400) 
  }, [removeToast, notification.id])

  // SEQUENCE: Auto-dismiss (5s for transient, 15s for persistent)
  React.useEffect(() => {
    if (notification && !isHovered && !isDismissing) {
      const duration = notification.is_transient ? 5000 : 15000;
      const dismissTimer = setTimeout(() => {
        triggerDismissal()
      }, duration)
      return () => clearTimeout(dismissTimer)
    }
  }, [notification, isHovered, isDismissing, triggerDismissal])

  const handleAction = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetLink = notification.link;
    const id = notification.id;
    
    triggerDismissal();
    if (!notification.is_transient) {
        await markAsRead(id);
    }
    
    if (targetLink) router.push(targetLink);
  }

  const handleMarkOnly = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = notification.id;
    triggerDismissal();
    if (!notification.is_transient) {
        await markAsRead(id);
    }
  }

  const type = notification.notification_type;
  const isError = type === "error";
  const isSuccess = type === "success";
  const isLoading = type === "loading";
  const isWarning = type === "warning";
  const isInfo = type === "info" || type === "profile_updated";
  const isChat = type === "chat" || type === "message" || type === "support_message";

  const getIcon = () => {
      if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
      if (isError) return <AlertCircle className="h-4 w-4" />;
      if (isSuccess) return <CheckCircle2 className="h-4 w-4" />;
      if (isWarning) return <AlertCircle className="h-4 w-4" />;
      if (isInfo) return <Info className="h-4 w-4" />;
      if (isChat) return <MessageSquare className="h-4 w-4" />;
      return <Bell className={cn("h-4 w-4", !isHovered && !notification.is_transient && "animate-pulse")} />;
  };

  const getHexColor = () => {
      if (isError) return "var(--gonia-error)"; // Destructive
      if (isSuccess || isLoading) return "var(--gonia-primary)"; // Primary
      if (isWarning) return "var(--gonia-warning)"; // Leaf Gold
      if (isInfo) return "var(--gonia-secondary)"; // Secondary
      if (isChat) return "#065084"; // Air Balaka Deep Blue
      return "var(--gonia-primary)"; // Default Primary
  };

  const getHeaderLabel = () => {
      if (isLoading) return "System Processing";
      if (isError) return "Critical Alert";
      if (isSuccess) return "Action Verified";
      if (isWarning) return "Attention Required";
      if (isInfo) return "Information";
      if (isChat) return "New Message";
      if (notification.is_transient) return "System Event";
      return "Operational Alert";
  };

  const displayTitle = (locale === 'bn' && notification.title_bn) ? notification.title_bn : notification.title;
  const displayMessage = (locale === 'bn' && notification.message_bn) ? notification.message_bn : notification.message;

  return (
    <motion.div
      layout
      key={notification.id}
      drag="x"
      dragConstraints={{ left: 0, right: 300 }}
      dragElastic={0.05}
      onDragEnd={(_: any, info: any) => {
          // Slide to close logic for mobile.
          if (info.offset.x > 80 || info.velocity.x > 500) {
              triggerDismissal();
          }
      }}
      initial={{ x: 400, opacity: 0 }}
      animate={{ 
        x: 0, 
        opacity: 1,
      }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ 
        type: "spring", 
        damping: 25, 
        stiffness: 200,
      }}
      className="pointer-events-none"
    >
      <div
        onMouseEnter={() => !isMobile && !isDismissing && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        onClick={() => isMobile && !isDismissing && setIsHovered(!isHovered)}
        className={cn(
          "pointer-events-auto flex flex-col bg-white border-2 overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-300",
          isRevealed ? "w-[320px]" : "w-12"
        )}
        style={{ 
            borderColor: getHexColor(),
            boxShadow: `4px 4px 0 0 ${getHexColor()}`
        }}
      >
        {/* HEADER ROW */}
        <div className={cn(
            "flex items-stretch min-h-[3rem] w-full relative transition-all duration-300",
            isHovered ? "h-auto" : "h-12"
        )}>
          {/* Header Content - Visible only when wide */}
          <div className={cn(
              "flex-1 flex items-center justify-between px-4 py-2 transition-opacity duration-300",
              isRevealed ? "opacity-100" : "opacity-0 invisible"
          )}>
              <div className="flex flex-col min-w-0 pr-10 max-w-[250px]">
                <span className="text-[8px] font-black uppercase tracking-normal opacity-60" style={{ color: getHexColor() }}>
                    {getHeaderLabel()}
                </span>
                <span className={cn(
                    "font-black uppercase tracking-tight leading-tight block",
                    isHovered ? "break-words" : "truncate",
                    isMobile ? "text-[10px]" : "text-[11px]",
                    locale === 'bn' && "font-bengali"
                )} style={{ color: getHexColor() }}>
                  {displayTitle}
                </span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); triggerDismissal(); }}
                className="p-1 hover:bg-black/5 text-muted-foreground transition-colors shrink-0 absolute right-12 top-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
          </div>

          {/* Icon Box - Anchored Right */}
          <div className="absolute right-0 h-full w-12 flex items-center justify-center text-white border-l border-white/10 shrink-0"
               style={{ backgroundColor: getHexColor() }}>
            {getIcon()}
          </div>
        </div>

        {/* HOVER DRAWER */}
        <AnimatePresence>
          {isHovered && isRevealed && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full border-t border-black/5 bg-[var(--gonia-canvas)]"
            >
              <div className={cn(isMobile ? "p-3" : "p-4", "space-y-3")}>
                <div onClick={() => handleAction()} className={cn(
                    "group/msg",
                    notification.link ? "cursor-pointer" : "cursor-default"
                )}>
                  <p className={cn(
                      "font-medium text-muted-foreground leading-relaxed break-words",
                      isMobile ? "text-[10px]" : "text-[11px]",
                      locale === 'bn' && "font-bengali"
                  )}>
                    {displayMessage}
                  </p>
                  {notification.link && (
                    <div className="mt-2 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-normal underline underline-offset-2"
                         style={{ color: getHexColor() }}>
                      View Details <ArrowUpRight className="h-3 w-3" />
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-black/5">
                  <Button 
                    onClick={handleMarkOnly}
                    onMouseEnter={() => setIsBtnHovered(true)}
                    onMouseLeave={() => setIsBtnHovered(false)}
                    variant="ghost"
                    className="w-full h-8 rounded-none border border-black/10 font-black uppercase text-[8px] tracking-normal transition-all"
                    style={{ 
                        color: isBtnHovered ? 'white' : getHexColor(),
                        backgroundColor: isBtnHovered ? getHexColor() : 'transparent'
                    }}
                  >
                    <Check className="mr-1.5 h-3 w-3" /> 
                    {notification.is_transient ? "Dismiss Message" : "Acknowledge Alert"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
