"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/ui";

import { useRouter } from "@/i18n/navigation"; // Use localized router

import { useAuth } from "@/lib/auth-context";
import { useTranslations, useLocale } from 'next-intl';

import { Info, CheckCircle2 } from "lucide-react";
import { SecureImage } from "../shared/secure-image";

interface ServiceDefinition {
    id: number;
    name: string;
    slug: string;
    description: string;
    base_price: number;
    image_url?: string;
    name_bn?: string;
    description_bn?: string;
}

interface ServiceCardProps {
    service: ServiceDefinition;
}

export function ServiceCard({ service }: ServiceCardProps) {
    const { user } = useAuth();
    const router = useRouter();
    const t = useTranslations('Services');
    const locale = useLocale();

    const handleApply = () => {
        if (user) {
            router.push(`/services/${service.slug}`);
        } else {
            // Redirect to login with return URL
            router.push(`/auth?returnUrl=/services/${service.slug}`);
        }
    };

    const displayName = locale === 'bn' && service.name_bn ? service.name_bn : service.name;
    const displayDesc = locale === 'bn' && service.description_bn ? service.description_bn : service.description;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Card className="flex flex-col h-full cursor-pointer rounded-none border-2 border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-[4px_4px_0_0_var(--gonia-primary)] group text-left">
                    <CardHeader className="border-b border-border/50 bg-muted/10 p-0 overflow-hidden aspect-[16/9]">
                        <SecureImage 
                            src={service.image_url} 
                            serviceSlug={service.slug}
                            alt={displayName} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            fallback={
                                <div className="w-full h-full bg-muted/20 flex items-center justify-center text-muted-foreground/50">
                                    <Info className="h-8 w-8" />
                                </div>
                            }
                        />
                    </CardHeader>
                    <CardContent className="flex-grow pt-4">
                        <div className="flex justify-between items-start gap-3 mb-2">
                            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors leading-tight">{displayName}</CardTitle>
                            <Badge className="shrink-0 bg-[var(--gonia-primary)] text-white border-none rounded-none px-2 py-0.5 whitespace-nowrap text-xs font-mono shadow-none">
                                {service.base_price > 0 ? `SR ${service.base_price}` : t('quote')}
                            </Badge>
                        </div>
                        <CardDescription className="line-clamp-3 text-xs mt-1">
                            {displayDesc}
                        </CardDescription>
                    </CardContent>
                </Card>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[600px] rounded-none border-primary/20">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-primary">{displayName}</DialogTitle>
                    <DialogDescription>
                        {t('details_title')}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">
                    <div className="p-4 bg-muted/30 rounded-none border-l-4 border-primary">
                        <p className="text-sm leading-relaxed">
                            {displayDesc}
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="font-bold text-sm uppercase tracking-normal flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-[var(--gonia-success)]" /> {t('included_title')}
                            </h4>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                                <li>{t('included_processing')}</li>
                                <li>{t('included_verification')}</li>
                                <li>{t('included_tracking')}</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold text-sm uppercase tracking-normal">{t('pricing_title')}</h4>
                            <div className="text-2xl font-mono font-bold text-primary">
                                {service.base_price > 0 ? `SR ${service.base_price}` : t('request_quote')}
                                {service.base_price > 0 && <span className="text-xs font-sans font-normal text-muted-foreground ml-1">{t('starting_price')}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button onClick={handleApply} className="w-full rounded-none font-bold tracking-normal" size="lg">{t('apply_now')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
