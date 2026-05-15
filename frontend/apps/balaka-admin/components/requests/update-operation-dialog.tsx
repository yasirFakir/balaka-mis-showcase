"use client";

import { useEffect, useState } from "react";
import { fetchClient } from "@/core/api";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, useNotifications } from "@/ui";

import { DynamicForm } from "../shared/dynamic-form";
import { useAuth } from "@/lib/auth-context";

import { Pencil, Loader2, Save } from "lucide-react";

interface UpdateOperationDialogProps {
    request: any;
    onUpdated: (updatedRequest: any) => void;
    trigger?: React.ReactNode;
}

export function UpdateOperationDialog({ request, onUpdated, trigger }: UpdateOperationDialogProps) {
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const handleUpdate = async (formData: any) => {
        setLoading(true);
        try {
            const updated = await fetchClient<any>(`/api/v1/service-requests/${request.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    form_data: formData,
                    status: formData.status || request.status // Allow form to drive status if field exists
                })
            });
            onUpdated(updated);
            toast.success("Operation record updated");
            setOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Update failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <div onClick={() => setOpen(true)} className="cursor-pointer">
                {trigger || (
                    <Button variant="outline" size="sm" className="h-8 rounded-none border-primary/20 text-primary hover:bg-primary hover:text-white">
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Update Details
                    </Button>
                )}
            </div>
            <DialogContent className="sm:max-w-[700px] rounded-none border-2 p-0 overflow-hidden">
                <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight text-primary">
                        Update Operation: {request.service_definition.name}
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-normal opacity-60">
                        Edit process data // Adjust pricing // Internal Audit Record #{request.id}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="p-6 max-h-[70vh] overflow-y-auto bg-brand-canvas/30">
                    <DynamicForm 
                        schema={request.service_definition.form_schema} 
                        onSubmit={handleUpdate}
                        // Pre-fill form with existing data
                        defaultValues={request.form_data} 
                        submitLabel="Save Updates"
                        context={{
                            user_identifier: user?.id.toString() || "system",
                            service_name: request.service_definition.slug,
                            service_id: request.service_definition.id
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
