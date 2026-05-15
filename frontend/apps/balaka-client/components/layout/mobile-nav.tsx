"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Home, Grid, LayoutDashboard, UserCircle, LifeBuoy } from "lucide-react";

export function MobileNav() {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    {
      href: "/",
      label: t('home'),
      icon: Home,
      active: pathname === "/"
    },
    {
      href: "/services",
      label: t('services'),
      icon: Grid,
      active: pathname === "/services" || pathname.startsWith("/services/")
    },
    {
      href: "/dashboard",
      label: t('dashboard'),
      icon: LayoutDashboard,
      active: pathname === "/dashboard"
    },
    {
      href: "/support",
      label: t('support'),
      icon: LifeBuoy,
      active: pathname.startsWith("/support")
    },
    {
      href: "/profile",
      label: "Profile", 
      icon: UserCircle,
      active: pathname === "/profile"
    }
  ];

  // If not logged in, only show first two items or a different set
  const visibleItems = user ? navItems : navItems.slice(0, 2);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-md border-t-2 border-primary/5 md:hidden w-full max-w-[100vw] overflow-x-hidden">
      <div className={cn(
        "grid max-w-lg mx-auto pb-[env(safe-area-inset-bottom)] h-16",
        visibleItems.length === 2 ? "grid-cols-2" : "grid-cols-5"
      )}>
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 h-full w-full transition-all duration-200",
              item.active 
                ? "text-primary scale-110" 
                : "text-muted-foreground/60 active:scale-95"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 transition-transform",
              item.active && "stroke-[2.5px]"
            )} />
            <span className={cn(
              "text-[8px] font-black uppercase tracking-[0.1em]",
              item.active ? "opacity-100" : "opacity-60"
            )}>
              {item.label}
            </span>
            {item.active && (
              <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-[0_2px_10px_rgba(49,105,78,0.4)]" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
