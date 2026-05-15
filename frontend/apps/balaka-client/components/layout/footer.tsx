"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Logo, gonia } from "@/ui";
import { cn } from "@/lib/utils";

export function Footer() {
  const tNav = useTranslations("Nav");
  const t = useTranslations("Footer");
  const pathname = usePathname();
  const year = new Date().getFullYear();

  const isAuthPage = pathname.includes("/auth");

  // Hide on support chat pages
  if (pathname.includes("/support/")) {
    return null;
  }

  return (
    <footer className={cn(
      "bg-primary text-white border-t-2 border-primary-foreground/10 pt-16 pb-8",
      isAuthPage && "hidden md:block"
    )}>
      <div className={cn(gonia.layout.container, "space-y-12")}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <Logo className="h-10 w-10 text-white" />
              <span className="text-xl font-black uppercase tracking-tighter">{tNav('brand_name')}</span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed max-w-sm">
              {t('tagline')}
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-normal text-white/40">{t('quick_nav')}</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm font-bold uppercase tracking-tight text-white/80 hover:text-white transition-colors">{tNav('home')}</Link>
              </li>
              <li>
                <Link href="/services" className="text-sm font-bold uppercase tracking-tight text-white/80 hover:text-white transition-colors">{tNav('services')}</Link>
              </li>
              <li>
                <Link href="/about" className="text-sm font-bold uppercase tracking-tight text-white/80 hover:text-white transition-colors">{tNav('about')}</Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm font-bold uppercase tracking-tight text-white/80 hover:text-white transition-colors">{tNav('contact')}</Link>
              </li>
            </ul>
          </div>

          {/* Legal / Secondary */}
          <div className="md:col-span-4 space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-normal text-white/40">{t('support_legal')}</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/support" className="text-sm font-bold uppercase tracking-tight text-white/80 hover:text-white transition-colors">{tNav('support')}</Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm font-bold uppercase tracking-tight text-white/80 hover:text-white transition-colors">{tNav('privacy')}</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold uppercase tracking-normal text-white/40">
            &copy; {year} {tNav('brand_name')}. {t('rights_reserved')}
          </p>
        </div>
      </div>
    </footer>
  );
}