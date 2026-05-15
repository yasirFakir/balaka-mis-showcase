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
  User as UserIcon, 
  Hash, 
  CreditCard, 
  ArrowRight,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Transaction } from "@/core/types";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/core/currency-context";

interface TransactionDetailModalProps {
  transaction: Transaction;
  trigger?: React.ReactNode;
}

export function TransactionDetailModal({ transaction, trigger }: TransactionDetailModalProps) {
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
        description="Detailed overview of the recorded transaction."
        maxWidth="md"
      >
        <div className="space-y-6">
          {/* Header Summary */}
          <div className={cn("p-6 border-2 flex flex-col items-center text-center space-y-3", gonia.radius, statusConfig.bg, statusConfig.border)}>
            <StatusIcon className={cn("h-8 w-8", statusConfig.color)} />
            <div>
              <Badge variant={statusConfig.variant} className={gonia.badge.base}>
                {transaction.status}
              </Badge>
              <h3 className={cn(gonia.text.mono, "text-3xl font-black tracking-tighter text-primary mt-2")}>
                {formatCurrency(transaction.amount)}
              </h3>
              <p className={gonia.text.caption}>Amount in SAR</p>
            </div>
          </div>

          <div className={cn("grid grid-cols-1 gap-0 border-2 border-primary/10", gonia.radius)}>
            {/* Currency Breakdown */}
            {transaction.claimed_currency !== "SAR" && (
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
              label="Transaction Reference" 
              value={transaction.transaction_id}
              subValue={transaction.client_reference_id ? `Client Ref: ${transaction.client_reference_id}` : undefined}
            />

            <DetailItem 
              icon={Calendar} 
              label="Transaction Date" 
              value={format(new Date(transaction.created_at), "PPP p")}
            />

            <DetailItem 
              icon={CreditCard} 
              label="Payment Method" 
              value={transaction.payment_method}
            />

            <DetailItem 
              icon={UserIcon} 
              label="Associated User" 
              value={transaction.user?.full_name || "Unknown"}
              subValue={transaction.user?.email}
            />

            {transaction.status === "Verified" && (
              <DetailItem 
                icon={ShieldCheck} 
                label="Verified By" 
                className="bg-emerald-50/30"
                value={transaction.verified_by?.full_name || "System"}
                subValue={transaction.verified_at ? `Approved on ${format(new Date(transaction.verified_at), "PPp")}` : undefined}
              />
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