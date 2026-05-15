"use client";

import { useState, useEffect } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useNotifications, gonia } from "@/ui";





import { fetchClient } from "@/core/api";

import { Loader2, MessageSquarePlus, TicketIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";


interface ServiceRequest {
    id: number;
    status: string;
    service_definition: {
        name: string;
    };
}

interface CreateTicketDialogProps {
  onTicketCreated: () => void;
  serviceRequestId?: number;
  defaultCategory?: string;
  trigger?: React.ReactNode;
}

export function CreateTicketDialog({ onTicketCreated, serviceRequestId, defaultCategory = "Support", trigger }: CreateTicketDialogProps) {
  const t = useTranslations('Support.Create');
  const tCategory = useTranslations('Support.Categories');
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [selectedRequest, setSelectedRequest] = useState<string>("");
  
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  // Categories that require linking to an order/request
  const categoriesRequiringOrder = ["order", "Information Update", "File Issue"];

  useEffect(() => {
      if (open && categoriesRequiringOrder.includes(category)) {
          fetchClient<any>("/api/v1/service-requests/me")
            .then(response => {
                // Handle enveloped ListResponse { items, total }
                const data = Array.isArray(response) ? response : (response.items || []);
                setRequests(data);
            })
            .catch(error => {
                if (error.message !== "SESSION_EXPIRED") {
                    console.error("Failed to load requests", error);
                }
            });
      }
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = { 
          subject, 
          priority, 
          initial_message: message,
          category
      };
      
      if (categoriesRequiringOrder.includes(category) && selectedRequest) {
          payload.service_request_id = parseInt(selectedRequest);
          // Auto-append context to subject if generic
          if (!subject.includes("#")) {
              payload.subject = `[Req #${selectedRequest}] ${subject}`;
          }
      }

      await fetchClient("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      toast.success(t('success'));
      setOpen(false);
      window.location.reload(); 
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={cn(gonia.button.base, gonia.button.primary, "gap-2")}>
            <MessageSquarePlus className="h-4 w-4" /> {t('title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-none border-2 border-primary bg-white">
        <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-3">
              <TicketIcon className="h-6 w-6 text-primary" />
              <DialogTitle className={gonia.text.h2}>{t('title')}</DialogTitle>
          </div>
          <DialogDescription className={gonia.text.caption}>
            {t('desc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-[var(--gonia-canvas)] max-h-[85vh] overflow-y-auto no-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label className={gonia.text.label}>{t('category')}</Label>
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className={cn(gonia.input.base, "bg-white")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-primary/10">
                        <SelectItem value="general" className="text-xs font-bold uppercase py-3">{tCategory('general')}</SelectItem>
                        <SelectItem value="Information Update" className="text-xs font-bold uppercase py-3">{tCategory('info')}</SelectItem>
                        <SelectItem value="File Issue" className="text-xs font-bold uppercase py-3">{tCategory('file')}</SelectItem>
                        <SelectItem value="order" className="text-xs font-bold uppercase py-3">{tCategory('order')}</SelectItem>
                        <SelectItem value="billing" className="text-xs font-bold uppercase py-3">{tCategory('billing')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className={gonia.text.label}>{t('priority')}</Label>
                <Select onValueChange={setPriority} defaultValue={priority}>
                    <SelectTrigger className={cn(gonia.input.base, "bg-white")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-primary/10">
                        <SelectItem value="Low" className="text-xs font-bold uppercase py-3 text-secondary">Low</SelectItem>
                        <SelectItem value="Medium" className="text-xs font-bold uppercase py-3 text-brand-accent">Medium</SelectItem>
                        <SelectItem value="High" className="text-xs font-bold uppercase py-3 text-destructive">High</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          {categoriesRequiringOrder.includes(category) && (
              <div className="space-y-2">
                <Label className={gonia.text.label}>{t('select_app')}</Label>
                <Select value={selectedRequest} onValueChange={setSelectedRequest}>
                    <SelectTrigger className={cn(gonia.input.base, "bg-white")}>
                        <SelectValue placeholder={t('select_req_placeholder')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-primary/10">
                        {requests.map(req => (
                            <SelectItem key={req.id} value={req.id.toString()} className="text-xs font-bold uppercase py-3">
                                Operation #{req.id} - {req.service_definition?.name} ({req.status})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
          )}

          <div className="space-y-2">
            <Label className={gonia.text.label} htmlFor="subject">{t('subject')}</Label>
            <Input 
                id="subject" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                className={gonia.input.base}
                required 
                placeholder={t('subject_placeholder')} 
            />
          </div>

          <div className="space-y-2">
            <Label className={gonia.text.label} htmlFor="message">{t('message')}</Label>
            <Textarea 
                id="message" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                className={cn(gonia.input.base, "min-h-[120px] py-4")}
                required
                placeholder={t('message_placeholder')}
            />
          </div>

          <DialogFooter className="pt-6 border-t border-primary/10">
            <Button 
                type="submit" 
                disabled={loading || (categoriesRequiringOrder.includes(category) && !selectedRequest)}
                className={cn(gonia.button.base, gonia.button.primary, "w-full h-12")}
            >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? t('submitting') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
