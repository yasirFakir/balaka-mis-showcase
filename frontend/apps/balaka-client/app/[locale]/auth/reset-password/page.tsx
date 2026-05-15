"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, PasswordInput, Label, useNotifications, LoadingSpinner } from "@/ui";
import { fetchClient } from "@/core/api";
import { ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";

function ClientResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const { toast } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
        toast.error("Invalid Request", "Missing security token.");
        return;
    }

    if (password !== confirmPassword) {
        toast.error("Validation Error", "Passwords do not match.");
        return;
    }

    if (password.length < 8) {
        toast.error("Validation Error", "Password must be at least 8 characters.");
        return;
    }

    setIsLoading(true);

    try {
      await fetchClient("/api/v1/reset-password/", {
        method: "POST",
        body: JSON.stringify({
            token,
            new_password: password
        })
      });
      setIsSuccess(true);
      toast.success("Success", "Password updated successfully.");
      setTimeout(() => router.push("/auth"), 3000);
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8 bg-background">
            <div className="text-center space-y-4 max-w-sm">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-xl font-black uppercase">Invalid Link</h2>
                <p className="text-muted-foreground text-sm">
                    This recovery link is invalid or expired.
                </p>
                <Link href="/auth/forgot-password">
                    <Button variant="outline" className="w-full mt-4 h-12 uppercase font-black text-xs">Request New Link</Button>
                </Link>
            </div>
        </div>
      );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-primary/5 p-4 rounded-none border-2 border-primary/10 mb-2">
            {isSuccess ? <ShieldCheck className="h-8 w-8 text-[var(--gonia-success)]" /> : <Lock className="h-8 w-8 text-primary" />}
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight">
            {isSuccess ? "Success" : "Reset Password"}
          </h2>
          <p className="text-muted-foreground text-sm max-w-[280px]">
            {isSuccess 
              ? "Your password has been reset. You can now log in with your new credentials."
              : "Enter your new secure password below."}
          </p>
        </div>

        {!isSuccess && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="password">New Password</Label>
                    <PasswordInput 
                        id="password" 
                        placeholder="••••••••" 
                        className="h-12 rounded-none bg-muted/50 border-border/40 focus-visible:bg-background focus-visible:ring-primary/30 text-base"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <PasswordInput 
                        id="confirm" 
                        placeholder="••••••••" 
                        className="h-12 rounded-none bg-muted/50 border-border/40 focus-visible:bg-background focus-visible:ring-primary/30 text-base"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
            </div>

            <Button type="submit" className="w-full h-12 text-sm font-black uppercase tracking-normal shadow-[4px_4px_0_0_var(--gonia-accent)]" disabled={isLoading}>
              {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : "Update Password"}
            </Button>
          </form>
        )}

        {isSuccess && (
            <div className="pt-4">
                <Link href="/auth">
                    <Button variant="outline" className="w-full h-12 uppercase font-black text-xs">Sign In Now</Button>
                </Link>
            </div>
        )}
      </div>
    </div>
  );
}

export default function ClientResetPasswordPage() {
    return (
        <Suspense fallback={<LoadingSpinner size="lg" full />}>
            <ClientResetPasswordContent />
        </Suspense>
    );
}