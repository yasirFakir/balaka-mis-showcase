import type { Metadata } from "next";
import { Hind_Siliguri, Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { AppNotificationProvider } from "@/components/shared/app-notification-provider";

import NextTopLoader from "nextjs-toploader";
import "./globals.css";

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
  title: "Balaka Admin Panel",
  description: "Administrative interface for Balaka MIS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={hindSiliguri.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <NextTopLoader color="var(--gonia-primary)" showSpinner={false} />
        <AuthProvider>
          <AppNotificationProvider>
            {children}
          </AppNotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}