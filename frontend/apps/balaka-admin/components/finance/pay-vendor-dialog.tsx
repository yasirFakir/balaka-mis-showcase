"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Button, 
  GoniaResponsiveDialog, 
  Input, 
  Label, 
  Textarea, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  useNotifications, 
  GONIA_INPUT_CLASSES, 
  LoadingSpinner,
  gonia
} from "@/ui";

import { fetchClient } from "@/core/api";
import { Wallet, Hash, Globe, TrendingUp, Upload, CheckCircle2, FileText, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PayVendorDialogProps {
  vendorId: number;
  vendorName: string;
  onPaymentRecorded: () => void;
  trigger?: React.ReactNode;
}

export function PayVendorDialog({ vendorId, vendorName, onPaymentRecorded, trigger }: PayVendorDialogProps) {
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [exchangeRate, setExchangeRate] = useState("1.0");
  const [notes, setNotes] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Requirement #195: Fetch default exchange rate for BDT
  useEffect(() => {
    if (currency === "BDT") {
      const fetchRate = async () => {
        try {
          const data = await fetchClient<{ rate: number }>("/api/v1/system/currency-rate");
          setExchangeRate(data.rate.toString());
        } catch (error) {
          console.error("Failed to fetch exchange rate:", error);
        }
      };
      fetchRate();
    } else {
      setExchangeRate("1.0");
    }
  }, [currency]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetchClient<{ url: string }>(`/api/v1/files/upload`, {
        method: "POST",
        body: formData,
      });

      setProofUrl(response.url);
      setFileName(file.name);
      toast.success("Payment proof uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload proof");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || uploading) return;
    
    if (!amount || parseFloat(amount) <= 0) {
        toast.error("Please enter a valid amount");
        return;
    }

    setLoading(true);
    try {
      await fetchClient(`/api/v1/vendors/${vendorId}/pay`, {
        method: "POST",
        body: JSON.stringify({ 
            amount: parseFloat(amount), 
            reference_id: referenceId,
            currency,
            exchange_rate: parseFloat(exchangeRate),
            proof_url: proofUrl,
            notes 
        }),
      });

      toast.success(`Payment of ${amount} ${currency} recorded for ${vendorName}`);
      onPaymentRecorded();
      setOpen(false);
      
      // Reset
      setAmount("");
      setReferenceId("");
      setCurrency("SAR");
      setExchangeRate("1.0");
      setNotes("");
      setProofUrl("");
      setFileName("");
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-block">
        {trigger || (
          <Button size="sm" variant="outline" className={cn(gonia.button.base, gonia.button.outline, "gap-2")}>
            <Wallet className="h-3.5 w-3.5" /> Record Payment
          </Button>
        )}
      </div>

      <GoniaResponsiveDialog
        isOpen={open}
        onOpenChange={setOpen}
        title={`Pay Vendor: ${vendorName}`}
        description="Record a financial transfer to this vendor. Exchange rate is required for audit trail."
        maxWidth="lg"
        footer={
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none h-11 uppercase font-black text-[10px]">Cancel</Button>
            <Button 
                onClick={handleSubmit} 
                disabled={loading || uploading} 
                className="flex-1 sm:flex-none h-11 bg-primary text-white font-black uppercase tracking-normal px-8 shadow-[4px_4px_0_0_var(--gonia-accent)]"
            >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Confirm Payment
            </Button>
          </div>
        }
      >
        <div className="space-y-6 pb-10 sm:pb-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="h-3 w-3" /> Amount Paid
                    </Label>
                    <Input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className={cn(GONIA_INPUT_CLASSES, gonia.text.mono, "font-bold")}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1.5">
                        <Hash className="h-3 w-3" /> Reference ID (Optional)
                    </Label>
                    <Input 
                        placeholder="Bank Ref / Wire #"
                        value={referenceId} 
                        onChange={(e) => setReferenceId(e.target.value)} 
                        className={GONIA_INPUT_CLASSES}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1.5">
                        <Globe className="h-3 w-3" /> Currency
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className={GONIA_INPUT_CLASSES}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2">
                            <SelectItem value="SAR" className="text-xs font-bold uppercase">Saudi Riyal (SAR)</SelectItem>
                            <SelectItem value="BDT" className="text-xs font-bold uppercase">Bangladeshi Taka (BDT)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3" /> Exchange Rate
                    </Label>
                    <Input 
                        type="number"
                        step="0.0001"
                        value={exchangeRate} 
                        onChange={(e) => setExchangeRate(e.target.value)} 
                        className={cn(GONIA_INPUT_CLASSES, gonia.text.mono)}
                    />
                    <p className="text-[8px] text-muted-foreground italic uppercase">Rate used for this specific transfer.</p>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-1.5">
                    <Upload className="h-3 w-3" /> Payment Proof
                </Label>
                <div className="flex items-center gap-4">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,application/pdf"
                    />
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="h-10 px-4 border-2 border-dashed border-primary/20 rounded-none bg-primary/5 hover:bg-primary/10 transition-all text-[10px] font-black uppercase gap-2"
                    >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {fileName ? "Change Proof" : "Upload Receipt"}
                    </Button>
                    {fileName && (
                        <div className="flex items-center gap-2 text-primary">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-[10px] font-bold truncate max-w-[150px]">{fileName}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">Notes (Optional)</Label>
                <Textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Describe any specific details about this payment..."
                    className={cn(GONIA_INPUT_CLASSES, "min-h-[80px] h-auto pt-2")} 
                />
            </div>
        </div>
      </GoniaResponsiveDialog>
    </>
  );
}