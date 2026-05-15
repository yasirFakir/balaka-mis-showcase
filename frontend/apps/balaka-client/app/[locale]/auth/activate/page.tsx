"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { API_URL } from "@/core/api";
import { Button, Card, CardContent, CardHeader, CardTitle, gonia, LoadingSpinner } from "@/ui";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

function ActivationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your activation token...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No activation token provided.");
      return;
    }

    const activateAccount = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/activate-account`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage("Your account has been successfully activated. you can now log in.");
        } else {
          setStatus("error");
          setMessage(data.detail || "Failed to activate account. The link may be expired.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("A network error occurred. Please try again later.");
      }
    };

    activateAccount();
  }, [token]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[var(--gonia-canvas)]">
      <Card className="max-w-md w-full rounded-none border-2 border-primary/10 shadow-none">
        <CardHeader className="text-center pb-2">
          <CardTitle className={cn(gonia.text.h2, "text-primary")}>
            Account Activation
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 text-center space-y-8">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <LoadingSpinner size="lg" />
              <p className="text-sm font-bold text-primary/60 uppercase tracking-tight">{message}</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-[var(--gonia-success)]/10 flex items-center justify-center border-2 border-[var(--gonia-success)]/20">
                  <CheckCircle2 className="h-8 w-8 text-[var(--gonia-success)]" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-primary uppercase">Success!</h3>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                  {message}
                </p>
              </div>
              <Link href="/auth" className="block pt-4">
                <Button className={cn(gonia.button.base, gonia.button.primary, "w-full h-12 gap-2")}>
                  Proceed to Login <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-destructive/10 flex items-center justify-center border-2 border-destructive/20">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-destructive uppercase">Activation Failed</h3>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                  {message}
                </p>
              </div>
              <Link href="/auth" className="block pt-4">
                <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "w-full h-12")}>
                  Return to Home
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ActivationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <ActivationContent />
    </Suspense>
  );
}
