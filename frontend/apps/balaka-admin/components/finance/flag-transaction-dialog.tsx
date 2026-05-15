"use client";

import { useState } from "react";
import { Button, Label, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, Textarea, useNotifications } from "@/ui";



import { fetchClient } from "@/core/api";

import { AlertTriangle, Loader2 } from "lucide-react";

interface FlagTransactionDialogProps {
  transactionId: number;
  onFlagged: () => void;
  trigger: React.ReactNode;
}

export function FlagTransactionDialog({ transactionId, onFlagged, trigger }: FlagTransactionDialogProps) {
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    
    setLoading(true);
    try {
      await fetchClient(`/api/v1/transactions/${transactionId}/flag`, {
        method: "PUT",
        body: JSON.stringify({ reason }) 
      });
      toast.success("Transaction flagged and Ticket created.");
      onFlagged();
      setOpen(false);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Failed to flag transaction";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Flag Transaction
          </DialogTitle>
          <DialogDescription>
            Mark this transaction as suspicious or mismatched. This will open a High Priority support ticket.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for Flagging</Label>
            <Textarea 
                id="reason" 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                placeholder="e.g. Bank ID mismatch, Duplicate receipt..."
                required
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Flag
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
