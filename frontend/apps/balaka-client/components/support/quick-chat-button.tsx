"use client";

import { useState } from "react";
import { Button, useNotifications } from "@/ui";
import { fetchClient } from "@/core/api";
import { useRouter } from "@/i18n/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface QuickChatButtonProps {
  className?: string;
}

/**
 * Automates ticket creation and redirects user to chat instantly.
 */
export function QuickChatButton({ className }: QuickChatButtonProps) {
  const t = useTranslations('Support');
  const [loading, setLoading] = useState(false);
  const { toast } = useNotifications();
  const router = useRouter();

  const handleQuickChat = async () => {
    setLoading(true);
    try {
      // 1. Determine Identity
      const token = localStorage.getItem("token");
      let guestId = sessionStorage.getItem("guest_support_id");
      
      if (!token && !guestId) {
          guestId = `GUEST-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          sessionStorage.setItem("guest_support_id", guestId);
      }

      // 2. Check for existing active session
      const query = guestId ? `?guest_session_id=${guestId}` : "";
      const activeTicket = await fetchClient<any>(`/api/v1/tickets/active-session${query}`);
      
      if (activeTicket && activeTicket.id) {
        toast.info("Resuming your active support session...");
        router.push(`/support/${activeTicket.id}${query}`);
        return;
      }

      // 3. If no active session, create new
      const payload: any = {
        subject: "General Support Inquiry (Quick Chat)",
        priority: "Medium",
        initial_message: "I am using the quick chat feature to connect with an agent regarding my travel needs.",
        category: "general"
      };

      if (!token && guestId) {
          payload.guest_session_id = guestId;
      }

      const ticket = await fetchClient<any>("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      toast.success("Quick chat session established!");
      const finalUrl = guestId 
        ? `/support/${ticket.id}?guest_session_id=${guestId}`
        : `/support/${ticket.id}`;
      router.push(finalUrl);
    } catch (error: any) {
      toast.error("Failed to establish quick chat. Please try the manual ticket option.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleQuickChat} 
      disabled={loading}
      className={cn("gap-2 rounded-none font-black uppercase tracking-normal text-[11px] h-10 shadow-[4px_4px_0_0_var(--gonia-warning)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all", className)}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
      {t('quick_chat')}
    </Button>
  );
}