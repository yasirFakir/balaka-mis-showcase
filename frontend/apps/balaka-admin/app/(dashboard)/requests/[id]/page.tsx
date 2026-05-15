"use client";

import { ProtectedRoute } from "@/components/shared/protected-route";
import { fetchClient } from "@/core/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, LoadingSpinner, useNotifications, StatusTimeline, StatusActionDialog, gonia, StatusBadge, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/ui";



import { Clock, ArrowRight, FileCode, Loader2, ArrowLeft, Calculator, CheckCircle, ExternalLink, XCircle, Package, Wallet, ClipboardList, Settings2, RefreshCcw, ShieldCheck } from "lucide-react";


import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { TransactionList } from "@/components/finance/transaction-list";
import { RefundDialog } from "@/components/finance/refund-dialog";
import { ProcessRequestDialog } from "@/components/requests/process-request-dialog";
import { SetPriceDialog } from "@/components/finance/set-price-dialog";
import { EditRequestFormDialog } from "@/components/requests/edit-request-form-dialog";
import { PricingBreakdown } from "@/components/finance/pricing-breakdown";


import { useAuth } from "@/lib/auth-context";
import { useServerEvents } from "@/lib/use-server-events";
import { cn } from "@/lib/utils";
import { format } from "date-fns";



import { useDocumentActions } from "@/core/hooks/use-document-actions";
import { useServiceWorkflow } from "@/core/hooks/use-service-workflow";
import { useRequestFinancials } from "@/core/hooks/use-request-financials";
import { GoniaRequestDetails } from "@/ui";
import { CurrencySwitcher } from "@/components/shared/currency-switcher";
import { useCurrency } from "@/core/currency-context";
import { ServiceRequest, Transaction, Vendor } from "@/core/types";

