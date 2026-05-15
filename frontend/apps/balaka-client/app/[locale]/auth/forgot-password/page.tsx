"use client";

import { useState } from "react";
import { Button, Input, Label, useNotifications, LoadingSpinner } from "@/ui";
import { fetchClient } from "@/core/api";
import { KeyRound, ArrowLeft, MailCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function ClientForgotPasswordPage() {
  const t = useTranslations('Auth');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const { toast } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await fetchClient(`/api/v1/password-recovery/${encodeURIComponent(email)}`, {
        method: "POST",
      });
      setIsSent(true);
      toast.success("Success", "Recovery email dispatched.");
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to initiate recovery.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-primary/5 p-4 rounded-none border-2 border-primary/10 mb-2">
            {isSent ? <MailCheck className="h-8 w-8 text-[var(--gonia-success)]" /> : <KeyRound className="h-8 w-8 text-primary" />}
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight">
            {isSent ? "Check Email" : "Password Recovery"}
          </h2>
          <p className="text-muted-foreground text-sm max-w-[280px]">
            {isSent 
              ? `Verification link has been sent to ${email}.`
              : "Enter your registered email to recover access to your Balaka account."}
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">Registered Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="your@email.com" 
                className="h-12 rounded-none bg-muted/50 border-border/40 focus-visible:bg-background focus-visible:ring-primary/30 text-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full h-12 text-sm font-black uppercase tracking-normal shadow-[4px_4px_0_0_var(--gonia-accent)]" disabled={isLoading}>
              {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : "Send Recovery Link"}
            </Button>
          </form>
        ) : (
          <div className="pt-4 text-center">
             <p className="text-xs text-muted-foreground mb-8">
                Please check your inbox. The link will expire shortly.
             </p>
             <Button variant="outline" className="w-full h-12 uppercase font-black text-xs tracking-normal" onClick={() => setIsSent(false)}>
                Try Different Email
             </Button>
          </div>
        )}

        <div className="pt-8 border-t border-border/20 text-center">
            <Link href="/auth" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-normal text-primary hover:underline">
                <ArrowLeft className="h-3 w-3" /> Back to Sign In
            </Link>
        </div>
      </div>
    </div>
  );
}