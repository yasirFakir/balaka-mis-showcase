"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, PasswordInput, Label, useNotifications, Logo, LoadingSpinner } from "@/ui";


import { fetchClient } from "@/core/api";
import { useAuth } from "@/lib/auth-context";


import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, AlertCircle } from "lucide-react";

function AdminLoginContent() {
  const { login, user } = useAuth();
  const { toast } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authReason, setAuthReason] = useState<string | null>(null);

  // Capture reason from URL or SessionStorage once on mount
  useEffect(() => {
    // Check session storage first (resolves race condition with ProtectedRoute)
    if (typeof window !== "undefined") {
      const storageReason = sessionStorage.getItem("auth-reason");
      if (storageReason) {
        setAuthReason(storageReason);
        sessionStorage.removeItem("auth-reason");
        return;
      }
    }

    const reason = searchParams.get("reason");
    if (reason) {
      setAuthReason(reason);
      // Immediately clear URL without triggering re-renders that might lose state
      const currentUrl = window.location.pathname;
      window.history.replaceState({}, '', currentUrl);
    }
  }, [searchParams]); // Only run once on mount

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const data = await fetchClient<{ access_token: string, must_change_password: boolean }>("/api/v1/login/access-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      await login(data.access_token, data.must_change_password);
      toast.success("Admin login successful.");
    } catch (err: any) {
      if (err.message?.includes("ACCESS_DENIED_CLIENT")) {
          toast.error("Access Denied", "This portal is for authorized staff only. Please visit airbalakatravel.com for the client portal.");
      } else {
          toast.error(err.message || "Login failed. Check credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand Side (Left) */}
      <div className="hidden lg:flex flex-col w-1/2 bg-primary relative overflow-hidden items-center justify-center border-r-2 border-primary-foreground/10">
        {/* Subtle Dashed Grid Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center text-white"
        >
          <motion.div
            animate={{ 
              rotate: [-2, 2, -2],
              y: [-5, 5, -5]
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <Logo className="h-48 w-48 text-white drop-shadow-2xl" />
          </motion.div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mt-8">Balaka Admin</h1>
          <p className="text-white/60 font-mono text-sm uppercase tracking-normal mt-2">Engineered MIS</p>
        </motion.div>

        <div className="absolute bottom-10 w-full text-center text-white/40 font-mono text-xs font-bold uppercase tracking-normal select-none">
            Developed by &lt;rmia46&gt;
        </div>
      </div>

      {/* Form Side (Right) */}
      <div className="flex flex-col w-full lg:w-1/2 bg-background items-center justify-center p-8 relative">
        <div className="w-full max-w-sm space-y-8">
          
          <AnimatePresence mode="wait">
            {authReason === "session_expired" && (
              <motion.div 
                key="expired"
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                className="bg-destructive/10 border-2 border-destructive p-4 flex items-start gap-3 rounded-none mb-4"
              >
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-normal text-destructive">Administrative Session Expired</h3>
                  <p className="text-[11px] font-bold text-destructive/80 uppercase tracking-tight mt-1">
                    Your secure access token has timed out. For security, please re-authenticate to the MIS dashboard.
                  </p>
                </div>
              </motion.div>
            )}
            {authReason === "logout" && (
              <motion.div 
                key="logout"
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                className="bg-primary/10 border-2 border-primary p-4 flex items-start gap-3 rounded-none mb-4"
              >
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-normal text-primary">Securely Signed Out</h3>
                  <p className="text-[11px] font-bold text-primary/80 uppercase tracking-tight mt-1">
                    Thanks for staying with Balaka. You have been successfully logged out of the management system.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-normal">Secure Access</span>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Authorized Login</h2>
            <p className="text-muted-foreground text-sm">Access restricted to authorized personnel only.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">Administrator Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@airbalakatravel.com" 
                  className="h-12 rounded-none bg-muted/50 border-border/40 focus-visible:bg-background focus-visible:ring-primary/30 text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" title="Enter your password" data-label="password" className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">Access Key</Label>
                <PasswordInput 
                  id="password" 
                  placeholder="••••••••" 
                  className="h-12 rounded-none bg-muted/50 border-border/40 focus-visible:bg-background focus-visible:ring-primary/30 text-base font-mono"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end -mt-2">
                <a href="/auth/forgot-password" className="text-[10px] font-black uppercase tracking-normal text-primary hover:underline">
                    Forgot Password?
                </a>
            </div>

            <Button type="submit" className="w-full h-12 text-sm font-black uppercase tracking-normal shadow-[4px_4px_0_0_var(--gonia-accent)]" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" /> 
                  Authenticating
                </>
              ) : "Login"}
            </Button>
          </form>

          <div className="pt-8 border-t border-border/20">
              <p className="text-[10px] text-muted-foreground uppercase leading-relaxed">
                  By logging in, you agree to comply with the Balaka MIS data protection policy. 
                  Unauthorized access attempts are logged and monitored.
              </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" full />}>
      <AdminLoginContent />
    </Suspense>
  );
}