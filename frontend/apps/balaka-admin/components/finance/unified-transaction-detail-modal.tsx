"use client";

import * as React from "react";
import { 
  GoniaResponsiveDialog, 
  Button, 
  Badge, 
  gonia, 
} from "@/ui";
import { format } from "date-fns";
import { 
  Eye, 
  Calendar, 
  Hash, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { UnifiedTransaction } from "@/core/types";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/core/currency-context";

interface UnifiedTransactionDetailModalProps {
  transaction: UnifiedTransaction;
  trigger?: React.ReactNode;
}

export function UnifiedTransactionDetailModal({ transaction, trigger }: UnifiedTransactionDetailModalProps) {
  const [open, setOpen] = React.useState(false);
  const { formatCurrency } = useCurrency();

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "verified": 
        return { 
          color: "text-emerald-600", 
          bg: "bg-emerald-50", 
          border: "border-emerald-200",
          icon: CheckCircle2,
          variant: "success" as const
        }; 
      case "flagged": 
        return { 
          color: "text-red-600", 
          bg: "bg-red-50", 
          border: "border-red-200",
          icon: AlertCircle,
          variant: "destructive" as const
        };
      case "pending": 
        return { 
          color: "text-amber-600", 
          bg: "bg-amber-50", 
          border: "border-amber-200",
          icon: Clock,
          variant: "warning" as const
        };
      default: 
        return { 
          color: "text-muted-foreground", 
          bg: "bg-muted/50", 
          border: "border-border",
          icon: Hash,
          variant: "outline" as const
        };
    }
  };

  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;

  const DetailItem = ({ icon: Icon, label, value, subValue, className }: any) => (
    <div className={cn("flex items-start gap-4 p-4 border-b border-primary/5 last:border-0", className)}>
      <div className="mt-1 p-2 bg-primary/5 rounded-none border border-primary/10">
        <Icon className="h-4 w-4 text-primary/60" />
      </div>
      <div className="space-y-1">
        <p className={gonia.text.label}>{label}</p>
        <p className={cn(gonia.text.body, "font-bold text-primary uppercase tracking-tight")}>{value || "—"}</p>
        {subValue && <p className={cn(gonia.text.caption, "opacity-60 font-medium lowercase tracking-tight")}>{subValue}</p>}
      </div>
    </div>
  );

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button variant="outline" size="icon" className={cn(gonia.button.base, gonia.button.outline, "h-8 w-8")} onClick={() => setOpen(true)}>
          <Eye className="h-4 w-4" />
        </Button>
      )}

      <GoniaResponsiveDialog
        isOpen={open}
        onOpenChange={setOpen}
        title="Transaction Details"
        description="Review detailed financial and audit records."
        maxWidth="md"
      >
        <div className="space-y-6">
          {/* Header Summary */}
          <div className={cn("p-6 border-2 flex flex-col items-center text-center space-y-3", gonia.radius, statusConfig.bg, statusConfig.border)}>
            <div className="flex items-center gap-2">
                {transaction.type === "INCOME" ? (
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                )}
                <StatusIcon className={cn("h-8 w-8", statusConfig.color)} />
            </div>
            <div>
              <Badge variant={statusConfig.variant} className={gonia.badge.base}>
                {transaction.status} ({transaction.type === "INCOME" ? "REVENUE" : "LIABILITY"})
              </Badge>
              <h3 className={cn(gonia.text.mono, "text-3xl font-black tracking-tighter", transaction.amount >= 0 ? "text-emerald-600" : "text-red-600")}>
                {transaction.amount >= 0 ? "+" : ""}{formatCurrency(transaction.amount)}
              </h3>
              <p className={gonia.text.caption}>Amount in SAR</p>
            </div>
          </div>

          <div className={cn("grid grid-cols-1 gap-0 border-2 border-primary/10", gonia.radius)}>
            {/* Currency Breakdown */}
            {transaction.claimed_currency && transaction.claimed_currency !== "SAR" && (
              <div className="bg-primary/5 p-4 flex items-center justify-between border-b-2 border-primary/10">
                <div className="space-y-1">
                  <p className={gonia.text.label}>Original Payment</p>
                  <p className={cn(gonia.text.mono, "text-lg font-black text-primary")}>
                    {transaction.claimed_amount?.toLocaleString()} {transaction.claimed_currency}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <p className={cn(gonia.text.label, "text-right")}>Conversion Rate</p>
                  <div className="flex items-center gap-2 text-primary font-mono font-bold text-sm">
                    1 SAR <ArrowRight className="h-3 w-3" /> {transaction.exchange_rate} {transaction.claimed_currency}
                  </div>
                </div>
              </div>
            )}

            <DetailItem 
              icon={Hash} 
              label="Category & Description" 
              value={transaction.category}
              subValue={`System Ref: ${transaction.reference}`}
            />

            {transaction.external_reference && (
              <DetailItem 
                icon={Hash} 
                label="External Reference" 
                value={transaction.external_reference}
                subValue="Provided by payer/admin"
              />
            )}

            <DetailItem 
              icon={Calendar} 
              label="Recorded Date" 
              value={transaction.date ? format(new Date(transaction.date), "PPP p") : "N/A"}
            />

            {transaction.actor_name && (
              <DetailItem 
                icon={ShieldCheck} 
                label={transaction.type === "INCOME" ? "Verified By" : "Recorded By"}
                className={transaction.type === "INCOME" ? "bg-emerald-50/30" : ""}
                value={transaction.actor_name}
              />
            )}

            {transaction.proof_url && (
              <div className="flex items-start gap-4 p-4 border-b border-primary/5 last:border-0 bg-primary/5">
                <div className="mt-1 p-2 bg-primary/5 rounded-none border border-primary/10">
                  <FileText className="h-4 w-4 text-primary/60" />
                </div>
                <div className="space-y-2">
                  <p className={gonia.text.label}>Payment Proof</p>
                  <a 
                    href={transaction.proof_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-black uppercase text-primary hover:underline"
                  >
                    <Eye className="h-3 w-3" /> View Receipt / document
                  </a>
                </div>
              </div>
            )}

            {transaction.notes && (
              <DetailItem 
                icon={FileText} 
                label="Ledger Notes" 
                value={transaction.notes}
              />
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "flex-1 h-12")} onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </GoniaResponsiveDialog>
    </>
  );
}