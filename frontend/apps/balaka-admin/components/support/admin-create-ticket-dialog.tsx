"use client";

import { useState, useEffect } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useNotifications, gonia } from "@/ui";





import { fetchClient } from "@/core/api";
import { User, ServiceRequest } from "@/core/types";

import { TicketPlus, Loader2, Plus, Ticket as TicketIcon } from "lucide-react";
import { cn } from "@/lib/utils";


interface AdminCreateTicketDialogProps {
  onTicketCreated: () => void;
  serviceRequestId?: number;
}

export function AdminCreateTicketDialog({ onTicketCreated, serviceRequestId }: AdminCreateTicketDialogProps) {
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [users, setUsers] = useState<User[]>([]);
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingRequests, setLoadingRequests] = useState(false);

    const [selectedUser, setSelectedUser] = useState<string>("");
    const [selectedRequest, setSelectedRequest] = useState<string>("none");
    const [category, setCategory] = useState<string>("General");
    const [priority, setPriority] = useState<string>("Medium");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (open) {
            loadUsers();
        }
    }, [open]);

    useEffect(() => {
        if (selectedUser) {
            loadUserRequests(parseInt(selectedUser));
        } else {
            setRequests([]);
            setSelectedRequest("none");
        }
    }, [selectedUser]);

    async function loadUsers() {
        setLoadingUsers(true);
        try {
            const data = await fetchClient<any>("/api/v1/users/");
            setUsers(Array.isArray(data) ? data : (data.items || []));
        } catch (error) {
            toast.error("Failed to load user directory");
        } finally {
            setLoadingUsers(false);
        }
    }

    async function loadUserRequests(userId: number) {
        setLoadingRequests(true);
        try {
            const data = await fetchClient<any>(`/api/v1/service-requests/?user_id=${userId}`);
            setRequests(Array.isArray(data) ? data : (data.items || []));
        } catch (error) {
            toast.error("Failed to load client operations");
        } finally {
            setLoadingRequests(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) {
            toast.error("Client selection required");
            return;
        }
        setLoading(true);

        try {
            await fetchClient("/api/v1/tickets/", {
                method: "POST",
                body: JSON.stringify({
                    user_id: parseInt(selectedUser),
                    service_request_id: selectedRequest === "none" ? null : parseInt(selectedRequest),
                    category,
                    priority,
                    subject,
                    initial_message: message
                })
            });

            toast.success("Support ticket established successfully");
            setOpen(false);
            onTicketCreated();
            
            // Reset
            setSelectedUser("");
            setSelectedRequest("none");
            setSubject("");
            setMessage("");
            setCategory("General");
            setPriority("Medium");
        } catch (error: any) {
            toast.error(error.message || "Establishing ticket failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={cn(gonia.button.base, gonia.button.primary, "gap-2")}>
                    <Plus className="h-4 w-4" /> Open New Ticket
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-none border-2 border-primary bg-white">
                <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
                    <div className="flex items-center gap-3">
                        <TicketIcon className="h-6 w-6 text-primary" />
                        <DialogTitle className={gonia.text.h2}>Client Support Initiation</DialogTitle>
                    </div>
                    <DialogDescription className={gonia.text.caption}>
                        Initialize a technical support channel for client communication.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-[var(--gonia-canvas)] max-h-[85vh] overflow-y-auto technical-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className={gonia.text.label}>Client Identity</Label>
                            <Select onValueChange={setSelectedUser} value={selectedUser}>
                                <SelectTrigger className={cn(gonia.input.base, "bg-white")}>
                                    <SelectValue placeholder={loadingUsers ? "Indexing Directory..." : "Select Client"} />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-2 border-primary/10">
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id.toString()} className="text-xs font-bold uppercase py-3">
                                            {u.full_name || u.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className={gonia.text.label}>Operational Link (Optional)</Label>
                            <Select 
                                onValueChange={setSelectedRequest} 
                                value={selectedRequest}
                                disabled={!selectedUser || loadingRequests}
                            >
                                <SelectTrigger className={cn(gonia.input.base, "bg-white")}>
                                    <SelectValue placeholder={loadingRequests ? "Fetching Logs..." : "Select Service Operation"} />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-2 border-primary/10">
                                    <SelectItem value="none" className="text-xs font-bold uppercase py-3 italic opacity-60">None / General Inquiry</SelectItem>
                                    {requests.map(r => (
                                        <SelectItem key={r.id} value={r.id.toString()} className="text-xs font-bold uppercase py-3">
                                            Operation #{r.id} ({new Date(r.created_at).toLocaleDateString()})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className={gonia.text.label}>Classification</Label>
                            <Select onValueChange={setCategory} value={category}>
                                <SelectTrigger className={cn(gonia.input.base, "bg-white")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-2 border-primary/10">
                                    <SelectItem value="General" className="text-xs font-bold uppercase py-3">General Inquiry</SelectItem>
                                    <SelectItem value="Information Update" className="text-xs font-bold uppercase py-3">Data Update</SelectItem>
                                    <SelectItem value="File Issue" className="text-xs font-bold uppercase py-3">Documentation Issue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className={gonia.text.label}>Priority Level</Label>
                            <Select onValueChange={setPriority} value={priority}>
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

                    <div className="space-y-2">
                        <Label className={gonia.text.label}>Support Subject</Label>
                        <Input 
                            id="subject" 
                            value={subject} 
                            onChange={(e) => setSubject(e.target.value)} 
                            className={gonia.input.base}
                            placeholder="Briefly state the communication objective..." 
                            required 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className={gonia.text.label}>Technical Message</Label>
                        <Textarea 
                            id="message" 
                            value={message} 
                            onChange={(e) => setMessage(e.target.value)} 
                            placeholder="Provide detailed instructions or requirements for the client..."
                            className={cn(gonia.input.base, "min-h-[120px] py-4")}
                            required 
                        />
                    </div>

                    <DialogFooter className="pt-6 border-t border-primary/10">
                        <Button type="submit" disabled={loading} className={cn(gonia.button.base, gonia.button.primary, "w-full h-12")}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Establish Support Channel
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}