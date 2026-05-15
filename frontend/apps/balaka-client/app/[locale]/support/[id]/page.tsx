"use client";

import { ProtectedRoute } from "@/components/layout/protected-route";
import { TicketChat } from "@/components/support/ticket-chat";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Button, GoniaPageShell } from "@/ui";
import { ArrowLeft, Ticket } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TicketDetailsPage() {
    const t = useTranslations('Support.Chat');
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    return (
        <div className="w-full md:mx-auto md:container md:py-10 h-[calc(100dvh-128px)] md:h-auto overflow-hidden">
            <TicketChat ticketId={parseInt(id)} />
        </div>
    );
}
