"use client";

import { ProtectedRoute } from "@/components/layout/protected-route";
import { ConfirmPaymentDialog } from "@/components/requests/confirm-payment-dialog";
import { fetchClient } from "@/core/api";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, Badge, StatusBadge, Button, LoadingSpinner, useNotifications, StatusTimeline, StatusActionDialog, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, gonia, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/ui";



import { format } from "date-fns";
import { ArrowLeft, ExternalLink, Loader2, FileCode, Calculator, ClipboardList, Clock } from "lucide-react";



import { useAuth } from "@/lib/auth-context";
import { useServerEvents } from "@/lib/use-server-events";

import { cn } from "@/lib/utils";

import { useDocumentActions } from "@/core/hooks/use-document-actions";
import { useServiceWorkflow } from "@/core/hooks/use-service-workflow";
import { useRequestFinancials } from "@/core/hooks/use-request-financials";
import { ServiceRequest, Transaction, StatusHistory } from "@/core/types";
import { GoniaRequestDetails, GoniaPageShell } from "@/ui";
import { useCurrency } from "@/core/currency-context";

export default function RequestDetailsPage() {
    const { user } = useAuth();
    const { toast } = useNotifications();
    const { viewSecureFile, downloadInvoice } = useDocumentActions();
    const { cancelRequest, isProcessing: cancelling } = useServiceWorkflow();
    const { formatCurrency: globalFormat, currency: globalMode } = useCurrency();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const [request, setRequest] = useState<ServiceRequest | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTicketDialog, setShowTicketDialog] = useState(false);

    // Local Formatter using the LOCKED rate of the request
    const localFormat = (amount: number) => {
        if (!request) return globalFormat(amount);
        
        if (globalMode === "BDT") {
            const rate = request.exchange_rate || 32.6;
            const bdt = amount * rate;
            return `৳${bdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `SR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const financials = useRequestFinancials(request, transactions);

    const loadData = useCallback(async () => {
         if (!id || isNaN(Number(id))) return;
         try {
             const reqData = await fetchClient<ServiceRequest>(`/api/v1/service-requests/${id}`);
             setRequest(reqData);

             try {
                const txnResponse = await fetchClient<{ items: Transaction[] } | Transaction[]>(`/api/v1/transactions/request/${id}`);
                // Handle both flat array and enveloped response { items, total }
                const txnData = Array.isArray(txnResponse) ? txnResponse : (txnResponse.items || []);
                setTransactions(txnData);
             } catch {
                 // Ignore 403/404 for transactions
             }
         } catch {
             toast.error("Failed to load request details");
             router.push("/dashboard");
         }
         finally {
             setLoading(false);
         }
    }, [id, router, toast]);

    // Real-time updates
    useServerEvents((event, data) => {
        const currentId = parseInt(id);
        
        if (typeof data === "object") {
            if (event === "request_updated" && data.id === currentId) {
                toast.info(`Request status updated: ${data.status}`);
                loadData();
            } else if ((event === "transaction_created" || event === "transaction_updated") && data.service_request_id === currentId) {
                toast.info(`Payment status updated`);
                loadData();
            }
        }
    });

    useEffect(() => {
        loadData();
    }, [id, loadData]);

    if (loading) return <LoadingSpinner full />;
    if (!request) return null;

    const { paid: paidAmount, balance: remainingDue, targetPrice: dueAmount, pending: pendingAmount } = financials;
    const isQuotePending = dueAmount === 0;
    const hasPendingPayment = pendingAmount > 0;
    const isTerminalStatus = ["Cancelled", "Rejected", "Completed", "Refunded"].includes(request.status);

    return (
        <ProtectedRoute>
            <GoniaPageShell
                title={request.service_definition?.name || "Service Request"}
                subtitle={`Ref: REQ-${request.id.toString().padStart(4, '0')}`}
                icon={<Clock className="h-6 w-6 md:h-8 md:w-8" />}
                actions={
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                        <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "flex-1 h-11 md:h-9 text-[10px] md:text-xs")} onClick={() => downloadInvoice(request.id)}>
                            <ExternalLink className="mr-2 h-3 w-3" /> Get Invoice
                        </Button>
                        {!isTerminalStatus && (
                            <StatusActionDialog 
                                requestId={request.id}
                                targetStatus="Cancelled"
                                title="Terminate Request"
                                description="Are you sure you want to cancel this request?"
                                icon="Close"
                                variant="destructive"
                                confirmText="Confirm Termination"
                                onComplete={loadData}
                                trigger={
                                    <Button variant="destructive" className={cn(gonia.button.base, gonia.button.destructive, "flex-1 h-11 md:h-9 text-[10px] md:text-xs")}>
                                        Cancel Request
                                    </Button>
                                }
                            />
                        )}
                    </div>
                }
            >
                <div className="space-y-6 md:space-y-8">
                    {remainingDue > 0 && !isQuotePending && !isTerminalStatus && (
                        <div className="bg-destructive/5 border-l-4 border-destructive text-destructive px-4 md:px-6 py-3 md:py-4 rounded-none flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <span className="text-[11px] md:text-xs font-black uppercase tracking-normal flex items-center gap-3">
                                <Calculator className="h-4 w-4" /> Pending Balance {localFormat(remainingDue)}
                            </span>
                            {remainingDue > 0 && (
                                <ConfirmPaymentDialog 
                                    serviceRequestId={request.id}
                                    basePrice={remainingDue}
                                    onPaymentConfirmed={loadData}
                                    className="w-full md:w-auto h-10 md:h-9 text-[10px]"
                                />
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                        <div className="lg:col-span-8 space-y-6 md:space-y-8">
                            <GoniaRequestDetails 
                                formData={request.form_data}
                                onViewFile={viewSecureFile}
                                title="Application Records"
                                badgeText="Finalized"
                            />

                            <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-[var(--gonia-surface)] border border-primary/30 shadow-none")}>
                                <div className="bg-[var(--gonia-limestone)] border-b border-primary/20 py-3 px-4 md:px-6">
                                    <h2 className={cn(gonia.text.label, "m-0 flex items-center gap-2 text-sm md:text-base text-primary")}>
                                        <Clock className="h-4 w-4 opacity-40" /> Timeline
                                    </h2>
                                </div>
                                <CardContent className="p-6 md:p-8 bg-[var(--gonia-surface)]">
                                    <StatusTimeline history={request.status_history || []} currentStatus={request.status} />
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-4 space-y-6 md:space-y-8">
                            <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-[var(--gonia-surface)] border border-primary/30 shadow-none")}>
                                <div className="bg-[var(--gonia-secondary-pale)]/30 border-b border-primary/20 py-3 px-4 md:px-6">
                                    <h2 className={cn(gonia.text.label, "m-0 text-primary")}>Financial Overview</h2>
                                </div>
                                <CardContent className="p-4 md:p-6 space-y-6 bg-[var(--gonia-surface)]">
                                    <div>
                                        <StatusBadge status={request.status} className="h-6 md:h-7 px-2 md:px-3 text-[10px] md:text-[11px]" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className={gonia.text.caption}>Total Cost</span>
                                            <span className={cn(gonia.text.mono, "text-sm md:text-base text-primary")}>{localFormat(dueAmount + (financials.discount || 0))}</span>
                                        </div>
                                        {financials.discount && financials.discount > 0 ? (
                                            <div className="flex justify-between items-center">
                                                <span className={gonia.text.caption}>Discount Applied</span>
                                                <span className={cn(gonia.text.mono, "text-sm md:text-base text-orange-600")}>-{localFormat(financials.discount)}</span>
                                            </div>
                                        ) : null}
                                        {request.exchange_rate && request.exchange_rate !== 1 && (
                                            <div className="flex justify-between items-center bg-primary/5 p-2 border border-primary/10">
                                                <span className="text-[9px] font-black uppercase text-primary/40 tracking-tighter">Locked Rate</span>
                                                <span className="text-[10px] font-mono font-bold text-primary/60">1 SR = ৳{request.exchange_rate.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className={gonia.text.caption}>Settled</span>
                                            <span className={cn(gonia.text.mono, "text-sm md:text-base text-[var(--gonia-success)]")}>+{localFormat(paidAmount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-primary/10 pt-3">
                                            <span className={cn(gonia.text.label, "text-[9px] md:text-[10px]")}>Outstanding</span>
                                            <span className={cn(gonia.text.mono, "text-base md:text-lg font-black", remainingDue > 0 ? "text-[var(--gonia-error)]" : "text-[var(--gonia-success)]")}>
                                                {localFormat(remainingDue)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {transactions.length > 0 && (
                                <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-[var(--gonia-surface)] border border-primary/30 shadow-none")}>
                                    <div className="bg-[var(--gonia-limestone)]/30 border-b border-primary/20 py-3 px-4 md:px-6">
                                        <h2 className={cn(gonia.text.label, "m-0 text-primary")}>Recent Payments</h2>
                                    </div>
                                    <CardContent className="p-0 bg-[var(--gonia-surface)]">
                                        <Table>
                                            <TableBody>
                                                {transactions.map(t => (
                                                    <TableRow key={t.id} className="border-primary/5 hover:bg-transparent">
                                                        <TableCell className={cn(gonia.text.mono, "text-[10px] md:text-[11px] py-3 pl-4 md:pl-6 text-primary/70")}>{t.client_reference_id || 'REF-' + t.id.toString().slice(-4)}</TableCell>
                                                        <TableCell className="text-right py-3 pr-4 md:pr-6">
                                                            <div className="flex justify-end items-center gap-2">
                                                                <span className={cn(gonia.text.mono, "text-[10px] md:text-[11px] font-bold text-primary")}>{localFormat(t.amount)}</span>
                                                                {t.status === "Verified" && (
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-6 w-6 p-0 hover:bg-primary/5 text-primary/40 hover:text-primary"
                                                                        onClick={() => downloadInvoice(request.id)}
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </GoniaPageShell>
        </ProtectedRoute>
    );
}
