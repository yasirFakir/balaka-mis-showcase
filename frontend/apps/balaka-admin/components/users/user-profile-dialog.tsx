"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, Button, Badge, gonia, Label } from "@/ui";


import { UserCircle, LogOut, Shield, Mail, Calendar, User as UserIcon, Palette, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

import { API_URL } from "@/core/api"

interface UserProfileDialogProps {
  trigger: React.ReactNode
}

export function UserProfileDialog({ trigger }: UserProfileDialogProps) {
  const { user, logout, imageKey } = useAuth()
  const [currentTheme, setCurrentTheme] = React.useState<string>("classic")

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentTheme(localStorage.getItem("gonia_theme_v2") || "classic")
    }
  }, [])

  const handleThemeChange = (theme: string) => {
    localStorage.setItem("gonia_theme_v2", theme)
    window.location.reload() // Reload to re-evaluate the static 'gonia' object
  }

  if (!user) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-none border-2 border-primary bg-white">
        <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-3">
              <UserCircle className="h-6 w-6 text-primary" />
              <DialogTitle className={gonia.text.h2}>Admin Profile</DialogTitle>
          </div>
          <DialogDescription className={gonia.text.caption}>
            Your personal account information and assigned system roles.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-8 space-y-8 bg-[var(--gonia-canvas)]">
          {/* Profile Identity Card */}
          <div className="flex items-center gap-6 py-2">
            <div className="w-20 h-20 rounded-none border-2 border-primary/10 flex items-center justify-center bg-primary/5 overflow-hidden shrink-0">
              {user.profile_picture ? (
                  <img 
                    key={imageKey}
                    src={`${API_URL}${user.profile_picture}?v=${imageKey}`} 
                    className="h-full w-full object-cover" 
                    alt="Avatar" 
                  />
              ) : (
                  <UserIcon className="w-10 h-10 text-primary/20" />
              )}
            </div>
            <div className="flex-1 overflow-hidden space-y-1">
              <h3 className="text-xl font-bold text-primary uppercase tracking-tight truncate">{user.full_name || "Authorized Admin"}</h3>
              <p className={cn(gonia.text.mono, "text-[12px] opacity-40 uppercase truncate")}>{user.email}</p>
            </div>
          </div>

          {/* EXPERIMENTAL: Theme Swicher */}
          <div className="space-y-3 pt-4 border-t border-primary/5">
            <Label className={cn(gonia.text.caption, "text-primary/40 flex items-center gap-2")}>
                <Palette className="h-3 w-3" /> Visual Preferences (Experimental)
            </Label>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => handleThemeChange("classic")}
                    className={cn(
                        "flex items-center justify-center gap-2 p-3 border-2 transition-all font-black uppercase text-[9px]",
                        currentTheme === "classic" ? "border-primary bg-primary text-white shadow-[3px_3px_0_0_var(--gonia-accent)]" : "border-primary/10 bg-white text-primary/40 hover:border-primary/30"
                    )}
                >
                    Standard Gonia
                </button>
                <button 
                    onClick={() => handleThemeChange("candy")}
                    className={cn(
                        "flex items-center justify-center gap-2 p-3 border-2 transition-all font-black uppercase text-[9px]",
                        currentTheme === "candy" ? "border-indigo-600 bg-indigo-600 text-white shadow-[3px_3px_0_0_#ec4899]" : "border-primary/10 bg-white text-primary/40 hover:border-primary/30"
                    )}
                >
                    <Sparkles className="h-3 w-3" /> Candy Mode
                </button>
            </div>
          </div>

          {/* Configuration Data */}
          <div className="space-y-6 pt-4 border-t border-primary/5">
            <div className="space-y-3">
                <Label className={cn(gonia.text.caption, "text-primary/40")}>Assigned Permissions</Label>
                <div className="flex flex-wrap gap-2">
                    {user.is_superuser && (
                        <Badge className={cn(gonia.badge.base, "bg-primary text-white border-primary")}>System Administrator</Badge>
                    )}
                    {(user.is_superuser ? user.roles.filter(r => r.name !== "Admin") : user.roles).map(role => (
                        <Badge key={role.id} className={cn(gonia.badge.base, "bg-[var(--gonia-secondary)] text-white")}>
                            {role.name}
                        </Badge>
                    ))}
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3 py-3 px-4 bg-white border border-primary/10">
                    <Mail className="h-4 w-4 text-primary opacity-40" />
                    <span className="text-sm font-bold text-primary/80 truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 py-3 px-4 bg-white border border-primary/10">
                    <Calendar className="h-4 w-4 text-primary opacity-40" />
                    <span className="text-sm font-bold text-primary/80">Active Session Period: 2026</span>
                </div>
            </div>
          </div>

          <div className="pt-6 border-t border-primary/10">
            <Button 
              onClick={logout} 
              className={cn(gonia.button.base, gonia.button.destructive, "w-full h-12 text-sm")}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out from Account
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

