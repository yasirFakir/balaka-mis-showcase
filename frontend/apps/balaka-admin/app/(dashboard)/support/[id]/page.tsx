"use client";

import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminTicketChat } from "@/components/support/admin-ticket-chat";
import { useParams, useRouter } from "next/navigation";
import { Button, gonia } from "@/ui";
import { ArrowLeft } from "lucide-react";

export default function SupportTicketPage() {
    const params = useParams();
    const id = params.id as string;

    return (
        <ProtectedRoute requiredPermissions={["tickets.view_all", "tickets.view_assigned", "tickets.create"]}>
            <AdminTicketChat ticketId={parseInt(id)} />
        </ProtectedRoute>
    );
}

import { cn } from "@/lib/utils";