export default function AdminRequestDetailsPage() {
    const { hasPermission } = useAuth();
    const { toast } = useNotifications();
    const { viewSecureFile, downloadInvoice } = useDocumentActions();
    const { cancelRequest, isProcessing: cancelling } = useServiceWorkflow();
    const { formatCurrency: globalFormat, currency: globalMode } = useCurrency();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const [request, setRequest] = useState<ServiceRequest | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTxnKey, setRefreshTxnKey] = useState(0);

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
             const [reqData, txnResponse, vData] = await Promise.all([
                 fetchClient<ServiceRequest>(`/api/v1/service-requests/${id}`),
                 fetchClient<{ items: Transaction[] } | Transaction[]>(`/api/v1/transactions/request/${id}`),
                 fetchClient<{ items: Vendor[] } | Vendor[]>("/api/v1/vendors/")
             ]);
             setRequest(reqData);
             
             // Handle both flat array (legacy) and enveloped response { items, total }
             const txnData = Array.isArray(txnResponse) ? txnResponse : (txnResponse.items || []);
             setTransactions(txnData);

             const allVendors = Array.isArray(vData) ? vData : (vData.items || []);
             setVendors(allVendors);
         } catch {
             toast.error("Failed to load data");
         } finally {
             setLoading(false);
         }
    }, [id, toast]);

    useEffect(() => {
        loadData();
    }, [id, loadData, refreshTxnKey]);

    // Real-time updates
    const handleSSE = useCallback((event: string, data: any) => {
        const currentId = parseInt(id);
        
        if (typeof data === "object" && data !== null) {
            if (event === "request_updated" && Number(data.id) === currentId) {
                loadData();
            } else if ((event === "transaction_created" || event === "transaction_updated") && Number(data.service_request_id) === currentId) {
                loadData();
                setRefreshTxnKey(prev => prev + 1);
            }
        }
    }, [id, loadData]);

    useServerEvents(handleSSE);

    if (loading) return <LoadingSpinner size="lg" full />;
    if (!request) return null;

    const { paid, balance: remainingDue, isFullyPaid, targetPrice, isSettled: isPricingDefined } = financials;
    const isQuotePending = targetPrice === 0;
    const isTerminalStatus = ["Cancelled", "Rejected", "Completed", "Refunded"].includes(request.status);

    return (
        <ProtectedRoute>
            <div className="space-y-6 md:space-y-10 pb-20">
                {/* Back Link */}
                <Button variant="ghost" onClick={() => router.back()} className={cn(gonia.button.base, gonia.button.ghost, "gap-2 h-10 px-0 text-sm md:text-base")}>
                    <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" /> Back to All Requests
                </Button>

                {/* Gonia v1.5 Anchored Header */}
                <div className={cn(gonia.layout.pageHeader, "p-4 md:p-6 mb-6")}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
                        <div className="space-y-1">
                            <h1 className={cn(gonia.text.h1, "text-xl md:text-3xl")}>{request.service_definition?.name}</h1>
                            <p className={cn(gonia.text.caption, "text-[10px] md:text-[12px]")}>
                                Ref: REQ-{request.id.toString().padStart(4, '0')}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <CurrencySwitcher />
                            <Button 
                                variant="outline" 
                                className={cn(gonia.button.base, gonia.button.outline, "h-10 px-4 rounded-none border-primary/20 text-primary font-black uppercase text-[10px] gap-2 shadow-[3px_3px_0_0_var(--gonia-accent)] hover:shadow-none")} 
                                onClick={() => downloadInvoice(request.id)}
                            >
                                <FileCode className="h-3.5 w-3.5" /> Get Receipt
                            </Button>
                            {hasPermission("requests.manage") && !isTerminalStatus && (
                                <EditRequestFormDialog 
                                    requestId={request.id} 
                                    initialFormData={request.form_data} 
                                    formSchema={request.service_definition?.form_schema || { sections: [] }} 
                                    userContext={{
                                        id: request.user_id,
                                        phone: request.user?.phone_number,
                                        email: request.user?.email
                                    }}
                                    serviceSlug={request.service_definition?.slug || "service"}
                                    onUpdated={loadData} 
                                />
                            )}
                        </div>
                    </div>
                </div>

                {remainingDue > 0 && !isQuotePending && !isTerminalStatus && (
                    <div className="bg-destructive/5 border-l-4 md:border-l-8 border-destructive px-4 md:px-8 py-4 md:py-6 rounded-none flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <span className="text-sm md:text-base font-black uppercase tracking-normal flex items-center gap-3 md:gap-4 text-destructive">
                            <Calculator className="h-5 w-5 md:h-6 md:w-6" /> Balance Due: {localFormat(remainingDue)}
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                    {/* Left Column: Data & Timeline */}
                    <div className="lg:col-span-8 space-y-8 md:space-y-12">
                        {/* Application Information */}
                        <div className="space-y-4 md:space-y-6">
                            {request.rejection_reason && (
                                <div className="bg-destructive/5 border-l-4 border-destructive p-4 md:p-6">
                                    <p className="font-black text-[10px] md:text-[12px] uppercase text-destructive tracking-normal">Reason for Rejection:</p>
                                    <p className="text-sm md:text-base font-bold text-destructive mt-2">{request.rejection_reason}</p>
                                </div>
                            )}
                            <GoniaRequestDetails 
                                formData={request.form_data}
                                onViewFile={viewSecureFile}
                            />
                        </div>

                        {/* Status History */}
                        <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-[var(--gonia-surface)] border border-primary/40 shadow-none")}>
                            <div className="bg-[var(--gonia-limestone)] border-b border-primary/30 py-3 px-4 md:px-8">
                                <h2 className={cn(gonia.text.label, "m-0 text-sm md:text-base flex items-center gap-3 text-primary")}>
                                    <Clock className="h-4 w-4 md:h-5 md:w-5 opacity-40" /> Order History
                                </h2>
                            </div>
                            <CardContent className="p-6 md:p-10 bg-[var(--gonia-surface)]">
                                <StatusTimeline history={request.status_history || []} currentStatus={request.status} />
                            </CardContent>
                        </Card>

                        {/* Financial Ledger Section */}
                        {request.status !== "Pending" && (
                            <div className="space-y-8 md:space-y-12">
                                <div className="space-y-4 md:space-y-6">
                                    <div className="flex items-center gap-3 md:gap-4 border border-primary/40 border-b-4 md:border-b-4 pb-3 bg-[var(--gonia-secondary-pale)]/30 px-4 pt-3 rounded-t-sm shadow-none">
                                        <Calculator className="h-5 w-5 md:h-6 md:w-6 text-primary opacity-40" />
                                        <h2 className={cn(gonia.text.h2, "m-0 uppercase tracking-normal text-sm md:text-base font-black")}>Financial Breakdown</h2>
                                    </div>
                                    <PricingBreakdown 
                                        breakdown={request.financial_breakdown || []} 
                                        vendors={request.service_definition?.vendors || []} 
                                    />
                                </div>

                                <div className="space-y-4 md:space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border border-primary/40 border-b-4 md:border-b-4 pb-3 gap-4 bg-[var(--gonia-limestone)]/30 px-4 pt-3 rounded-t-sm shadow-none">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary opacity-40" />
                                            <h2 className={cn(gonia.text.h2, "m-0 uppercase tracking-normal text-sm md:text-base font-black")}>Payment Logs</h2>
                                        </div>
                                        <div className="flex gap-2 md:gap-4">
                                            {hasPermission("finance.manage_transactions") && (request.status !== "Cancelled" && request.status !== "Rejected") && (
                                                <RecordPaymentDialog 
                                                    serviceRequestId={request.id} 
                                                    basePrice={targetPrice}
                                                    onPaymentRecorded={() => setRefreshTxnKey(prev => prev + 1)} 
                                                    trigger={
                                                        <Button size="sm" className={cn(gonia.button.base, gonia.button.primary, "h-9 md:h-10 px-4 md:px-6 text-[10px] md:text-xs flex-1 sm:flex-none shadow-none")}>
                                                            Add Payment
                                                        </Button>
                                                    }
                                                />
                                            )}
                                            {hasPermission("finance.manage_transactions") && (request.status === "Cancelled" || request.status === "Rejected") && paid > 0 && (
                                                <RefundDialog 
                                                    serviceRequestId={request.id}
                                                    maxRefundable={paid}
                                                    onRefundRequested={() => setRefreshTxnKey(prev => prev + 1)}
                                                    trigger={
                                                        <Button variant="destructive" size="sm" className={cn(gonia.button.base, gonia.button.destructive, "h-9 md:h-10 px-4 md:px-6 text-[10px] md:text-xs flex-1 sm:flex-none shadow-none")}>
                                                            <RefreshCcw className="h-3.5 w-3.5 mr-2" /> Refund Assets
                                                        </Button>
                                                    }
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <TransactionList 
                                        serviceRequestId={request.id} 
                                        refreshKey={refreshTxnKey} 
                                        onTransactionUpdated={loadData}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Sidebar Status */}
                    <div className="lg:col-span-4 space-y-6 md:space-y-10">
                        {/* Order Summary Card */}
                        <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-[var(--gonia-surface)] border border-primary/40 shadow-none")}>
                            <div className="bg-[var(--gonia-limestone)] border-b border-primary/30 py-3 md:py-4 px-4 md:px-8 flex justify-between items-center shadow-none">
                                <span className={cn(gonia.text.caption, "text-[10px] md:text-[11px] tracking-normal text-primary")}>Current Status</span>
                                <StatusBadge status={request.status} className="text-[10px] md:text-[11px] px-2 md:px-3 h-6 md:h-7" />
                            </div>
                            <CardContent className="p-4 md:p-8 space-y-6 md:space-y-8 bg-[var(--gonia-surface)]">
                                <div className="space-y-2">
                                    <span className={cn(gonia.text.caption, "text-[10px] md:text-[11px] tracking-normal")}>Payment Summary</span>
                                    <div className="flex items-center justify-between p-4 md:p-6 bg-[var(--gonia-canvas)]/50 border border-primary/10">
                                        <span className={cn(gonia.text.mono, "text-lg md:text-xl font-black", isFullyPaid ? "text-[var(--gonia-success)]" : "text-[var(--gonia-error)]")}>
                                            {localFormat(paid)} / {localFormat(targetPrice)}
                                        </span>
                                        {isFullyPaid ? <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-[var(--gonia-success)]" /> : <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary/20" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 md:gap-6 pt-2">
                                    <div className="space-y-1 md:space-y-2">
                                        <span className={cn(gonia.text.caption, "text-[10px] md:text-[11px]")}>Quantity</span>
                                        <p className={cn(gonia.text.mono, "text-lg md:text-xl text-primary font-black")}>{request.quantity} Unit(s)</p>
                                    </div>
                                    <div className="space-y-1 md:space-y-2">
                                        <span className={cn(gonia.text.caption, "text-[10px] md:text-[11px]")}>Rate</span>
                                        <p className={cn(gonia.text.mono, "text-lg md:text-xl text-primary font-black")}>{localFormat(targetPrice / (request.quantity || 1))}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Audit Trail Card */}
                        <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-[var(--gonia-surface)] border border-primary/40 shadow-none")}>
                            <div className="bg-[var(--gonia-warm-sand)]/30 border-b border-primary/20 py-3 px-4 md:px-6">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="h-4 w-4 text-primary opacity-60" />
                                    <h3 className={cn(gonia.text.label, "m-0 text-xs text-primary")}>Security Audit Trail</h3>
                                </div>
                            </div>
                            <CardContent className="p-6 space-y-6 bg-[var(--gonia-surface)]">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className={cn(gonia.text.caption, "text-[9px] text-primary/40")}>Created By</p>
                                            <p className="text-[11px] font-bold text-primary uppercase tracking-tight">{request.created_by?.full_name || request.user?.full_name || "System"}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className={cn(gonia.text.caption, "text-[9px] text-primary/40")}>Timestamp</p>
                                            <p className="text-[10px] font-mono text-primary/70">{format(new Date(request.created_at), "PP p")}</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-primary/20 pt-4 flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className={cn(gonia.text.caption, "text-[9px] text-primary/40")}>Last Modified By</p>
                                            <p className="text-[11px] font-bold text-primary uppercase tracking-tight">{request.updated_by?.full_name || "N/A"}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className={cn(gonia.text.caption, "text-[9px] text-primary/40")}>Last Update</p>
                                            <p className="text-[10px] font-mono text-primary/70">{request.updated_at ? format(new Date(request.updated_at), "PP p") : "N/A"}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Admin Actions */}
                        {!isTerminalStatus && (
                            <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-[var(--gonia-surface)] border border-primary/20 shadow-none")}>
                                <div className="bg-[var(--gonia-limestone)] border-b border-primary/10 py-3 md:py-4 px-4 md:px-8">
                                    <h2 className={cn(gonia.text.label, "m-0 text-primary text-sm md:text-base")}>Admin Actions</h2>
                                </div>
                                <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6 bg-[var(--gonia-surface)]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                        <ProcessRequestDialog 
                                            requestId={request.id}
                                            onStatusUpdated={loadData}
                                            trigger={
                                                <Button className={cn(gonia.button.base, gonia.button.primary, "w-full h-11 md:h-14 text-xs md:text-sm shadow-none")}>
                                                    <Settings2 className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" /> 
                                                    Update Status
                                                </Button>
                                            }
                                        />

                                        {request.status !== "Pending" && (
                                            <SetPriceDialog 
                                                requestId={request.id} 
                                                onPriceUpdated={loadData}
                                                trigger={
                                                    <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "w-full h-11 md:h-14 text-xs md:text-sm shadow-none")}>
                                                        <Calculator className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" /> Update Pricing
                                                    </Button>
                                                }
                                            />
                                        )}
                                    </div>

                                    <div className="pt-4 md:pt-6 mt-2 border-t border-primary/10">
                                        <StatusActionDialog 
                                            requestId={request.id}
                                            targetStatus="Rejected"
                                            title="Reject Application"
                                            description="This will permanently reject the request and notify the client."
                                            icon="Delete"
                                            variant="destructive"
                                            confirmText="Confirm Rejection"
                                            onComplete={loadData}
                                            fields={[
                                                { key: "rejection_reason", label: "Legal Rejection Reason", type: "textarea", required: true, placeholder: "Provide specific details for rejection..." }
                                            ]}
                                            trigger={
                                                <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "w-full h-10 md:h-11 border-destructive/30 text-destructive hover:bg-destructive shadow-none text-xs")}>
                                                    Reject Application
                                                </Button>
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
