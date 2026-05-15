"use client";

import { useState, useCallback } from "react";
import { fetchClient } from "../api";
import { useNotifications } from "@/ui/lib/notification-context";

/**
 * Hook for common service request operations (Cancel, Update Status).
 * Handles loading states and notifications.
 */
export function useServiceWorkflow() {
  const { toast } = useNotifications();
  const [isProcessing, setIsProcessing] = useState(false);

  const cancelRequest = useCallback(async (requestId: number | string, onComplete?: () => void) => {
    setIsProcessing(true);
    try {
      await fetchClient(`/api/v1/service-requests/${requestId}/cancel`, {
        method: "PUT"
      });
      toast.success("Request Cancelled", "The request has been officially cancelled.");
      if (onComplete) onComplete();
      return true;
    } catch (error: any) {
      toast.error("Cancellation Failed", error.message || "Could not cancel request.");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

    const updateStatus = useCallback(async (requestId: number | string, status: string, additionalData: Record<string, any> = {}, onComplete?: () => void) => {
      setIsProcessing(true);
      try {
        await fetchClient(`/api/v1/service-requests/${requestId}`, {
          method: "PUT",
          body: JSON.stringify({ status, ...additionalData })
        });
        toast.success("Status Updated Successfully", `Request is now: ${status}`);
        if (onComplete) onComplete();
        return true;
      } catch (error: any) {
        const message = error instanceof Error ? error.message : "Failed to update request status.";
        toast.error("Status Update Failed", message);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }, [toast]);
  return { cancelRequest, updateStatus, isProcessing };
}
