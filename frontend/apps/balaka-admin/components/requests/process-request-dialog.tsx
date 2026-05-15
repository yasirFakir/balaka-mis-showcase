"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Button, 
  GoniaResponsiveDialog, 
  useNotifications, 
  gonia 
} from "@/ui";

import { fetchClient } from "@/core/api";

import { Settings2, Loader2 } from "lucide-react";
import { StatusUpdatePanel, ServiceStatus } from "./status-update-panel";
import { cn } from "@/lib/utils";


import { ServiceRequest, Transaction } from "@/core/types";

interface ProcessRequestDialogProps {
  requestId: number;
  onStatusUpdated: () => void;
  trigger?: React.ReactNode;
}

export function ProcessRequestDialog({ requestId, onStatusUpdated, trigger }: ProcessRequestDialogProps) {
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<(ServiceRequest & { transactions: Transaction[] }) | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadRequest = useCallback(async () => {
      try {
          const [data, txnResponse] = await Promise.all([
              fetchClient<ServiceRequest>(`/api/v1/service-requests/${requestId}`),
              fetchClient<{ items: Transaction[] } | Transaction[]>(`/api/v1/transactions/request/${requestId}`)
          ]);
          
          // Handle both flat array and enveloped response { items, total }
          const txns = Array.isArray(txnResponse) ? txnResponse : (txnResponse.items || []);
          
          // Inject transactions into the request object for the panel
          setRequest({ ...data, transactions: txns });
      } catch (error) {
          console.error("Failed to load request data for processing", error);
      }
  }, [requestId]);

  useEffect(() => {
      if (open) {
          loadRequest();
      }
  }, [open, loadRequest, refreshKey]);

  const handleStatusUpdate = async (newStatus: ServiceStatus) => {
    setLoading(true);
    try {
      await fetchClient(`/api/v1/service-requests/${requestId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });
      toast.success(`Request status updated: ${newStatus}`);
      onStatusUpdated();
      setRefreshKey(prev => prev + 1); 
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {trigger ? (
          <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
          <Button 
            size="sm" 
            onClick={() => setOpen(true)}
            className={cn(gonia.button.base, gonia.button.primary, "gap-2")}
          >
            <Settings2 className="h-3.5 w-3.5" /> Manage Status
          </Button>
      )}

      <GoniaResponsiveDialog
        isOpen={open}
        onOpenChange={setOpen}
        title="Operation Status"
        description={`Update request status and monitor progress. Ref: #${requestId}`}
        maxWidth="lg"
      >
        <div className="bg-[var(--gonia-canvas)] -mx-6 -my-6 p-8">
            {request ? (
                <StatusUpdatePanel 
                    request={request} 
                    onStatusUpdate={handleStatusUpdate} 
                    isLoading={loading}
                />
            ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="animate-spin h-8 w-8 text-primary opacity-20" />
                    <p className={cn(gonia.text.caption, "animate-pulse")}>Retrieving Latest Details...</p>
                </div>
            )}
        </div>
      </GoniaResponsiveDialog>
    </>
  );
}
