"use client";

import React, { useMemo, memo } from "react";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { 
  Button, 
  Logo, 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  gonia,
  WhatsAppButton,
} from "@/ui";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from 'next-intl';
import { Globe, DollarSign, Info, Phone, LogOut, MessageSquare, ArrowRight } from "lucide-react";
import { useCurrency } from "@/core/currency-context";
import { CurrencySwitcher } from "../shared/currency-switcher";

const NavContent = memo(({ t, locale, pathname, toggleLanguage, logout, user, router, currency, setCurrency, rate, loading }: any) => {
  const navLinks = [
    { href: "/about", label: t('about'), icon: Info },
    { href: "/contact", label: t('contact'), icon: Phone },
    { href: "/privacy", label: t('privacy'), icon: Globe },
  ];

  const toggleCurrency = () => {
    setCurrency(currency === "SAR" ? "BDT" : "SAR");
  };

  return (
    <div className="flex flex-col h-full bg-[var(--gonia-canvas)]">
      <SheetHeader className="p-6 border-b-2 border-primary bg-white shrink-0">
        <SheetTitle className="flex items-center gap-3 relative z-10">
          <Logo className="h-8 w-8 text-primary" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-black uppercase text-primary">
                {locale === 'en' ? 'Balaka Travel' : 'বলাকা ট্রাভেল'}
            </span>
          </div>
        </SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-6">
          {/* SECTION 1: SUPPORT */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-4 bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                    {locale === 'en' ? 'Customer Support' : 'কাস্টমার সাপোর্ট'}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Button 
                    variant="default" 
                    className="h-16 flex-col rounded-none font-black text-[9px] uppercase tracking-widest gap-1.5 bg-primary shadow-[3px_3px_0_0_var(--gonia-accent)] hover:bg-[var(--gonia-primary-deep)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                    onClick={() => router.push("/support")}
                >
                    <div className="p-1.5 bg-white/10 rounded-none border border-white/10">
                        <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    {t('support')}
                </Button>
                <WhatsAppButton 
                    className="h-16 flex-col rounded-none font-black text-[9px] uppercase tracking-widest gap-1.5 bg-[var(--gonia-success)] border-none text-white shadow-[3px_3px_0_0_var(--gonia-primary)] hover:bg-emerald-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all" 
                    label="WhatsApp"
                />
            </div>
          </div>

          {/* SECTION 2: INFORMATION */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-4 bg-primary/30" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                    {locale === 'en' ? 'Information' : 'তথ্য ও নীতিমালা'}
                </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-none transition-all group border-l-2",
                    pathname === link.href 
                      ? "bg-primary border-primary text-white" 
                      : "bg-white border-transparent text-primary/60 hover:bg-primary hover:text-white active:border-primary"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <link.icon className={cn("h-4 w-4 transition-opacity", pathname === link.href ? "opacity-100" : "opacity-40 group-hover:opacity-100")} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{link.label}</span>
                  </div>
                  <ArrowRight className={cn("h-3 w-3 transition-all", pathname === link.href ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-hover:translate-x-1")} />
                </Link>
              ))}
            </div>
          </div>

          {/* SECTION 3: PREFERENCES */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-4 bg-primary/30" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                    {locale === 'en' ? 'Account Settings' : 'অ্যাকাউন্ট সেটিংস'}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Button 
                    variant="outline" 
                    className="h-16 flex-col rounded-none border-primary/10 text-primary/60 hover:bg-primary hover:text-white hover:border-primary transition-all gap-1"
                    onClick={toggleLanguage}
                >
                    <Globe className="h-4 w-4" />
                    <span className="text-[9px] font-black">{locale === 'en' ? 'ENGLISH' : 'বাংলা'}</span>
                </Button>
                <Button 
                    variant="outline" 
                    className="h-16 flex-col rounded-none border-primary/10 text-primary/60 hover:bg-primary hover:text-white hover:border-primary transition-all gap-1"
                    onClick={toggleCurrency}
                >
                    {currency === "SAR" ? <DollarSign className="h-4 w-4" /> : <span className="text-base font-black leading-none">৳</span>}
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black uppercase">{currency}</span>
                        <span className="text-[7px] opacity-40 group-hover:opacity-100">({rate.toFixed(1)})</span>
                    </div>
                </Button>
            </div>
          </div>
        </div>
      </div>

      {user && (
        <div className="p-6 bg-white border-t border-primary/5 shrink-0">
          <Button 
            variant="outline" 
            className="w-full h-11 rounded-none gap-3 font-black uppercase tracking-[0.2em] text-[10px] border-destructive/20 text-destructive hover:bg-destructive hover:text-white shadow-none transition-all"
            onClick={() => logout()}
          >
            <LogOut className="h-3.5 w-3.5" />
            {t('logout')}
          </Button>
        </div>
      )}
    </div>
  );
});

NavContent.displayName = "NavContent";

export function MobileHeader() {
  const t = useTranslations('Nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { currency, setCurrency, rate, loading } = useCurrency();

  const toggleLanguage = React.useCallback(() => {
    const newLocale = locale === 'en' ? 'bn' : 'en';
    router.replace(pathname, { locale: newLocale });
  }, [locale, pathname, router]);

  return (
    <header className="fixed top-0 left-0 right-0 z-[90] w-full max-w-full overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-primary/10 md:hidden h-16 flex items-center px-4">
      <div className="flex items-center justify-between w-full">
        <Link href="/" className="flex items-center space-x-2 shrink-0">
          <Logo className="h-8 w-8 text-primary" />
          <span className={cn(
            "font-black uppercase tracking-tighter text-primary text-lg",
            locale === 'bn' && "font-bengali"
          )}>
            {t('brand_name_short')}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {!user && (
            <Link href="/auth">
              <Button variant="default" className="h-8 px-3 text-[10px] shadow-[2px_2px_0_0_var(--gonia-accent)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
                {t('login')}
              </Button>
            </Link>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <button className="h-8 w-8 flex flex-col items-center justify-center gap-1 bg-primary/5 hover:bg-primary/10 border-2 border-primary/10 transition-all active:scale-90 group relative overflow-hidden">
                <span className="w-4 h-0.5 bg-primary transition-all group-hover:w-5" />
                <span className="w-5 h-0.5 bg-primary transition-all group-hover:w-3" />
                <span className="w-3 h-0.5 bg-primary transition-all group-hover:w-5" />
                
                {/* Visual indicator */}
                <span className="absolute top-0 right-0 flex h-1 w-1 bg-primary/40 rounded-full" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 border-l-4 border-primary">
              <NavContent 
                t={t} 
                locale={locale} 
                pathname={pathname} 
                toggleLanguage={toggleLanguage} 
                logout={logout}
                user={user}
                router={router}
                currency={currency}
                setCurrency={setCurrency}
                rate={rate}
                loading={loading}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}