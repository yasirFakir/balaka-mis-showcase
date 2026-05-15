"use client";

import { useState, useEffect, Suspense } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams, useSearchParams } from "next/navigation";
import { Button, Input, PasswordInput, Form, Tabs, TabsContent, TabsList, TabsTrigger, useNotifications, Logo, PHONE_REGEX, NAME_REGEX, GoniaField, GONIA_INPUT_CLASSES, GONIA_ERROR_CLASSES, LoadingSpinner } from "@/ui";



import { fetchClient } from "@/core/api";
import { useAuth } from "@/lib/auth-context";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, AlertCircle } from "lucide-react";
import { PhoneInput } from "@/components/shared/phone-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";




// Define Schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").regex(new RegExp(NAME_REGEX), "Name cannot contain numbers"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(new RegExp(PHONE_REGEX), "Invalid Phone Number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, "You must accept the terms to use our services."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

function AuthContent() {
  const t = useTranslations('Auth');
  const tNav = useTranslations('Nav');
  const { login, user } = useAuth();
  const { toast } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [authReason, setAuthReason] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const returnUrl = searchParams.get("returnUrl");

  // Handle Cooldown Timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendActivation = async () => {
    const email = loginForm.getValues("email");
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }

    setResendLoading(true);
    try {
      await fetchClient("/api/v1/resend-activation", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.success("Activation link resent!");
      setResendCooldown(120); // 2 minute cooldown
    } catch (err: any) {
      toast.error(err.message || "Failed to resend activation link.");
    } finally {
      setResendLoading(false);
    }
  };

  // Forms
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "+880 ",
      password: "",
      confirmPassword: "",
      terms: false,
    },
    mode: "onChange",
  });

  const { locale } = useParams();

  useEffect(() => {
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
      const timer = setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, router, returnUrl]);

  if (user) {
    return null; 
  }

  const handleLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    setAuthReason(null);
    try {
      const formData = new URLSearchParams();
      formData.append("username", values.email);
      formData.append("password", values.password);

      const data = await fetchClient<{ access_token: string, must_change_password: boolean }>("/api/v1/login/access-token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      await login(data.access_token, data.must_change_password);
      toast.success("Welcome back!");
    } catch (err: any) {
      if (err.status === 403) {
        setAuthReason("unverified");
      } else {
        toast.error(err.message || "Login failed. Please check your credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (values: z.infer<typeof signupSchema>) => {
    setIsLoading(true);
    try {
      await fetchClient("/api/v1/users/register", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          full_name: values.fullName,
          phone_number: values.phone,
        }),
      });

      toast.success("Registration successful! please check your email to activate your account.");
      setActiveTab("login");
      loginForm.setValue("email", values.email);
      signupForm.reset();
    } catch (err: any) {
      toast.error(err.message || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative lg:fixed lg:inset-0 lg:z-50 flex flex-col lg:flex-row min-h-[calc(100vh-64px)] lg:h-screen w-full bg-background overflow-y-auto lg:overflow-hidden top-0 lg:top-16">
      {/* Brand Side (Left) */}
      <div className="hidden lg:flex flex-col w-1/2 bg-primary relative overflow-hidden items-center justify-center border-r-2 border-primary-foreground/10 h-full">
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center text-white p-12"
        >
          <motion.div animate={{ rotate: [-2, 2, -2], y: [-5, 5, -5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
            <Logo className="h-48 w-48 text-white drop-shadow-2xl" />
          </motion.div>
          <h1 className={cn("font-black uppercase tracking-tighter mt-8 text-center", locale === 'bn' ? "font-bengali text-4xl" : "text-4xl")}>
            {tNav('brand_name')}
          </h1>
          <p className="text-white/60 font-bengali text-base mt-2 text-center uppercase tracking-normal">
            {t('tagline')}
          </p>
        </motion.div>
      </div>

      {/* Form Side (Right) */}
      <div className="flex flex-col w-full lg:w-1/2 bg-background items-center justify-center relative min-h-full lg:h-full overflow-y-auto py-12 md:py-20 lg:py-12">
        <div className="w-full max-w-sm space-y-8 p-6 md:p-0">
          
          <AnimatePresence mode="wait">
            {authReason === "session_expired" && (
              <motion.div key="expired" initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="bg-destructive/10 border-2 border-destructive p-4 flex items-start gap-3 rounded-none mb-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-normal text-destructive">{t('session_expired')}</h3>
                  <p className="text-[11px] font-bold text-destructive/80 uppercase tracking-tight mt-1">Your session has timed out. Please sign in again.</p>
                </div>
              </motion.div>
            )}
            {authReason === "logout" && (
              <motion.div key="logout" initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="bg-primary/10 border-2 border-primary p-4 flex items-start gap-3 rounded-none mb-2">
                <Plane className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-normal text-primary">{t('see_you_soon')}</h3>
                  <p className="text-[11px] font-bold text-primary/80 uppercase tracking-tight mt-1">{t('logout_msg')}</p>
                </div>
              </motion.div>
            )}
            {authReason === "unverified" && (
              <motion.div key="unverified" initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="bg-amber-500/10 border-2 border-amber-500 p-4 flex flex-col gap-3 rounded-none mb-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-normal text-amber-600">Verification Required</h3>
                    <p className="text-[11px] font-bold text-amber-600/80 uppercase tracking-tight mt-1">Please check your email to activate your account before logging in.</p>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-[9px] w-fit border-amber-500/50 text-amber-700 hover:bg-amber-500 hover:text-white transition-all self-end"
                  onClick={handleResendActivation}
                  disabled={resendLoading || resendCooldown > 0}
                >
                  {resendLoading ? "Sending..." : resendCooldown > 0 ? `Resend Link (${resendCooldown}s)` : "Resend Link"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
                <Plane className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-normal">{t('start_journey')}</span>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight">{activeTab === "login" ? t('welcome_back') : t('join_balaka')}</h2>
          </div>

          <div className="w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full mb-8">
                <TabsTrigger value="login" className="flex-1">{t('login')}</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">{t('signup')}</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab} 
                initial={{ opacity: 0, x: 10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -10 }} 
                transition={{ duration: 0.2 }}
              >
                {activeTab === "login" ? (
                    <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-6">
                          <div className="space-y-4">
                            <GoniaField control={loginForm.control} name="email" label={t('registered_email')} required>
                              {({ field, error }) => (
                                <div className="w-full">
                                    <Input {...field} type="email" placeholder="your@email.com" className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES)} />
                                </div>
                              )}
                            </GoniaField>
                            <GoniaField control={loginForm.control} name="password" label={t('password_label')} required customControl>
                              {({ field, error }) => (
                                <div className="w-full">
                                    <PasswordInput {...field} placeholder="••••••••" className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES)} />
                                </div>
                              )}
                            </GoniaField>
                          </div>
                          <div className="flex justify-end -mt-2">
                             <Link href="/auth/forgot-password" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                                {t('forgot_password')}
                             </Link>
                          </div>
                          <Button type="submit" size="xl" className="w-full text-lg" disabled={isLoading}>
                            {isLoading ? <LoadingSpinner size="sm" /> : t('login')}
                          </Button>
                        </form>
                    </Form>
                ) : (
                    <Form {...signupForm}>
                        <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-6">
                          <div className="space-y-4">
                            <GoniaField control={signupForm.control} name="fullName" label={t('full_name')} required>
                              {({ field, error }) => (
                                <div className="w-full">
                                    <Input {...field} placeholder="John Doe" className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES)} />
                                </div>
                              )}
                            </GoniaField>
                            <GoniaField control={signupForm.control} name="email" label={t('email_address')} required>
                              {({ field, error }) => (
                                <div className="w-full">
                                    <Input {...field} type="email" placeholder="your@email.com" className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES)} />
                                </div>
                              )}
                            </GoniaField>
                            <GoniaField control={signupForm.control} name="phone" label={t('phone_number')} required>
                              {({ field, error }) => (
                                <div className="w-full">
                                    <PhoneInput value={field.value} onChange={field.onChange} className={error ? "ring-1 ring-destructive/30" : ""} />
                                </div>
                              )}
                            </GoniaField>
                            <GoniaField control={signupForm.control} name="password" label={t('create_password')} required customControl>
                              {({ field, error }) => (
                                <div className="w-full">
                                    <PasswordInput {...field} placeholder="Choose a strong password" className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES)} />
                                </div>
                              )}
                            </GoniaField>
                            <GoniaField control={signupForm.control} name="confirmPassword" label={t('confirm_password')} required customControl>
                              {({ field, error }) => (
                                <div className="w-full">
                                    <PasswordInput {...field} placeholder="Re-enter password" className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES)} />
                                </div>
                              )}
                            </GoniaField>
                            
                            <div className="space-y-1.5">
                              <div className="flex items-center space-x-2 pt-2">
                                <input {...signupForm.register("terms")} type="checkbox" id="terms" className="h-4 w-4 rounded-none border-2 border-primary text-primary focus:ring-primary cursor-pointer" />
                                <label htmlFor="terms" className="text-[10px] font-bold uppercase tracking-tight leading-none cursor-pointer">
                                  {t('terms_accept')}{' '}
                                  <Link href="/about" className="text-primary underline">{t('terms_link')}</Link>
                                </label>
                              </div>
                              {signupForm.formState.errors.terms && (
                                  <p className="text-[9px] font-black uppercase tracking-normal text-destructive">* {signupForm.formState.errors.terms.message}</p>
                              )}
                            </div>
                          </div>
                          <Button type="submit" size="xl" className="w-full text-lg" disabled={isLoading}>
                            {isLoading ? <LoadingSpinner size="sm" /> : t('signup')}
                          </Button>
                        </form>
                    </Form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthenticationPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" full />}>
      <AuthContent />
    </Suspense>
  );
}
