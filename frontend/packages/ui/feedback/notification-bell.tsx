"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Bell, Check, ExternalLink, X, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

// Import types only if needed for casting, avoid hooks that throw if no context
import { cn } from "../lib/utils"
import { Button } from "../base/button"
import { Badge } from "../base/badge"
import { useNotifications } from "../lib/notification-context"

/**
 * Robust locale detection that doesn't throw if next-intl context is missing.
 */
function useSafeLocale() {
  try {
    // We dynamically import/require to prevent static analysis from forcing context
    const { useLocale } = require("next-intl");
    return useLocale();
  } catch (e) {
    return 'en';
  }
}

export function NotificationBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllRead } = useNotifications()
  const [isOpen, setIsOpen] = React.useState(false)
  const router = useRouter()
  const locale = useSafeLocale();

  const handleNotificationClick = (n: any) => {
    if (!n.is_read) markAsRead(n.id)
    if (n.link) {
      setIsOpen(false)
      router.push(n.link)
    }
  }

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button className="relative p-2 text-primary hover:bg-primary/5 transition-colors rounded-none outline-none group">
          <Bell className={cn("h-5 w-5 transition-transform group-hover:rotate-12", unreadCount > 0 && "animate-pulse")} />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center bg-destructive text-[10px] font-black text-white rounded-none border border-white"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={8}
          className="z-[100] w-80 md:w-96 overflow-hidden rounded-none border-2 border-primary bg-white shadow-2xl animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center justify-between border-b border-primary/10 bg-primary/5 p-4">
            <h3 className="text-xs font-black uppercase tracking-normal text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[9px] font-black uppercase tracking-tighter text-primary/60 hover:text-primary transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto technical-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary/20" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center opacity-30">
                <Bell className="h-8 w-8 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-normal">No New Alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-primary/5">
                {notifications.map((n) => {
                  const displayTitle = (locale === 'bn' && n.title_bn) ? n.title_bn : n.title;
                  const displayMessage = (locale === 'bn' && n.message_bn) ? n.message_bn : n.message;
                  
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "group relative flex flex-col gap-1 p-4 cursor-pointer transition-all hover:bg-primary/[0.02]",
                        !n.is_read ? "bg-white border-l-4 border-primary" : "bg-[var(--gonia-canvas)] border-l-4 border-transparent opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className={cn(
                            "text-[11px] font-black uppercase tracking-tight", 
                            !n.is_read ? "text-primary" : "text-muted-foreground",
                            locale === 'bn' && "font-bengali"
                        )}>
                          {displayTitle}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-muted-foreground whitespace-nowrap">
                          {format(new Date(n.created_at), "HH:mm")}
                        </span>
                      </div>
                      <p className={cn(
                          "text-xs font-medium text-muted-foreground leading-relaxed",
                          locale === 'bn' && "font-bengali"
                      )}>
                        {displayMessage}
                      </p>
                      {n.link && (
                        <div className="mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-normal text-primary opacity-0 group-hover:opacity-100 transition-opacity underline underline-offset-2">
                          <ExternalLink className="h-3 w-3" /> View Record
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-primary/10 bg-primary/5 p-3 text-center">
             <p className="text-[8px] font-black uppercase tracking-normal text-primary/40 italic">
                System Operational Monitor
             </p>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}