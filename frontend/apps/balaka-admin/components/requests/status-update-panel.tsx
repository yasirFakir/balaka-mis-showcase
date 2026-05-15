"use client";

import React, { useMemo, useState } from "react";
import { Button, Badge, useNotifications, gonia } from "@/ui";

import { 
    CheckCircle, 
    PlayCircle, 
    XCircle, 
    Archive, 
    Clock, 
    ShieldCheck, 
    Loader2,
    Calculator,
    AlertTriangle,
    ArrowUpCircle,
    ArrowDownCircle,
    TrendingUp,
    MessageCircle,
    Truck,
    ClipboardCheck,
    PauseCircle,
    Box,
    Settings2,
    Activity,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { fetchClient } from "@/core/api";
import { useRequestFinancials } from "@/core/hooks/use-request-financials";
import { GoniaFinancialSummary } from "@/ui";



import { ServiceRequest, Transaction, SupportTicket } from "@/core/types";

export type ServiceStatus = "Pending" | "Approved" | "Processing" | "Completed" | "Rejected" | "Cancelled" | 
                            "Verifying Information" | "Service on Hold" | "In Transit" | 
                            "Received at Warehouse" | "Out for Delivery";

interface StatusUpdatePanelProps {
    request: ServiceRequest & { transactions?: Transaction[] };
    onStatusUpdate: (newStatus: ServiceStatus) => Promise<void>;
    isLoading?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; hover: string }> = {
    "Pending": { 
        label: "Pending", 
        icon: Clock, 
        color: "bg-primary/10 text-primary border border-primary/20",
        hover: "hover:bg-primary hover:text-white"
    },
    "Approved": { 
        label: "Approve", 
        icon: CheckCircle, 
        color: "bg-[var(--gonia-secondary-pale)] text-primary border border-transparent",
        hover: "hover:bg-transparent hover:text-[var(--gonia-secondary)] hover:border-[var(--gonia-secondary)]"
    },
    "Verifying Information": { 
        label: "Verify Info", 
        icon: ClipboardCheck, 
        color: "bg-[var(--gonia-success)] text-white border border-transparent",
        hover: "hover:bg-transparent hover:text-[var(--gonia-success)] hover:border-[var(--gonia-success)]"
    },
    "Processing": { 
        label: "Processing", 
        icon: PlayCircle, 
        color: "bg-[var(--gonia-secondary)] text-white border border-transparent",
        hover: "hover:bg-transparent hover:text-[var(--gonia-secondary)] hover:border-[var(--gonia-secondary)]"
    },
    "Service on Hold": { 
        label: "On Hold", 
        icon: PauseCircle, 
        color: "bg-slate-400 text-white border border-transparent",
        hover: "hover:bg-transparent hover:text-slate-500 hover:border-slate-400"
    }, 
    "In Transit": { 
        label: "In Transit", 
        icon: Truck, 
        color: "bg-[var(--gonia-primary)] text-white border border-transparent",
        hover: "hover:bg-transparent hover:text-[var(--gonia-primary)] hover:border-[var(--gonia-primary)]"
    },
    "Received at Warehouse": { 
        label: "At Warehouse", 
        icon: Box, 
        color: "bg-[var(--gonia-primary)] text-white border border-transparent",
        hover: "hover:bg-transparent hover:text-[var(--gonia-primary)] hover:border-[var(--gonia-primary)]"
    },
    "Out for Delivery": { 
        label: "Out for Delivery", 
        icon: Truck, 
        color: "bg-[var(--gonia-warning)] text-white border border-transparent",
        hover: "hover:bg-transparent hover:text-[var(--gonia-warning)] hover:border-[var(--gonia-warning)]"
    },
    "Completed": { 
        label: "Complete", 
        icon: Archive, 
        color: "bg-[var(--gonia-primary-deep)] text-white border border-transparent",
        hover: "hover:bg-transparent hover:text-black hover:border-black"
    },
    "Rejected": { 
        label: "Reject", 
        icon: XCircle, 
        color: "bg-destructive text-white border border-transparent",
        hover: "hover:bg-transparent hover:text-destructive hover:border-destructive"
    },
    "Cancelled": { 
        label: "Cancel", 
        icon: XCircle, 
        color: "bg-transparent text-destructive border border-destructive/30",
        hover: "hover:bg-destructive hover:text-white"
    },
};

export function StatusUpdatePanel({ request, onStatusUpdate, isLoading }: StatusUpdatePanelProps) {
    const router = useRouter();
    const { toast } = useNotifications();
    const currentStatus = request.status;
    const isCargo = request.service_definition?.slug?.includes("cargo");
    
    const stats = useRequestFinancials(request, request.transactions || []);

    const handleOpenTicket = async () => {
        try {
            const ticket = await fetchClient<SupportTicket>(`/api/v1/tickets/auto-create?service_request_id=${request.id}`, {
                method: "POST"
            });
            router.push(`/support/${ticket.id}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to create support ticket");
        }
    };

    const renderAction = (status: ServiceStatus, variant: "default" | "outline" = "default", className?: string) => {
        const config = STATUS_CONFIG[status] || { label: status, icon: Settings2, color: "bg-primary", hover: "" };
        const Icon = config.icon;
        
        const isFinalGateBlocked = status === "Completed" && !stats.isFullyPaid;
        const isDisabled = isLoading || currentStatus === status || isFinalGateBlocked;

        return (
            <Button
                key={status}
                variant={variant}
                onClick={() => onStatusUpdate(status)}
                disabled={isDisabled}
                className={cn(
                    "h-10 rounded-none font-black text-[9px] uppercase tracking-widest transition-all gap-2 shadow-none",
                    config.color,
                    config.hover,
                    isDisabled && "opacity-20 grayscale cursor-not-allowed",
                    className
                )}
            >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{config.label}</span>
            </Button>
        );
    };

    return (
        <div className="space-y-8 flex flex-col">
            {/* CATEGORY 1: ARCHIVE / DANGER ZONE (Top Placement for prominence) */}
            {!["Completed", "Rejected", "Cancelled"].includes(currentStatus) && (
                <div className="flex gap-2 shrink-0">
                    {currentStatus === "Pending" ? (
                        <div className="grid grid-cols-1 gap-3 w-full">
                            <div className="flex gap-2">
                                {renderAction("Approved", "default", "flex-[2] h-12 text-[10px]")}
                                {renderAction("Rejected", "outline", "flex-1 h-12")}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 w-full">
                            {renderAction("Cancelled", "outline", "h-9")}
                            <Button 
                                variant="outline" 
                                className="h-9 rounded-none border-primary/10 text-primary/60 hover:bg-primary hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
                                onClick={handleOpenTicket}
                            >
                                <MessageCircle className="h-3.5 w-3.5 mr-2" /> Support Inquiry
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* CATEGORY 2: OPERATIONS FLOW */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Update Operations Status</span>
                    <div className="h-px flex-1 bg-primary/5" />
                </div>

                {!["Rejected", "Cancelled", "Completed"].includes(currentStatus) ? (
                    currentStatus === "Pending" ? (
                        <div className="bg-[var(--gonia-limestone)] p-4 border border-primary/5 italic">
                            <p className="text-[9px] text-primary/60 font-bold uppercase leading-relaxed text-center">
                                Initial Approval Required to access processing controls.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {!stats.isSettled ? (
                                <div className="py-12 border-2 border-dashed border-primary/10 bg-white/50 flex flex-col items-center justify-center text-center px-6">
                                    <Calculator className="h-6 w-6 text-primary/20 mb-3" />
                                    <span className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Financial Lock Active</span>
                                    <p className="text-[8px] text-muted-foreground uppercase mt-2 leading-normal max-w-[200px]">Define the pricing structure in the breakdown panel to unlock these stages.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
                                    {/* Stages Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {renderAction("Verifying Information", "default")}
                                        {renderAction("Processing", "default")}
                                        {renderAction("Service on Hold", "default")}
                                        {isCargo && renderAction("In Transit", "default")}
                                    </div>

                                    {isCargo && (
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary/5">
                                            {renderAction("Received at Warehouse", "default")}
                                            {renderAction("Out for Delivery", "default")}
                                        </div>
                                    )}

                                    {/* Final Verification Gate */}
                                    <div className="pt-6 border-t-2 border-primary/10 space-y-4">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 block text-center">Final Fulfillment</span>
                                        {renderAction("Completed", "default", "w-full h-14 text-[11px] shadow-[6px_6px_0_0_var(--gonia-accent)] active:translate-x-1 active:translate-y-1 active:shadow-none")}
                                        
                                        {!stats.isFullyPaid && (
                                            <div className="flex items-center justify-center gap-3 p-3 bg-destructive/5 border border-destructive/10">
                                                <AlertCircle className="h-4 w-4 text-destructive animate-pulse" />
                                                <span className="text-[9px] text-destructive font-black uppercase tracking-widest leading-tight">
                                                    Payment Incomplete: Balance must be zero to seal record.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    <div className="py-16 border border-primary/10 bg-[var(--gonia-limestone)] flex flex-col items-center justify-center text-center px-6 grayscale">
                        <Archive className="h-8 w-8 text-primary/20 mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">Record Finalized</span>
                        <p className="text-[8px] text-muted-foreground uppercase mt-2 tracking-widest">No further operational changes allowed</p>
                    </div>
                )}
            </div>

            {/* 1. FINANCIAL CONTEXT (Gonia Standard) */}
            {currentStatus !== "Pending" && (
                <GoniaFinancialSummary 
                    income={stats.income}
                    profit={stats.profit}
                    balance={stats.balance}
                    isSettled={stats.isSettled}
                    discount={stats.discount}
                />
            )}
        </div>
    );
}
