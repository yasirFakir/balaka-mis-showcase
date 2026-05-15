"use client";

import { useEffect, useState } from "react";
import { fetchClient } from "@/core/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, StatusBadge, Button, Card, CardContent, CardHeader, CardTitle, useNotifications } from "@/ui";



import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useServerEvents } from "@/lib/use-server-events";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";

interface SupportTicket {
  id: number;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

export function TicketList() {
  const t = useTranslations('Support');
  const { toast } = useNotifications();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTickets() {
    // Defensive check: Ensure token exists before making the request
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
        setLoading(false);
        return;
    }

    try {
      const response = await fetchClient<any>("/api/v1/tickets");
      // Handle both flat array and enveloped response { items, total }
      const data = Array.isArray(response) ? response : (response.items || []);
      setTickets(data);
    } catch (error: any) {
      if (error.message !== "SESSION_EXPIRED") {
        console.error("Failed to load tickets", error);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  useServerEvents((event, data) => {
     // Ticket created or updated
     if ((event === "ticket_created" || event === "ticket_updated")) {
         loadTickets();
     }
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open": return "warning";
      case "in progress": return "processing";
      case "resolved": return "success";
      case "closed": return "secondary";
      default: return "outline";
    }
  };

  const getTranslatedStatus = (status: string) => {
      const key = status.toLowerCase().replace(" ", "_");
      // @ts-ignore
      return t.has(`Status.${key}`) ? t(`Status.${key}`) : status;
  };

  const getTranslatedPriority = (priority: string) => {
      const key = priority.toLowerCase();
      // @ts-ignore
      return t.has(`Priority.${key}`) ? t(`Priority.${key}`) : priority;
  };

  if (loading) {
      return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
  }

  if (tickets.length === 0) {
      return (
          <Card>
              <CardHeader><CardTitle>{t('my_tickets')}</CardTitle></CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                  {t('no_tickets')}
              </CardContent>
          </Card>
      );
  }

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>{t('my_tickets')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">{t('Table.id')}</TableHead>
              <TableHead>{t('Table.subject')}</TableHead>
              <TableHead>{t('Table.status')}</TableHead>
              <TableHead>{t('Table.priority')}</TableHead>
              <TableHead>{t('Table.date')}</TableHead>
              <TableHead className="text-right">{t('Table.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((tItem) => (
              <TableRow key={tItem.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">#{tItem.id}</TableCell>
                <TableCell className="font-medium">{tItem.subject}</TableCell>
                <TableCell>
                  <StatusBadge status={tItem.status} className="h-6" />
                </TableCell>
                <TableCell className="text-xs uppercase font-bold tracking-tighter">
                  <Badge variant={tItem.priority === "High" ? "destructive" : "secondary"} className="h-5 px-2">
                    {getTranslatedPriority(tItem.priority)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono">
                    {format(new Date(tItem.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/support/${tItem.id}`}>
                    <Button variant="outline" size="sm" className="h-7">
                      {t('Table.view')}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
