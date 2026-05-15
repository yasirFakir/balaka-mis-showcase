"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { fetchClient } from "@/core/api";
import { useNotifications } from "../lib/notification-context";
import { MessageSquare, Loader2 } from "lucide-react";
import { SupportTicket } from "@/core/types";

export interface LiveChatFABProps {
  className?: string;
}

/**
 * Gonia Live Support FAB.
 * Sits above the WhatsApp FAB and indicates active presence.
 * Programmatically establishes a chat session on click.
 */
export function LiveChatFAB({ className }: LiveChatFABProps) {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const { toast } = useNotifications();

  const handleQuickChat = async () => {
    // Prevent multiple clicks
    if (loading) return;
    
    // Check if we are already on a chat page to avoid infinite loops/redundancy
    if (window.location.pathname.includes("/support/")) return;

    setLoading(true);
    try {
      // 1. Determine Identity (Token for logged-in, sessionStorage for guests)
      const token = localStorage.getItem("token");
      let guestId = sessionStorage.getItem("guest_support_id");
      
      if (!token && !guestId) {
          guestId = `GUEST-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          sessionStorage.setItem("guest_support_id", guestId);
      }

      // 2. Check for existing active session
      const query = guestId ? `?guest_session_id=${guestId}` : "";
      const activeTicket = await fetchClient<SupportTicket>(`/api/v1/tickets/active-session${query}`);
      
      if (activeTicket && activeTicket.id) {
        router.push(`/support/${activeTicket.id}${query}`);
        return;
      }

      // 3. If no active session, create new
      const payload: Record<string, any> = {
        subject: token ? "Live Support Inquiry" : "Guest Support Inquiry",
        priority: "Medium",
        initial_message: token 
            ? "I initiated this chat via the Live Support bubble. I need assistance with your services."
            : "I am a guest user requesting immediate support assistance.",
        category: "general"
      };

      if (!token && guestId) {
          payload.guest_session_id = guestId;
      }

      const ticket = await fetchClient<SupportTicket>("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      // Redirect using next router
      const finalUrl = guestId 
        ? `/support/${ticket.id}?guest_session_id=${guestId}`
        : `/support/${ticket.id}`;
        
      router.push(finalUrl);
    } catch (error: any) {
      if (error.message === "SESSION_EXPIRED") return;
      // Show actual error from API if available, otherwise fallback to generic
      const errorMsg = error.message || "Support desk is busy. Please try the support page.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("fixed bottom-[100px] right-6 z-[100] flex items-center group", className)}>
      {/* Label - Appears on Hover */}
      <motion.div 
        initial={{ opacity: 0, x: 10 }}
        whileHover={{ opacity: 1, x: 0 }}
        className="mr-3 bg-primary text-white text-[10px] font-black uppercase tracking-normal px-3 py-1.5 rounded-none shadow-[3px_3px_0_0_var(--gonia-accent)] pointer-events-none opacity-0 group-hover:opacity-100 hidden md:block"
      >
        Chat Support
      </motion.div>

      <motion.button
        data-gonia-fab="true"
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.05, boxShadow: "none" }}
        whileTap={{ scale: 0.95 }}
        onClick={handleQuickChat}
        disabled={loading}
        className={cn(
          "h-12 w-12 flex items-center justify-center bg-primary text-white border-2 border-primary",
          "rounded-none shadow-[4px_4px_0_0_var(--gonia-accent)] transition-all duration-300",
          "hover:bg-white hover:text-primary relative",
          loading && "opacity-80 grayscale"
        )}
        title="Start Live Chat"
      >
        {/* Live Animation Pulse */}
        {!loading && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-primary"></span>
          </span>
        )}
        
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </motion.button>
    </div>
  );
}
