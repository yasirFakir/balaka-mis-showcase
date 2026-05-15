"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Logo, 
  Button, 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger, 
  gonia, 
  Badge,
  GoniaIcons
} from "@/ui";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/core/api";
import { LogOut, User as UserIcon, Shield, Mail, MapPin, Briefcase, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile Header for Gonia Admin.
 * Features a right-side profile drawer and optional login button.
 */
export function MobileHeader() {
  const { user, logout, imageKey } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <header className="h-16 bg-primary border-b border-primary-foreground/10 flex items-center justify-between px-4 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-white" />
          <span className="text-sm font-black uppercase tracking-tighter text-white">Balaka Admin</span>
        </Link>
        
        <div className="flex items-center gap-3">
          {user ? (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button className="h-9 w-9 bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center group active:scale-95 transition-all">
                  {user.profile_picture ? (
                    <img 
                      src={`${API_URL}${user.profile_picture}?v=${imageKey}`} 
                      className="h-full w-full object-cover" 
                      alt="Avatar" 
                    />
                  ) : (
                    <UserIcon className="h-5 w-5 text-white/60" />
                  )}
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-primary border-l-2 border-white/10 p-0 flex flex-col">
                {/* Drawer Header */}
                <div className="p-6 border-b border-white/10 bg-black/10">
                  <SheetHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="h-20 w-20 bg-white/10 border-2 border-white/20 overflow-hidden flex items-center justify-center">
                        {user.profile_picture ? (
                          <img 
                            src={`${API_URL}${user.profile_picture}?v=${imageKey}`} 
                            className="h-full w-full object-cover" 
                            alt="Avatar" 
                          />
                        ) : (
                          <UserIcon className="h-10 w-10 text-white/20" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <SheetTitle className="text-white font-black uppercase tracking-tight text-lg leading-tight">{user.full_name}</SheetTitle>
                        <p className="text-[10px] text-white/40 font-mono uppercase tracking-tighter">{user.email}</p>
                      </div>
                    </div>
                  </SheetHeader>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Identity Block */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <Shield className="h-3.5 w-3.5 text-white/40" />
                      <span className="text-[9px] font-black uppercase tracking-normal text-white/60">System Privileges</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map(role => (
                        <Badge key={role.id} className="bg-white/10 text-white/80 border-none rounded-none text-[8px] font-black uppercase px-2 py-1">
                          {role.name}
                        </Badge>
                      ))}
                      {user.is_superuser && (
                        <Badge className="bg-white/20 text-white border-none rounded-none text-[8px] font-black uppercase px-2 py-1">Superuser</Badge>
                      )}
                    </div>
                  </div>

                  {/* Operation Block */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <Briefcase className="h-3.5 w-3.5 text-white/40" />
                      <span className="text-[9px] font-black uppercase tracking-normal text-white/60">Deployment</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-white/5 flex items-center justify-center border border-white/10 text-white/40">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-white/30 tracking-tighter leading-none mb-1">Office</span>
                          <span className="text-[11px] font-bold text-white uppercase">{user.work_office || "General Station"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-white/5 flex items-center justify-center border border-white/10 text-white/40">
                          <Settings2 className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-white/30 tracking-tighter leading-none mb-1">Branch</span>
                          <span className="text-[11px] font-bold text-white uppercase">{user.staff_category || "Standard Ops"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-6 border-t border-white/10 bg-black/20">
                  <Button 
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }} 
                    className="w-full h-12 bg-white text-primary font-black uppercase tracking-normal text-[10px] rounded-none shadow-[4px_4px_0_0_var(--gonia-accent)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Terminate Session
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Link href="/auth">
              <Button 
                variant="outline" 
                className="h-9 px-4 rounded-none border-white/20 text-white font-black uppercase tracking-normal text-[10px] hover:bg-white hover:text-primary transition-all"
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>
    </div>
  );
}
