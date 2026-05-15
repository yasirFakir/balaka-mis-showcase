"use client";

import { ProtectedRoute } from "@/components/layout/protected-route";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, GoniaPageShell } from "@/ui";

import { RequestList } from "@/components/requests/request-list";

import { Link } from "@/i18n/navigation";
import { Plus, LayoutDashboard, User, Mail, ShieldCheck } from "lucide-react";
import { SecureImage } from "@/components/shared/secure-image";
import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const { user, imageKey } = useAuth();
  const t = useTranslations('Dashboard');

  return (
    <ProtectedRoute>
      <GoniaPageShell
        title={t('title')}
        subtitle={t('welcome_back', { name: user?.full_name || 'Valued Client' })}
        icon={<LayoutDashboard className="h-8 w-8" />}
        actions={
          <Link href="/services" className="w-full md:w-auto">
            <Button className="w-full gap-2 h-12 md:h-10">
              <Plus className="h-4 w-4" /> {t('new_application')}
            </Button>
          </Link>
        }
      >
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3">
             {/* Profile Card */}
             <Card className="lg:col-span-1 h-fit rounded-none border-2">
                <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">{t('profile_identity')}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="relative">
                            <div className="h-24 w-24 rounded-none border-4 border-primary/10 overflow-hidden bg-muted flex items-center justify-center">
                                {user?.profile_picture ? (
                                    <SecureImage 
                                        key={imageKey}
                                        src={user.profile_picture} 
                                        alt="Profile" 
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <User className="h-12 w-12 text-primary/20" />
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 shadow-[2px_2px_0_0_var(--gonia-accent)]">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight text-primary">{user?.full_name}</h2>
                            <p className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">{t('premium_member')}</p>
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-primary/5 pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-primary/5 flex items-center justify-center text-primary shrink-0">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div className="overflow-hidden">
                                <span className="text-[9px] font-black uppercase tracking-normal text-muted-foreground block">{t('registered_email')}</span>
                                <span className="font-bold text-primary text-sm truncate block">{user?.email}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-primary/5 flex items-center justify-center text-primary shrink-0">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-normal text-muted-foreground block">{t('account_status')}</span>
                                <div className="flex gap-2 mt-0.5">
                                    <Badge variant={user?.is_active ? "success" : "destructive"} className="rounded-none font-black text-[9px] px-2 h-5">
                                        {user?.is_active ? t('verified') : t('inactive')}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Link href="/profile" className="block">
                        <Button variant="outline" className="w-full h-10 text-[10px]">
                            {t('manage_profile')}
                        </Button>
                    </Link>
                </CardContent>
            </Card>
            
            {/* Request List */}
            <div className="lg:col-span-2">
                <RequestList />
            </div>
        </div>
      </GoniaPageShell>
    </ProtectedRoute>
  );
}