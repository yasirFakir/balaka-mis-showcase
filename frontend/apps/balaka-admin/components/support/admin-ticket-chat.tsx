"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { fetchClient, API_URL, getAuthenticatedUrl } from "@/core/api";
import { 
  Button, 
  Textarea, 
  Card, 
  CardContent, 
  CardFooter, 
  Badge, 
  LoadingSpinner, 
  useNotifications, 
  gonia, 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label
} from "@/ui";

import { 
  Send, 
  UserCircle, 
  Paperclip, 
  X, 
  FileText, 
  ExternalLink, 
  ArrowLeft, 
  Info,
  ShieldAlert,
  Clock,
  Check,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useServerEvents } from "@/lib/use-server-events";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { TicketMessage as BaseTicketMessage, SupportTicket } from "@/core/types";

interface TicketMessage extends BaseTicketMessage {
  status?: 'sending' | 'sent' | 'error';
}

interface AdminTicketChatProps {
  ticketId: number;
  initialMessages?: TicketMessage[];
}

export function AdminTicketChat({ ticketId, initialMessages = [] }: AdminTicketChatProps) {
  const { user, hasPermission } = useAuth();
  const { toast } = useNotifications();
  const router = useRouter();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>(initialMessages);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [ticketId]);

  const handleSSEEvent = useCallback((event: string, data: any) => {
      // console.log("Admin Chat SSE:", event, data); // Debug
      if (typeof data === "object") {
          if (event === "ticket_message_created" && data.ticket_id === ticketId) {
              loadData();
          } else if (event === "ticket_updated" && data.id === ticketId) {
              setTicket(prev => prev ? { 
                  ...prev, 
                  status: data.status as "Open" | "In Progress" | "Resolved" | "Closed", 
                  priority: data.priority as any, 
                  category: data.category 
              } : null);
          }
      }
  }, [ticketId]); // Dependencies

  useServerEvents(handleSSEEvent);

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [messages]);

  async function loadData() {
    try {
      const tData = await fetchClient<SupportTicket>(`/api/v1/tickets/${ticketId}`);
      setTicket(tData);
      
      const mResponse = await fetchClient<{ items: TicketMessage[] } | TicketMessage[]>(`/api/v1/tickets/${ticketId}/messages`);
      const mData = Array.isArray(mResponse) ? mResponse : (mResponse.items || []);
      
      // Merge with existing messages to preserve optimistic states if any are still pending
      setMessages(prev => {
          const optimisticIds = prev.filter(m => m.status === 'sending' || m.status === 'error').map(m => m.id);
          const existingIds = mData.map(m => m.id);
          const filteredPrev = prev.filter(m => optimisticIds.includes(m.id) && !existingIds.includes(m.id));
          return [...mData, ...filteredPrev].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
    } catch (error: any) {
      if (error.message !== "SESSION_EXPIRED") {
        console.error("Failed to load chat", error);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (attachments.length + files.length > 5) {
          toast.error("Max 5 files per message allowed.");
          return;
      }

      setUploading(true);
      
      try {
          const uploadedUrls: string[] = [];
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const formData = new FormData();
              formData.append("file", file);
              
              const data = await fetchClient<{ url: string }>(`/api/v1/files/upload?context=support_chat`, {
                  method: "POST",
                  body: formData
              });
              
              uploadedUrls.push(data.url);
          }
          setAttachments(prev => [...prev, ...uploadedUrls]);
      } catch (error: any) {
          const message = error instanceof Error ? error.message : "Failed to upload file";
          toast.error(message);
      } finally {
          setUploading(false);
          if (e.target) e.target.value = ""; 
      }
  };

  const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const clipboardData = e.clipboardData;
      const files: File[] = [];
      const allowed = ["jpg", "jpeg", "png", "webp", "pdf", "docx", "doc", "txt"];
      
      if (clipboardData.items) {
          for (let i = 0; i < clipboardData.items.length; i++) {
              const item = clipboardData.items[i];
              if (item.kind === 'file') {
                  const file = item.getAsFile();
                  if (file) {
                      const ext = file.name.split('.').pop()?.toLowerCase();
                      if (allowed.includes(ext || "")) {
                          files.push(file);
                      }
                  }
              }
          }
      }
      
      if (files.length > 0) {
          e.preventDefault();
          if (attachments.length + files.length > 5) {
              toast.error("Max 5 files per message allowed.");
              return;
          }
          
          setUploading(true);
          
          try {
              const uploadedUrls: string[] = [];
              for (const file of files) {
                  const formData = new FormData();
                  formData.append("file", file);
                  
                  const data = await fetchClient<{ url: string }>(`/api/v1/files/upload?context=support_chat`, {
                      method: "POST",
                      body: formData
                  });
                  
                  uploadedUrls.push(data.url);
              }
              setAttachments(prev => [...prev, ...uploadedUrls]);
          } catch (error: any) {
              const message = error instanceof Error ? error.message : "Failed to upload pasted file";
              toast.error(message);
          } finally {
              setUploading(false);
          }
      }
  };

  const handleSend = async () => {
      if (!reply.trim() && attachments.length === 0) return;
      
      const messageContent = reply.trim() || "Sent an attachment";
      const currentAttachments = [...attachments];
      const tempId = Date.now(); // Temporary ID for optimistic update

      // Optimistic Message
      const optimisticMsg: TicketMessage = {
          id: tempId,
          ticket_id: ticketId,
          sender_id: user?.id || 0,
          message: messageContent,
          created_at: new Date().toISOString(),
          status: 'sending',
          attachments: currentAttachments.length > 0 ? currentAttachments : null
      };

      setMessages(prev => [...prev, optimisticMsg]);
      setReply("");
      setAttachments([]);
      setSending(true);

      try {
          const newMsg = await fetchClient<TicketMessage>(`/api/v1/tickets/${ticketId}/messages`, {
              method: "POST",
              body: JSON.stringify({ 
                  message: messageContent,
                  attachments: currentAttachments.length > 0 ? currentAttachments : null
              })
          });
          
          // Replace optimistic message with real one
          setMessages(prev => prev.map(m => m.id === tempId ? { ...newMsg, status: 'sent' } : m));
      } catch (error) {
          // Mark as error
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
          toast.error("Failed to send message");
      } finally {
          setSending(false);
      }
  };

  const handleStatusChange = async (newStatus: string) => {
      try {
          await fetchClient(`/api/v1/tickets/${ticketId}/status`, {
              method: "PUT",
              body: JSON.stringify({ status: newStatus })
          });
          setTicket(prev => prev ? { ...prev, status: newStatus as any } : null);
          toast.success(`Ticket marked as ${newStatus}`);
      } catch (error) {
          toast.error("Failed to update status");
      }
  };

  if (loading) return <div className="h-[calc(100vh-128px)] md:h-[600px] flex items-center justify-center relative"><LoadingSpinner size="lg" full /></div>;
  if (!ticket) return <div>Ticket not found</div>;

  const sidebarContent = (
    <div className="space-y-8">
        <Card className={cn(gonia.layout.card, "bg-white")}>
            <div className="bg-primary/5 border-b border-primary/10 py-3 px-6">
                <h2 className={gonia.text.label}>Case Information</h2>
            </div>
            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className={gonia.text.caption}>Opened By</span>
                        <p className="text-xs font-bold text-primary mt-1">{ticket.created_by?.full_name || ticket.user?.full_name || "Guest"}</p>
                    </div>
                    <div className="text-right">
                        <span className={gonia.text.caption}>Opened At</span>
                        <p className="text-xs font-mono mt-1">{format(new Date(ticket.created_at), "PP")}</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-primary/5">
                    <span className={gonia.text.caption}>Subject</span>
                    <p className="font-bold text-primary text-base mt-1 leading-tight">{ticket.subject}</p>
                </div>
                
                <div className="pt-4 border-t border-primary/5">
                    <span className={gonia.text.caption}>Category</span>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge className={cn("h-6 border-none shadow-none font-bold", gonia.categoryTheme[ticket.category] || gonia.categoryTheme["General"])}>
                            {ticket.category}
                        </Badge>
                        <Badge className={cn(
                            "h-6 border-none shadow-none font-bold", 
                            ticket.priority === "High" || ticket.priority === "Urgent" ? "bg-[var(--gonia-error)] text-white" : 
                            ticket.priority === "Medium" ? "bg-[var(--gonia-warning)] text-white" :
                            "bg-[var(--gonia-limestone)] text-[var(--gonia-primary-deep)]"
                        )}>
                            {ticket.priority}
                        </Badge>
                    </div>
                </div>

                {ticket.service_request_id && (
                    <div className="p-4 bg-primary/5 border-l-4 border-primary">
                        <span className={gonia.text.caption}>Linked Request</span>
                        <div className="flex items-center justify-between mt-2">
                            <span className={cn(gonia.text.mono, "text-xs")}>REQ-#{ticket.service_request_id}</span>
                            <Link href={`/requests/${ticket.service_request_id}`}>
                                <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "h-7 text-[9px]")}>
                                    View Details
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className={cn(gonia.layout.card, "bg-white border-2 border-primary/10")}>
            <div className="bg-primary/5 border-b border-primary/10 py-3 px-6">
                <h2 className={gonia.text.label}>Management Controls</h2>
            </div>
            <CardContent className="p-6">
                <div className="space-y-4">
                    <div>
                        <Label className={cn(gonia.text.caption, "mb-2 block")}>Update Ticket Status</Label>
                        <Select value={ticket.status} onValueChange={handleStatusChange} disabled={!hasPermission("tickets.manage")}>
                            <SelectTrigger className={gonia.input.base}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-2 border-primary">
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                        Closing a ticket will archive the conversation and notify the client.
                    </p>
                </div>
            </CardContent>
        </Card>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-128px)] md:h-[650px] -mt-6 md:mt-0 -mx-4 md:mx-0">
        <Card className={cn(gonia.layout.card, "lg:col-span-8 flex flex-col h-full bg-white border-none sm:border-2 shadow-none sm:shadow-sm")}>
            <div className="bg-primary/5 border-b border-primary/10 py-3 px-4 md:px-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.back()}
                        className="p-1 hover:bg-black/5 transition-colors group mr-1 md:mr-2"
                    >
                        <ArrowLeft className="h-4 w-4 text-primary group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div className="flex items-center gap-3 border-l pl-3 md:pl-4 border-primary/10">
                        <UserCircle className="h-4 w-4 text-primary opacity-40" />
                        <h2 className={cn(gonia.text.label, "text-xs md:text-sm truncate max-w-[120px] sm:max-w-none")}>
                            {ticket.user?.full_name || "Guest"}
                        </h2>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 md:gap-3">
                    <span className={cn(gonia.text.mono, "text-[10px] md:text-[11px] text-primary/40 hidden sm:inline")}>TKT-#{ticket.id.toString().padStart(4, '0')}</span>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 text-primary hover:bg-primary/5">
                                <Info className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full sm:w-[400px] p-6 bg-[var(--gonia-canvas)] overflow-y-auto">
                            <SheetHeader className="mb-6">
                                <SheetTitle className="text-left">Case Details</SheetTitle>
                            </SheetHeader>
                            {sidebarContent}
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
            <CardContent className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-[var(--gonia-canvas)]" ref={scrollRef}>
                <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                            <motion.div 
                                key={msg.id} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                                <div className={cn(
                                    "max-w-[80%] p-4 rounded-none border-2 transition-all relative",
                                    isMe 
                                        ? "bg-primary border-primary text-white" 
                                        : "bg-white border-primary/10 text-primary",
                                    msg.status === 'error' && "border-destructive bg-destructive/5 text-destructive"
                                )}>
                                    <div className={cn(
                                        "absolute top-3 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent",
                                        isMe 
                                            ? "right-[-8px] border-l-[8px] border-l-primary" 
                                            : "left-[-8px] border-r-[8px] border-r-white lg:border-r-white",
                                        msg.status === 'error' && isMe && "border-l-destructive"
                                    )} />

                                    <div className="flex items-center justify-between gap-6 mb-2">
                                        <span className="text-[9px] font-black uppercase tracking-normal opacity-60">
                                            {isMe ? "Staff Support" : (ticket.user?.full_name || "Client")}
                                        </span>
                                        <div className="flex items-center gap-1.5 opacity-40">
                                            <span className="font-mono text-[9px]">
                                                {format(new Date(msg.created_at), "HH:mm")}
                                            </span>
                                            {isMe && (
                                                <span className="shrink-0">
                                                    {msg.status === 'sending' && <Clock className="h-2.5 w-2.5 animate-pulse" />}
                                                    {msg.status === 'sent' && <Check className="h-2.5 w-2.5 text-emerald-400" />}
                                                    {msg.status === 'error' && <AlertCircle className="h-2.5 w-2.5 text-destructive" />}
                                                    {!msg.status && <Check className="h-2.5 w-2.5" />}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap break-words">
                                        {msg.message}
                                    </p>

                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-black/10">
                                            {msg.attachments.map((url: string, idx: number) => {
                                                const isImg = url.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                                                return (
                                                    <a 
                                                      key={idx} 
                                                      href={getAuthenticatedUrl(url)} 
                                                      target="_blank" 
                                                      rel="noreferrer"
                                                      className={cn(
                                                          "group relative flex items-center gap-2 p-1.5 border border-black/10 hover:border-primary transition-all bg-white",
                                                          isMe ? "bg-white/10 border-white/30 hover:border-white" : ""
                                                      )}
                                                    >
                                                        {isImg ? (
                                                            <img src={getAuthenticatedUrl(url)} alt="attachment" className="w-12 h-12 object-cover" />
                                                        ) : (
                                                            <div className="w-12 h-12 flex items-center justify-center bg-black/5">
                                                                <FileText className="h-6 w-6 opacity-60" />
                                                            </div>
                                                        )}
                                                        <div className="pr-1 flex flex-col justify-center">
                                                            <span className={cn("text-[8px] font-black uppercase tracking-tighter opacity-70", isMe ? "text-white" : "text-primary")}>File {idx + 1}</span>
                                                            <ExternalLink className={cn("h-3 w-3 opacity-50", isMe ? "text-white" : "text-primary")} />
                                                        </div>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {msg.status === 'error' && (
                                        <button 
                                            onClick={() => {
                                                setMessages(prev => prev.filter(m => m.id !== msg.id));
                                                setReply(msg.message);
                                            }}
                                            className="mt-2 text-[9px] font-black uppercase underline hover:opacity-80"
                                        >
                                            Retry
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </CardContent>
            <CardFooter className="p-4 md:p-6 border-t border-primary/10 bg-white flex flex-col gap-3 shrink-0">
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 w-full">
                        {attachments.map((url, idx) => (
                            <div key={idx} className="relative group">
                                <img src={getAuthenticatedUrl(url)} className="w-14 h-14 object-cover border-2 border-primary/20" />
                                <button 
                                  onClick={() => removeAttachment(idx)}
                                  className="absolute -top-1 -right-1 bg-red-600 text-white p-0.5 rounded-none shadow-[2px_2px_0_0_black]"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                        {uploading && (
                            <div className="w-14 h-14 border-2 border-dashed border-primary/20 flex items-center justify-center animate-pulse">
                                <LoadingSpinner size="sm" />
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex w-full gap-3 md:gap-4 items-end">
                    <div className="relative group">
                        <input 
                          type="file" 
                          multiple 
                          className="hidden" 
                          id="admin-support-upload" 
                          onChange={handleFileUpload}
                          disabled={uploading || sending || attachments.length >= 5}
                          accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.doc,.txt"
                        />
                        <label 
                          htmlFor="admin-support-upload"
                          className={cn(
                              "h-11 w-11 md:h-12 md:w-12 flex items-center justify-center border-2 border-primary/10 hover:border-primary/40 cursor-pointer transition-all bg-[var(--gonia-canvas)]",
                              (uploading || attachments.length >= 5) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                            <Paperclip className="h-5 w-5 text-primary/60" />
                        </label>
                    </div>

                    <Textarea 
                        value={reply} 
                        onChange={(e) => setReply(e.target.value)} 
                        onPaste={handlePaste}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Type your message here..." 
                        className={cn(gonia.input.base, "min-h-[44px] h-11 max-h-[150px] py-3")}
                    />
                    <Button 
                        onClick={handleSend} 
                        disabled={sending || (!reply.trim() && attachments.length === 0)} 
                        className={cn(gonia.button.base, gonia.button.primary, "h-11 w-14 md:h-12 md:w-16 shrink-0")}
                    >
                        {sending ? <LoadingSpinner size="sm" /> : <Send className="h-5 w-5" />}
                    </Button>
                </div>
            </CardFooter>
        </Card>

        <div className="hidden lg:block lg:col-span-4 overflow-y-auto">
            {sidebarContent}
        </div>
    </div>
  );
}