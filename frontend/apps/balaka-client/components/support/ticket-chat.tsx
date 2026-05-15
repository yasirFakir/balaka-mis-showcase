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
  StatusBadge,
  LoadingSpinner, 
  useNotifications, 
  gonia, 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/ui";

import { 
  Send, 
  AlertTriangle, 
  UserPlus, 
  Paperclip, 
  X, 
  FileText, 
  ExternalLink, 
  ShieldAlert, 
  ArrowLeft, 
  Info,
  Clock,
  Check,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { Link, useRouter } from "@/i18n/navigation";
import { useServerEvents } from "@/lib/use-server-events";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TicketMessage {
  id: number;
  message: string;
  created_at: string;
  sender_id: number | null;
  attachments?: string[] | null;
  status?: 'sending' | 'sent' | 'error';
}

interface SupportTicket {
  id: number;
  subject: string;
  status: string;
  priority: string;
  user_id: number | null;
  guest_session_id?: string | null;
  created_at: string;
  service_request_id?: number;
}

interface TicketChatProps {
  ticketId: number;
}

export function TicketChat({ ticketId }: TicketChatProps) {
  const t = useTranslations('Support.Chat');
  const tStatus = useTranslations('Support.Status');
  const tPriority = useTranslations('Support.Priority');
  const searchParams = useSearchParams();
  const router = useRouter();
  const guestSessionId = searchParams.get("guest_session_id");
  
  const { user } = useAuth();
  const { toast } = useNotifications();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    const query = guestSessionId ? `?guest_session_id=${guestSessionId}` : "";
    try {
      const tData = await fetchClient<SupportTicket>(`/api/v1/tickets/${ticketId}${query}`);
      setTicket(tData);
      
      const mResponse = await fetchClient<{ items: TicketMessage[] } | TicketMessage[]>(`/api/v1/tickets/${ticketId}/messages${query}`);
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

  useEffect(() => {
    loadData();
  }, [ticketId, guestSessionId]);

  const handleSSEEvent = useCallback((event: string, data: any) => {
      if (typeof data === "object") {
          if (event === "ticket_message_created" && data.ticket_id === ticketId) {
              // Always reload to sync chat, regardless of sender (handles multi-tab/session cases)
              loadData();
          } 
          else if (event === "ticket_updated" && data.id === ticketId) {
              setTicket(prev => prev ? { ...prev, status: data.status, priority: data.priority } : null);
              const statusKey = data.status.toLowerCase().replace(" ", "_");
              // @ts-ignore
              const translatedStatus = tStatus.has(statusKey) ? tStatus(statusKey) : data.status;
              toast.info(t('status_update', { status: translatedStatus }));
          }
      }
  }, [ticketId, guestSessionId, tStatus, t, toast]);

  useServerEvents(handleSSEEvent);

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (attachments.length + files.length > 5) {
          toast.error("Max 5 files per message allowed.");
          return;
      }

      setUploading(true);
      const query = guestSessionId ? `&user=${guestSessionId}` : "";
      
      try {
          const uploadedUrls: string[] = [];
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const formData = new FormData();
              formData.append("file", file);
              
              const data = await fetchClient<{ url: string }>(`/api/v1/files/upload?context=support_chat${query}`, {
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
          const query = guestSessionId ? `&user=${guestSessionId}` : "";
          
          try {
              const uploadedUrls: string[] = [];
              for (const file of files) {
                  const formData = new FormData();
                  formData.append("file", file);
                  
                  const data = await fetchClient<{ url: string }>(`/api/v1/files/upload?context=support_chat${query}`, {
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
          message: messageContent,
          created_at: new Date().toISOString(),
          sender_id: user?.id || null,
          status: 'sending',
          attachments: currentAttachments.length > 0 ? currentAttachments : null
      };

      setMessages(prev => [...prev, optimisticMsg]);
      setReply("");
      setAttachments([]);
      setSending(true);

      const query = guestSessionId ? `?guest_session_id=${guestSessionId}` : "";
      try {
          const newMsg = await fetchClient<TicketMessage>(`/api/v1/tickets/${ticketId}/messages${query}`, {
              method: "POST",
              body: JSON.stringify({ 
                  message: messageContent,
                  attachments: currentAttachments.length > 0 ? currentAttachments : null
              })
          });
          
          // Replace optimistic message with real one
          setMessages(prev => prev.map(m => m.id === tempId ? { ...newMsg, status: 'sent' } : m));
      } catch (error: any) {
          // Mark as error
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
          
          if (error.status === 403) {
              const message = error instanceof Error ? error.message : "Support access restricted.";
              toast.error(message);
          } else {
              toast.error(t('send_error'));
          }
      } finally {
          setSending(false);
      }
  };

  const getTranslatedPriority = (priority: string) => {
      const key = priority.toLowerCase();
      // @ts-ignore
      return tPriority.has(key) ? tPriority(key) : priority;
  };
  
  const getTranslatedStatus = (status: string) => {
      const key = status.toLowerCase().replace(" ", "_");
      // @ts-ignore
      return tStatus.has(key) ? tStatus(key) : status;
  };

  if (loading) return <div className="h-[calc(100vh-128px)] md:h-[650px] flex items-center justify-center relative"><LoadingSpinner size="lg" full /></div>;
  if (!ticket) return <div>Ticket not found</div>;

  const isGuest = !!ticket.guest_session_id && !user;

  const sidebarContent = (
    <div className="space-y-6">
        <Card className={cn(gonia.layout.card, "bg-white")}>
            <div className="bg-primary/5 border-b border-primary/10 py-3 px-6">
                <h2 className={gonia.text.label}>Case Overview</h2>
            </div>
            <CardContent className="p-6 space-y-6">
                <div className="space-y-1">
                    <span className={gonia.text.caption}>Subject</span>
                    <p className="font-bold text-primary text-base leading-tight">{ticket.subject}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/5">
                    <div>
                        <span className={gonia.text.caption}>Priority</span>
                        <div className="mt-1">
                            <Badge className={cn(
                                "h-6 border-none shadow-none font-bold", 
                                ticket.priority === "High" || ticket.priority === "Urgent" ? "bg-[var(--gonia-error)] text-white" : 
                                ticket.priority === "Medium" ? "bg-[var(--gonia-warning)] text-white" :
                                "bg-[var(--gonia-limestone)] text-[var(--gonia-primary-deep)]"
                            )}>
                                {getTranslatedPriority(ticket.priority)}
                            </Badge>
                        </div>
                    </div>
                    <div>
                        <span className={gonia.text.caption}>Status</span>
                        <div className="mt-1">
                            <StatusBadge status={ticket.status} className="h-6" />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-primary/5">
                    <span className={gonia.text.caption}>Opened At</span>
                    <p className="text-xs font-mono mt-1 text-primary/60">{format(new Date(ticket.created_at), "PPp")}</p>
                </div>

                {ticket.service_request_id && (
                    <div className="p-4 bg-primary/5 border-l-4 border-primary">
                        <span className={gonia.text.caption}>Linked Operation</span>
                        <div className="flex items-center justify-between mt-2">
                            <span className={cn(gonia.text.mono, "text-xs")}>#{ticket.service_request_id}</span>
                            <Link href={`/requests/${ticket.service_request_id}`}>
                                <Button variant="ghost" className="h-6 px-2 text-[8px] font-black uppercase hover:bg-primary/10 transition-all">
                                    View Details <ExternalLink className="h-2.5 w-2.5 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );

  return (
    <div className="relative w-full h-full md:h-[650px] md:mt-0">
        <div className="absolute inset-0 md:static flex flex-col md:grid md:grid-cols-12 gap-0 md:gap-8 h-full w-full overflow-hidden bg-background md:bg-transparent">
            {/* Chat Area */}
            <Card className={cn(gonia.layout.card, "lg:col-span-8 flex flex-col h-full bg-white border-none md:border-2 rounded-none md:rounded-sm shadow-none md:shadow-sm overflow-hidden w-full min-h-0")}>
            <div className="bg-primary/5 border-b border-primary/10 py-3 px-4 md:px-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.back()}
                        className="p-1 hover:bg-black/5 transition-colors group mr-1 md:mr-2"
                    >
                        <ArrowLeft className="h-4 w-4 text-primary group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div className="flex items-center gap-3 border-l pl-3 md:pl-4 border-primary/10">
                        <div className={gonia.layout.liveMarker} />
                        <h2 className={cn(gonia.text.label, "text-xs md:text-sm")}>Active Support Channel</h2>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 md:gap-3">
                    <span className={cn(gonia.text.mono, "text-[10px] md:text-[11px] text-primary/40 hidden sm:inline")}>TKT-#{ticketId.toString().padStart(4, '0')}</span>
                    
                    {/* Info Trigger for Mobile */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <button className="lg:hidden p-1.5 hover:bg-black/5 text-primary transition-colors">
                                <Info className="h-5 w-5" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full sm:w-[400px] p-6 bg-[var(--gonia-canvas)] overflow-y-auto">
                            <SheetHeader className="mb-6">
                                <SheetTitle className="text-left">Case Information</SheetTitle>
                            </SheetHeader>
                            {sidebarContent}
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {isGuest && (
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 shrink-0">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="text-[9px] font-bold text-amber-800 uppercase tracking-tight leading-tight">
                            Guest Session: Login for permanent history.
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Link href="/auth">
                            <Button variant="outline" size="sm" className="h-6 text-[8px] font-black uppercase tracking-normal border-amber-300 text-amber-800">Login</Button>
                        </Link>
                    </div>
                </div>
            )}

            <CardContent className="flex-1 overflow-y-auto min-h-0 p-4 md:p-8 space-y-6 bg-[var(--gonia-canvas)]" ref={scrollRef}>
                <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === (user?.id || null) || (!msg.sender_id && !user);
                        const senderName = isMe ? t('me') : t('support');
                        
                        return (
                            <motion.div 
                                key={msg.id} 
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                                <div className={cn(
                                    "max-w-[85%] p-4 relative border transition-all",
                                    isMe 
                                        ? "bg-primary border-primary text-white" 
                                        : "bg-white border-[var(--gonia-secondary)] text-[var(--gonia-ink)]",
                                    msg.status === 'error' && "border-destructive bg-destructive/5 text-destructive"
                                )}>
                                    <div className={cn(
                                        "absolute top-3 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent",
                                        isMe 
                                            ? "right-[-8px] border-l-[8px] border-l-primary" 
                                            : "left-[-8px] border-r-[8px] border-r-[var(--gonia-secondary)]",
                                        msg.status === 'error' && isMe && "border-l-destructive"
                                    )} />

                                    <div className="flex items-center justify-between gap-6 mb-2">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-normal opacity-80",
                                            !isMe && "font-bengali"
                                        )}>
                                            {senderName}
                                        </span>
                                        <div className="flex items-center gap-1.5 opacity-60">
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
                                    <p className={cn(
                                        "text-sm leading-relaxed whitespace-pre-wrap font-medium break-words",
                                        !isMe && "font-bengali"
                                    )}>
                                        {msg.message}
                                    </p>

                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-white/20">
                                            {msg.attachments.map((url, idx) => {
                                                const isImg = url.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                                                return (
                                                    <a 
                                                        key={idx} 
                                                        href={getAuthenticatedUrl(url, guestSessionId)} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className={cn(
                                                            "group relative flex items-center gap-2 p-1.5 border border-white/30 hover:border-white transition-all",
                                                            isMe ? "bg-white/10" : "bg-black/5"
                                                        )}
                                                    >
                                                        {isImg ? (
                                                            <img src={getAuthenticatedUrl(url, guestSessionId)} alt="attachment" className="w-12 h-12 object-cover" />
                                                        ) : (
                                                            <div className="w-12 h-12 flex items-center justify-center bg-black/10">
                                                                <FileText className="h-6 w-6 opacity-60" />
                                                            </div>
                                                        )}
                                                        <div className="pr-1 flex flex-col justify-center">
                                                            <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">File {idx + 1}</span>
                                                            <ExternalLink className="h-3 w-3 opacity-50" />
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

            <CardFooter className="px-3 py-4 md:p-6 border-t bg-muted/10 shrink-0 flex flex-col gap-3">
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 w-full">
                        {attachments.map((url, idx) => (
                            <div key={idx} className="relative group">
                                <img src={getAuthenticatedUrl(url, guestSessionId)} className="w-14 h-14 object-cover border-2 border-primary/20" />
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

                <div className="flex w-full gap-3 items-end">
                    <div className="relative group">
                        <input 
                            type="file" 
                            multiple 
                            className="hidden" 
                            id="support-upload" 
                            onChange={handleFileUpload}
                            disabled={uploading || sending || attachments.length >= 5}
                            accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.doc,.txt"
                        />
                        <label 
                            htmlFor="support-upload"
                            className={cn(
                                "h-11 w-11 flex items-center justify-center border-2 border-primary/10 hover:border-primary/40 cursor-pointer transition-all bg-white",
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
                        placeholder={t('placeholder')}
                        className="min-h-[44px] max-h-[150px] text-sm resize-none rounded-none bg-white border-border/40 focus-visible:ring-primary/20 h-11"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <Button 
                        onClick={handleSend} 
                        disabled={sending || uploading || (!reply.trim() && attachments.length === 0)} 
                        className="h-11 w-14 rounded-none shadow-[3px_3px_0_0_var(--gonia-accent)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all shrink-0 p-0"
                    >
                        {sending ? <LoadingSpinner size="sm" /> : <Send className="h-5 w-5" />}
                    </Button>
                </div>
            </CardFooter>
        </Card>

        {/* Sidebar Panel - Desktop Only */}
        <div className="hidden lg:block lg:col-span-4 overflow-y-auto">
            {sidebarContent}
        </div>
    </div>
    </div>
  );
}