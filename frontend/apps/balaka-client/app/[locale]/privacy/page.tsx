import { getTranslations } from 'next-intl/server';
import { GoniaPageShell, Card, CardContent } from '@/ui';
import { ShieldCheck, Lock, Eye, FileText, Cookie, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function PrivacyPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
    const { locale } = await params;
    const t = await getTranslations('Privacy');

    return (
      <GoniaPageShell
        title={t('title')}
        subtitle={t('subtitle')}
        icon={<ShieldCheck className="h-8 w-8 text-primary" />}
      >
        <div className="w-full space-y-12 pb-20">
            <section className="max-w-3xl space-y-4">
                <p className="text-xl text-primary leading-relaxed font-bold uppercase tracking-tight">
                    {t('introduction')}
                </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="rounded-none border-2 border-primary/20 bg-white hover:border-primary transition-colors">
                    <CardContent className="p-8 space-y-4">
                        <div className="w-12 h-12 bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                            <Eye className="h-6 w-6" />
                        </div>
                        <h3 className={cn("text-lg font-black uppercase text-primary tracking-tighter", locale === 'bn' && "font-bengali")}>
                            {t('data_collection_title')}
                        </h3>
                        <p className="text-sm text-primary/70 leading-relaxed font-medium">
                            {t('data_collection_desc')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-none border-2 border-primary/20 bg-white hover:border-primary transition-colors">
                    <CardContent className="p-8 space-y-4">
                        <div className="w-12 h-12 bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                            <FileText className="h-6 w-6" />
                        </div>
                        <h3 className={cn("text-lg font-black uppercase text-primary tracking-tighter", locale === 'bn' && "font-bengali")}>
                            {t('data_usage_title')}
                        </h3>
                        <p className="text-sm text-primary/70 leading-relaxed font-medium">
                            {t('data_usage_desc')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-none border-2 border-primary/20 bg-white hover:border-primary transition-colors">
                    <CardContent className="p-8 space-y-4">
                        <div className="w-12 h-12 bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                            <Lock className="h-6 w-6" />
                        </div>
                        <h3 className={cn("text-lg font-black uppercase text-primary tracking-tighter", locale === 'bn' && "font-bengali")}>
                            {t('data_protection_title')}
                        </h3>
                        <p className="text-sm text-primary/70 leading-relaxed font-medium">
                            {t('data_protection_desc')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-none border-2 border-primary/20 bg-white hover:border-primary transition-colors">
                    <CardContent className="p-8 space-y-4">
                        <div className="w-12 h-12 bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                            <RefreshCw className="h-6 w-6" />
                        </div>
                        <h3 className={cn("text-lg font-black uppercase text-primary tracking-tighter", locale === 'bn' && "font-bengali")}>
                            {t('currency_policy_title')}
                        </h3>
                        <p className="text-sm text-primary/70 leading-relaxed font-medium">
                            {t('currency_policy_desc')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-none border-2 border-primary/20 bg-white hover:border-primary transition-colors">
                    <CardContent className="p-8 space-y-4">
                        <div className="w-12 h-12 bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                            <Cookie className="h-6 w-6" />
                        </div>
                        <h3 className={cn("text-lg font-black uppercase text-primary tracking-tighter", locale === 'bn' && "font-bengali")}>
                            {t('cookies_title')}
                        </h3>
                        <p className="text-sm text-primary/70 leading-relaxed font-medium">
                            {t('cookies_desc')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <section className="pt-8 border-t border-primary/5 text-center">
                <p className="text-[10px] font-black uppercase text-primary/40 tracking-widest">
                    Last Updated: January 2026 | Balaka Compliance Office
                </p>
            </section>
        </div>
      </GoniaPageShell>
    );
  }