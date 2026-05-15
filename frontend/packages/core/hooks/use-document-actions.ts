"use client";

import { useCallback } from "react";
import { API_URL, fetchClient } from "../api";
import { useNotifications } from "@/ui/lib/notification-context";

/**
 * Hook for unified document actions (Viewing, Downloading).
 * Handles tokens, window management, and error reporting.
 */
export function useDocumentActions() {
  const { toast } = useNotifications();

  /**
   * Opens a secure file in a new window by fetching it with auth headers
   * and creating a local blob URL.
   */
  const viewSecureFile = useCallback(async (path: string) => {
    if (!path) return;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
        newWindow.document.write(`
            <div style="height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; background: #FCFDFF;">
                <div style="text-align: center;">
                    <div style="margin-bottom: 20px; font-weight: bold; color: #065084;">LOADING SECURE DOCUMENT...</div>
                    <div style="font-size: 12px; color: #78B9B5;">Decrypting assets from technical vault...</div>
                </div>
            </div>
        `);
    }

    try {
      if (path.startsWith('/static/')) {
        if (newWindow) newWindow.location.href = `${API_URL}${path}`;
        return;
      }

      const token = localStorage.getItem("token");
      const fullUrl = path.startsWith('http') ? path : `${API_URL}${path}`;
      
      const res = await fetch(fullUrl, { 
        headers: { "Authorization": `Bearer ${token}` } 
      });

      if (!res.ok) throw new Error("VAULT_ACCESS_DENIED");

      const contentType = res.headers.get("Content-Type") || "application/octet-stream";
      const blob = await res.blob();
      const typedBlob = new Blob([blob], { type: contentType });
      const url = window.URL.createObjectURL(typedBlob);

      if (newWindow) {
        if (contentType.startsWith("image/")) {
            newWindow.document.body.innerHTML = `
                <div style="margin: 0; padding: 0; background: #000; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
                    <img src="${url}" style="max-width: 100%; max-height: 100vh; object-fit: contain;" alt="Secure Attachment" />
                </div>
            `;
            newWindow.document.title = "View Secure Image";
        } else {
            newWindow.location.href = url;
        }
      }
    } catch (err) {
      if (newWindow) newWindow.close();
      console.error("Document access error:", err);
      toast.error("Security vault access failed. Document could not be retrieved.");
    }
  }, [toast]);

  /**
   * Downloads a PDF invoice/receipt for a specific entity.
   */
  const downloadInvoice = useCallback(async (requestId: number | string) => {
    const toastId = toast.loading("Generating Document", "Compiling financial summary...");
    try {
      const res = await fetch(`${API_URL}/api/v1/service-requests/${requestId}/invoice`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("DOCUMENT_GENERATION_FAILED");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${requestId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Document Downloaded", "Financial summary retrieved successfully.");
    } catch (error) {
      console.error("Document download error", error);
      toast.error("Document error", "Failed to compile the requested financial summary.");
    }
  }, [toast]);

  return { viewSecureFile, downloadInvoice };
}
