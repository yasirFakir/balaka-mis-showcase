"use client";

import { ProtectedRoute } from "@/components/layout/protected-route";
import { TicketList } from "@/components/support/ticket-list";
import { CreateTicketDialog } from "@/components/support/create-ticket-dialog";
import { QuickChatButton } from "@/components/support/quick-chat-button";
import { useTranslations } from "next-intl";
import { GoniaPageShell, WhatsAppButton, Card, CardContent, GoniaIcons } from "@/ui";
import { Ticket, MessageSquare } from "lucide-react";

export default function SupportPage() {
  const t = useTranslations('Support');

  return (
    <GoniaPageShell
      title={t('title')}
      subtitle={t('subtitle')}
      icon={<Ticket className="h-8 w-8" />}
      actions={
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <QuickChatButton />
          <CreateTicketDialog onTicketCreated={() => {}} />
        </div>
      }
    >
      <div className="space-y-8">
        {/* Official WhatsApp Support Card */}
        <Card className="rounded-none border-2 border-[var(--gonia-success)]/20 bg-[var(--gonia-success)]/5 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--gonia-success)]" />
          <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 text-center md:text-left">
              <h3 className="text-xl font-black uppercase tracking-tight text-[var(--gonia-primary)] flex items-center gap-3 justify-center md:justify-start">
                <MessageSquare className="h-6 w-6 text-[var(--gonia-success)]" /> {t('whatsapp_support')}
              </h3>
              <p className="text-sm font-medium text-[var(--gonia-primary)]/70 max-w-md">
                {t('whatsapp_description')}
              </p>
            </div>
            <WhatsAppButton 
              className="h-14 px-8 text-xs shadow-[4px_4px_0_0_var(--gonia-primary)]" 
              label={t('open_whatsapp')}
            />
          </CardContent>
        </Card>

        <TicketList />
      </div>
    </GoniaPageShell>
  );
}
