"use client";

// Use localized navigation helpers
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button, Logo, NotificationBell, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, GoniaContainer } from "@/ui";


import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from 'next-intl';


import { 
  User as UserIcon, 
  LogOut, 
  LayoutDashboard, 
  UserCircle, 
  Home, 
  LayoutGrid, 
  Info, 
  Phone, 
  LifeBuoy, 
  Languages 
} from "lucide-react";
import { API_URL } from "@/core/api";
import { SecureImage } from "../shared/secure-image";
import { CurrencySwitcher } from "../shared/currency-switcher";

export function MainNav() {
  const t = useTranslations('Nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, imageKey } = useAuth();

  const isAuthPage = pathname === "/auth";

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'bn' : 'en';
    router.replace(pathname, { locale: newLocale });
  };

  const navItems = [
    { href: "/", label: t('home'), icon: Home, active: pathname === "/" },
    { href: "/services", label: t('services'), icon: LayoutGrid, active: pathname === "/services" },
    { href: "/about", label: t('about'), icon: Info, active: pathname === "/about" },
    { href: "/contact", label: t('contact'), icon: Phone, active: pathname === "/contact" },
    ...(user ? [
      { href: "/support", label: t('support'), icon: LifeBuoy, active: pathname.startsWith("/support") },
      { href: "/dashboard", label: t('dashboard'), icon: LayoutDashboard, active: pathname === "/dashboard" },
    ] : []),
  ];

  return (
    <nav className="w-full max-w-full overflow-hidden border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 right-0 z-[100] transition-colors duration-300">
      <GoniaContainer className="flex h-16 items-center">
        <Link href="/" className="mr-8 flex items-center space-x-3 shrink-0">
          <Logo className="h-10 w-10 text-primary" />
          <span className={cn(
            "font-black uppercase tracking-tighter text-primary",
            locale === 'bn' ? "font-bengali text-xl" : "text-[20px]"
          )}>
            {t('brand_name_short')}
          </span>
        </Link>

        {/* Primary Navigation */}
        <div className="flex items-center space-x-6 text-sm font-medium ml-4 flex-1 overflow-hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-all relative group whitespace-nowrap",
                item.active ? "text-primary font-bold" : "text-foreground/60 hover:text-primary"
              )}
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Language Toggle Icon */}
          <button 
            onClick={toggleLanguage}
            title={locale === 'en' ? 'Switch to Bengali' : 'Switch to English'}
            className="flex items-center justify-center h-10 w-10 text-primary hover:bg-primary/5 transition-colors group"
          >
            <div className="relative">
                <Languages className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span className="absolute -top-1 -right-1 text-[7px] font-black bg-primary text-white px-0.5 rounded-[1px] leading-none">
                    {locale.toUpperCase()}
                </span>
            </div>
          </button>

          <CurrencySwitcher />
          
          {user && <NotificationBell />}
          
          {user ? (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="relative h-10 w-10 overflow-hidden hover:bg-primary/5 transition-all ml-2 outline-none flex items-center justify-center group">
                        {user.profile_picture ? (
                            <div className="h-full w-full border-2 border-primary/10 group-hover:border-primary/30 transition-all">
                                <SecureImage 
                                    key={imageKey}
                                    src={user.profile_picture} 
                                    className="h-full w-full object-cover" 
                                    alt="Profile"
                                    fallback={<UserIcon className="h-5 w-5 text-primary" />}
                                />
                            </div>
                        ) : (
                            <UserIcon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 rounded-none border-2 border-primary p-0 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal p-0">
                        <div className="flex flex-col space-y-1 bg-primary/5 p-4 border-b border-primary/10">
                            <p className="text-sm font-black uppercase tracking-tight text-primary">{user.full_name || "User"}</p>
                            <p className="text-[10px] font-mono leading-none text-muted-foreground">{user.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <div className="p-1">
                        <DropdownMenuItem asChild className="rounded-none focus:bg-primary focus:text-white cursor-pointer py-3">
                            <Link href="/dashboard" className="w-full flex items-center gap-3 font-bold uppercase text-[10px] tracking-normal">
                                <LayoutDashboard className="h-4 w-4" />
                                <span>{t('dashboard_link')}</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-none focus:bg-primary focus:text-white cursor-pointer py-3">
                            <Link href="/profile" className="w-full flex items-center gap-3 font-bold uppercase text-[10px] tracking-normal">
                                <UserCircle className="h-4 w-4" />
                                <span>{t('profile_link')}</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-primary/10 mx-1" />
                        <DropdownMenuItem onClick={logout} className="rounded-none focus:bg-destructive focus:text-white cursor-pointer py-3 text-red-600">
                            <div className="w-full flex items-center gap-3 font-bold uppercase text-[10px] tracking-normal">
                                <LogOut className="h-4 w-4" />
                                <span>{t('logout')}</span>
                            </div>
                        </DropdownMenuItem>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth" className="ml-2">
              <button className="h-9 px-4 bg-primary text-white border-2 border-primary font-black uppercase text-[10px] tracking-normal shadow-[3px_3px_0_0_var(--gonia-accent)] hover:bg-transparent hover:text-primary hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                {t('login')}
              </button>
            </Link>
          )}
        </div>
      </GoniaContainer>
    </nav>
  );
}
