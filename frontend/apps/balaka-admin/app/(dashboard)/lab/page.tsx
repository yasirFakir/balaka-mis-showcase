"use client";

import { ProtectedRoute } from "@/components/shared/protected-route";
import { ComponentExample } from "@/components/shared/component-example";
import { 
  gonia, 
  StatusBadge, 
  Badge, 
  StatusTimeline, 
  GoniaCard, 
  GoniaCardHeader, 
  H2,
  Label,
  GoniaStack,
  GoniaContainer,
  Separator
} from "@/ui";
import { cn } from "@/lib/utils";

const MOCK_HISTORY = [
  {
    id: 3,
    new_status: "Processing",
    changed_at: new Date().toISOString(),
    changed_by: { full_name: "Roman Agent", email: "roman@balaka.com" }
  },
  {
    id: 2,
    new_status: "Approved",
    changed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    changed_by: { full_name: "Admin Office", email: "admin@airbalakatravel.com" }
  },
  {
    id: 1,
    new_status: "Pending",
    changed_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    changed_by: { full_name: "System", email: "system@balaka.com" }
  }
];

export default function LabPage() {
  const serviceStatuses = [
    "Pending", 
    "Approved", 
    "Verifying Information", 
    "Processing", 
    "Service on Hold", 
    "In Transit", 
    "Received at Warehouse", 
    "Out for Delivery", 
    "Completed", 
    "Rejected", 
    "Cancelled", 
    "Refunded"
  ];

  const paymentStatuses = [
    { label: "Verified", variant: "success" as const },
    { label: "Pending", variant: "warning" as const, className: "text-white" },
    { label: "Flagged", variant: "destructive" as const },
    { label: "Rejected", variant: "destructive" as const },
    { label: "Incomplete", variant: "outline" as const }
  ];

  const paymentMethods = [
    { label: "Cash", color: "bg-[var(--gonia-success)] text-white" },
    { label: "Bank Transfer", color: "bg-[var(--gonia-primary)] text-white" },
    { label: "bKash", color: "bg-[var(--gonia-error)] text-white" },
    { label: "Nagad", color: "bg-[var(--gonia-warning)] text-white" },
    { label: "Card Payment", color: "bg-[var(--gonia-primary-deep)] text-white" },
    { label: "Cheque", color: "bg-[var(--gonia-secondary)] text-white" }
  ];

  const ticketStatuses = ["Open", "In Progress", "Resolved", "Closed", "Escalated"];
  const ticketPriorities = [
    { label: "Low", color: "bg-[var(--gonia-limestone)] text-[var(--gonia-primary-deep)]" },
    { label: "Medium", color: "bg-[var(--gonia-warning)] text-white" },
    { label: "High", color: "bg-[var(--gonia-accent-saturated)] text-white" },
    { label: "Urgent", color: "bg-[var(--gonia-error)] text-white" }
  ];

  const categories = [
    "General",
    "Information Update",
    "File Issue",
    "Technical Support",
    "Billing & Payment",
    "Cargo",
    "Ticketing",
    "Internal"
  ];

  return (
    <ProtectedRoute requiredRoles={["Admin"]}>
      <GoniaContainer className="py-10 space-y-16">
        <header className="space-y-2 border-l-4 border-primary pl-6 py-2 bg-primary/5">
            <h1 className={cn(gonia.text.h1, "text-4xl")}>Gonia Component Lab</h1>
            <p className={gonia.text.caption}>Visual documentation and testing suite for internal UI standards.</p>
        </header>

        <GoniaStack gap="xl">
          {/* Section: Status Ecosystem */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-primary/10" />
              <H2 className="text-sm opacity-60">Status Ecosystem</H2>
              <div className="h-px flex-1 bg-primary/10" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <Label className={gonia.text.label}>Service Operations</Label>
                    <div className="flex flex-wrap gap-3 p-6 bg-white border border-primary/10">
                        {serviceStatuses.map(status => (
                            <StatusBadge key={status} status={status} />
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <Label className={gonia.text.label}>Support Ticket System</Label>
                    <div className="flex flex-wrap gap-3 p-6 bg-white border border-primary/10">
                        {ticketStatuses.map(status => (
                            <StatusBadge key={status} status={status} />
                        ))}
                    </div>
                </div>
            </div>
          </section>

          {/* Section: Category Standards */}
          <section className="space-y-6">
            <H2 className="text-sm opacity-60 flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Category Standards
            </H2>
            <div className="flex flex-wrap gap-3 p-8 bg-white border border-primary/10">
              {categories.map(cat => (
                <div key={cat} className="flex flex-col items-center gap-2">
                  <Badge className={cn("h-6 border-none shadow-none font-bold px-4", gonia.categoryTheme[cat])}>
                    {cat}
                  </Badge>
                  <span className="text-[8px] font-mono text-primary/30 uppercase">Theme: {cat.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Section: Payment Status & Methods */}
            <div className="space-y-10">
              <section className="space-y-6">
                <H2 className="text-sm opacity-60 flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Financial Statuses
                </H2>
                <div className="flex flex-wrap gap-3 p-6 bg-white border border-primary/10">
                  {paymentStatuses.map(s => (
                    <Badge key={s.label} variant={s.variant} className={cn("h-7 px-4 shadow-none", s.className)}>
                      {s.label}
                    </Badge>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <H2 className="text-sm opacity-60 flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Support Priorities
                </H2>
                <div className="flex flex-wrap gap-3 p-6 bg-white border border-primary/10">
                  {ticketPriorities.map(p => (
                    <Badge key={p.label} className={cn("h-7 px-4 border-none font-bold shadow-none", p.color)}>
                      {p.label}
                    </Badge>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <H2 className="text-sm opacity-60 flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Payment Gateways
                </H2>
                <div className="flex flex-wrap gap-3 p-6 bg-white border border-primary/10">
                  {paymentMethods.map(method => (
                    <Badge key={method.label} className={cn("h-7 px-4 border-none font-bold shadow-none", method.color)}>
                      {method.label}
                    </Badge>
                  ))}
                </div>
              </section>
            </div>

            {/* Section: Service Tracker */}
            <section className="space-y-6">
              <H2 className="text-sm opacity-60 flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Service Tracker Outline
              </H2>
              <GoniaCard className="p-8 bg-white">
                <StatusTimeline 
                  history={MOCK_HISTORY as any} 
                  currentStatus="Processing" 
                />
              </GoniaCard>
            </section>
          </div>
        </GoniaStack>

        <Separator className="bg-primary/10 h-1" />

        <div className="space-y-8">
            <header className="space-y-1">
                <H2 className="text-2xl">Visual Components Library</H2>
                <p className={gonia.text.caption}>Core UI primitives and interaction patterns.</p>
            </header>
            <ComponentExample />
        </div>
      </GoniaContainer>
    </ProtectedRoute>
  );
}
