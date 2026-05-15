import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree, Hind_Siliguri } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { AppNotificationProvider } from "@/components/layout/app-notification-provider";
import { MainNav } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Footer } from "@/components/layout/footer";
import { FloatingActions } from "@/components/layout/floating-actions";
import { PasswordGuard } from "@/components/layout/password-guard";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import NextTopLoader from "nextjs-toploader";
import { WhatsAppButton, LiveChatFAB } from "@/ui";
import { CurrencyProvider } from "@/core/currency-context";
import "../globals.css";

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-bengali',
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Balaka Travel Agency",
  description: "Travel agency application",
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${figtree.variable} ${hindSiliguri.variable} h-full overflow-x-hidden`} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-x-hidden font-sans`}
      >
        <NextTopLoader color="var(--gonia-primary)" showSpinner={false} />
        <NextIntlClientProvider messages={messages}>
        <AuthProvider>
          <CurrencyProvider>
            <AppNotificationProvider>
              <PasswordGuard>
                <div className="hidden md:block">
                  <MainNav />
                </div>
                <MobileHeader />
                <main className="min-h-screen pt-16 pb-28 md:pb-0">
                  {children}
                </main>
                <Footer />
                <MobileNav />
                <FloatingActions />
              </PasswordGuard>
            </AppNotificationProvider>
          </CurrencyProvider>
        </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}