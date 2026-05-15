"use client";

import { usePathname } from "next/navigation";
import { WhatsAppButton, LiveChatFAB } from "@/ui";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function FloatingActions() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Check if it's the home page.
  // In next-intl, the home page might be just "/" or "/en", "/bn" etc.
  const isHomePage = pathname === "/" || pathname === "/en" || pathname === "/bn";

  // Aligns to the screen border
  const responsiveRight = "!right-4 md:!right-6";

  const isSupportChat = pathname.includes("/support/");

  if (isSupportChat) return null;

  return (
    <>
      <LiveChatFAB 
        className={cn(
          responsiveRight,
          isMobile && "scale-75 origin-bottom-right !bottom-[130px]"
        )} 
      />
      <WhatsAppButton 
        variant="fab" 
        className={cn(
          responsiveRight,
          isMobile && "scale-75 origin-bottom-right !bottom-20"
        )} 
      />
    </>
  );
}
