"use client";

import { ProtectedRoute } from "@/components/shared/protected-route";
import { fetchClient } from "@/core/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, useNotifications, StatusTimeline, LoadingSpinner, gonia, StatusBadge } from "@/ui";


import { 
    ArrowLeft, 
    Clock, 
    Wallet, 
    ArrowRight, 
    FileText,
    Activity,
    Lock,
    Zap,
    ShieldCheck,
    CheckCircle,
    Calculator,
    Settings2
} from "lucide-react";


import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { TransactionList } from "@/components/finance/transaction-list";

import { EditRequestFormDialog } from "@/components/requests/edit-request-form-dialog";
import { ProcessRequestDialog } from "@/components/requests/process-request-dialog";
import { SetPriceDialog } from "@/components/finance/set-price-dialog";
import { useAuth } from "@/lib/auth-context";
import { useServerEvents } from "@/lib/use-server-events";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useDocumentActions } from "@/core/hooks/use-document-actions";
import { useRequestFinancials } from "@/core/hooks/use-request-financials";
import { OperationRequest, Transaction } from "@/core/types";
import { useCurrency } from "@/core/currency-context";


export default function InternalOperationDetailPage() {
    const { hasPermission } = useAuth();
    const { toast } = useNotifications();
    const { downloadInvoice } = useDocumentActions();
    const { formatCurrency: globalFormat, currency: globalMode } = useCurrency();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const [operation, setOperation] = useState<OperationRequest | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTxnKey, setRefreshTxnKey] = useState(0);

    const financials = useRequestFinancials(operation, transactions);

    // Local Formatter using the LOCKED rate of the request
    const localFormat = (amount: number) => {
        if (!operation) return globalFormat(amount);
        
        if (globalMode === "BDT") {
            const rate = operation.exchange_rate || 32.6;
            const bdt = amount * rate;
            return `৳${bdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `SR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const loadData = useCallback(async () => {
         try {
             // Keep loading true only on initial load if needed, or manage finer grain
             // setLoading(true); 
             const reqData = await fetchClient<OperationRequest>(`/api/v1/service-requests/${id}`);
             setOperation(reqData);
             
             const txnResponse = await fetchClient<any>(`/api/v1/transactions/request/${id}`);
             // Handle both flat array and enveloped response { items, total }
             const txnData = Array.isArray(txnResponse) ? txnResponse : (txnResponse.items || []);
             setTransactions(txnData);
         } catch {
             toast.error("Failed to load operation record");
             router.push("/requests?view=internal");
         } finally {
             setLoading(false);
         }
    }, [id, router, toast]);

    useEffect(() => {
        loadData();
    }, [loadData, refreshTxnKey]);

    useServerEvents((event, data) => {
        if (typeof data === "object" && (data.id === parseInt(id) || data.service_request_id === parseInt(id))) {
            loadData();
            if (event.includes("transaction")) {
                setRefreshTxnKey(prev => prev + 1);
            }
        }
    });

    if (loading) return <LoadingSpinner full />;
    if (!operation) return null;

    const { paid: totalSettled, targetPrice, isFullyPaid, balance: remainingDue } = financials;

    return (
        <ProtectedRoute>
            <div className="space-y-6 pb-20">
                {/* Gonia Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-primary/5 p-6 border-l-4 border-primary">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.push("/requests?view=internal")} className="h-10 w-10 rounded-none border-primary/20 text-primary hover:bg-primary hover:text-white transition-all">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter uppercase text-primary flex items-center gap-2">
                                <Lock className="h-5 w-5" /> Operation: {operation.service_definition?.name}
                            </h1>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-normal mt-1">
                                Internal Audit Track // Ref ID: #{operation.id} // Lead Agent: {operation.user?.full_name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            className={cn(gonia.button.base, gonia.button.outline, "h-10 px-4 rounded-none border-primary/20 text-primary font-black uppercase text-[10px] gap-2 shadow-[3px_3px_0_0_var(--gonia-accent)] hover:shadow-none")} 
                            onClick={() => downloadInvoice(operation.id)}
                        >
                            <FileText className="h-3.5 w-3.5" /> Get Receipt
                        </Button>
                        <StatusBadge status={operation.status} className="h-8 px-4 text-xs" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                    {/* Left: Information (8 cols) */}
                    <div className="lg:col-span-8 space-y-8">
                        <Card className="rounded-none border-2 shadow-none">
                            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5">
                                <div>
                                    <CardTitle className="text-sm font-black uppercase tracking-normal text-primary flex items-center gap-2">
                                        <FileText className="h-4 w-4" /> Operation Data
                                    </CardTitle>
                                    <CardDescription className="text-[10px] uppercase font-bold tracking-tight">
                                        Process information and verification fields.
                                    </CardDescription>
                                </div>
                                <EditRequestFormDialog 
                                    requestId={operation.id} 
                                    initialFormData={operation.form_data} 
                                    formSchema={operation.service_definition?.form_schema || { sections: [] }} 
                                    userContext={{ id: 0 }} 
                                    serviceSlug={operation.service_definition?.slug || "service"}
                                    onUpdated={loadData}
                                    trigger={
                                        <Button variant="outline" size="sm" className="h-8 rounded-none border-primary/20 font-black uppercase text-[10px] tracking-normal hover:bg-primary hover:text-white transition-all">
                                            Update Details
                                        </Button>
                                    }
                                />
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                    {Object.entries(operation.form_data).map(([key, value]) => (
                                        <div key={key} className="space-y-1 group">
                                            <p className="text-[9px] font-black uppercase tracking-normal text-muted-foreground/60 group-hover:text-primary transition-colors">
                                                {key.replace(/_/g, " ")}
                                            </p>
                                            <div className="flex items-center pt-1 min-h-[32px]">
                                                {typeof value === "string" && (value.startsWith("http") || value.startsWith("/static") || value.startsWith("/api/")) ? (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className={cn(gonia.button.base, gonia.button.outline, "h-7 px-3 text-[9px] shadow-none gap-2")}
                                                        onClick={() => window.open(value, '_blank')}
                                                    >
                                                        <FileText className="h-3 w-3" /> View Document
                                                    </Button>
                                                ) : (
                                                    <span className="text-sm font-bold text-primary truncate">{String(value)}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Transaction Track */}
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border border-primary/40 border-b-4 md:border-b-4 pb-3 gap-4 bg-[var(--gonia-limestone)]/30 px-4 pt-3 rounded-t-sm shadow-none">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary opacity-40" />
                                    <h2 className={cn(gonia.text.h2, "m-0 uppercase tracking-normal text-sm md:text-base font-black")}>Payment Logs</h2>
                                </div>
                                <div className="flex gap-2 md:gap-4">
                                    <RecordPaymentDialog 
                                        serviceRequestId={operation.id} 
                                        basePrice={targetPrice}
                                        onPaymentRecorded={() => setRefreshTxnKey(prev => prev + 1)} 
                                        trigger={
                                            <Button size="sm" className={cn(gonia.button.base, gonia.button.primary, "h-9 md:h-10 px-4 md:px-6 text-[10px] md:text-xs flex-1 sm:flex-none shadow-none")}>
                                                Add Payment
                                            </Button>
                                        }
                                    />
                                </div>
                            </div>
                            <TransactionList 
                                serviceRequestId={operation.id} 
                                refreshKey={refreshTxnKey} 
                                onTransactionUpdated={loadData}
                            />
                        </div>
                    </div>

                    {/* Right: Summary & Directives (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        
                        {/* Order Summary Card */}
                        <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-[var(--gonia-surface)] border border-primary/40 shadow-none")}>
                            <div className="bg-[var(--gonia-limestone)] border-b border-primary/30 py-3 md:py-4 px-4 md:px-8 flex justify-between items-center shadow-none">
                                <span className={cn(gonia.text.caption, "text-[10px] md:text-[11px] tracking-normal text-primary")}>Current Status</span>
                                <StatusBadge status={operation.status} className="text-[10px] md:text-[11px] px-2 md:px-3 h-6 md:h-7" />
                            </div>
                            <CardContent className="p-4 md:p-8 space-y-6 md:space-y-8 bg-[var(--gonia-surface)]">
                                <div className="space-y-2">
                                    <span className={cn(gonia.text.caption, "text-[10px] md:text-[11px] tracking-normal")}>Payment Summary</span>
                                    <div className="flex items-center justify-between p-4 md:p-6 bg-[var(--gonia-canvas)]/50 border border-primary/10">
                                        <span className={cn(gonia.text.mono, "text-lg md:text-xl font-black", isFullyPaid ? "text-[var(--gonia-success)]" : "text-[var(--gonia-error)]")}>
                                            {localFormat(totalSettled)} / {localFormat(targetPrice)}
                                        </span>
                                        {isFullyPaid ? <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-[var(--gonia-success)]" /> : <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary/20" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 md:gap-6 pt-2">
                                    <div className="space-y-1 md:space-y-2">
                                        <span className={cn(gonia.text.caption, "text-[10px] md:text-[11px]")}>Quantity</span>
                                        <p className={cn(gonia.text.mono, "text-lg md:text-xl text-primary font-black")}>{operation.quantity} Unit(s)</p>
                                    </div>
                                    <div className="space-y-1 md:space-y-2">
                                        <span className={cn(gonia.text.caption, "text-[10px] md:text-[11px]")}>Rate</span>
                                        <p className={cn(gonia.text.mono, "text-lg md:text-xl text-primary font-black")}>{localFormat(targetPrice / (operation.quantity || 1))}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Directives */}
                        <Card className="rounded-none border-2 shadow-none">
                            <CardHeader className="border-b bg-muted/5">
                                <CardTitle className="text-xs font-black uppercase tracking-normal text-primary flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" /> Directives
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-3">
                                {hasPermission("requests.manage") && !["Completed", "Cancelled"].includes(operation.status) && (
                                    <>
                                        <ProcessRequestDialog 
                                            requestId={operation.id} 
                                            onStatusUpdated={loadData}
                                            trigger={
                                                <Button className="w-full h-12 rounded-none bg-primary text-white font-black uppercase text-xs tracking-normal shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none transition-all">
                                                    <Settings2 className="mr-2 h-4 w-4" /> Process Operation
                                                </Button>
                                            }
                                        />
                                        <SetPriceDialog 
                                            requestId={operation.id} 
                                            currentPrice={operation.selling_price} 
                                            onPriceUpdated={loadData}
                                            trigger={
                                                <Button variant="outline" className="w-full h-10 rounded-none border-primary/30 text-primary font-black uppercase text-[10px] tracking-normal hover:bg-primary/5 transition-all">
                                                    <Calculator className="mr-2 h-4 w-4" /> Set Pricing
                                                </Button>
                                            }
                                        />
                                    </>
                                )}
                                {["Completed", "Cancelled"].includes(operation.status) && (
                                    <div className="text-center py-4 border-2 border-dashed border-primary/20">
                                        <p className="text-[10px] font-black uppercase text-primary opacity-60 italic tracking-normal">Record is Sealed</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-none border-2 shadow-none">
                            <CardHeader className="border-b bg-muted/5">
                                <CardTitle className="text-sm font-black uppercase tracking-normal text-primary flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> Audit Timeline
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <StatusTimeline history={operation.status_history || []} currentStatus={operation.status} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
