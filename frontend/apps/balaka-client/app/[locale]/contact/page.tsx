"use client";

import { useTranslations, useLocale } from 'next-intl';
import { GoniaPageShell, GoniaCard, GoniaIcons, WhatsAppButton, Button } from "@/ui";
import { Mail, Phone, MapPin, Facebook, ExternalLink, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ContactPage() {
    const t = useTranslations('Contact');
    const locale = useLocale();

    const openLiveChat = () => {
        // Toggle the live chat FAB if possible or just trigger it
        const fab = document.querySelector('[data-gonia-fab="true"]') as HTMLButtonElement;
        if (fab) fab.click();
    };

    return (
      <GoniaPageShell
        title={t('title')}
        subtitle={t('subtitle')}
        icon={<Phone className="h-8 w-8" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left: Contact Info */}
            <div className="lg:col-span-7 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GoniaCard className="p-6 space-y-4 border-2 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary">
                            <Mail className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-black uppercase text-[10px] tracking-normal opacity-40">{t('email_us')}</h3>
                            <p className="font-bold text-primary text-xs break-words">{t('email_address')}</p>
                        </div>
                    </GoniaCard>

                    <GoniaCard className="p-6 space-y-4 border-2 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary">
                            <Phone className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-black uppercase text-[10px] tracking-normal opacity-40">{t('call_support')}</h3>
                            <p className="font-bold text-primary text-sm">+966 53 990 0660</p>
                        </div>
                    </GoniaCard>

                    <GoniaCard className="p-6 space-y-4 border-2 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary">
                            <MessageCircle className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-black uppercase text-[10px] tracking-normal opacity-40">{t('live_chat')}</h3>
                            <Button 
                                variant="link" 
                                className="h-auto p-0 font-bold text-primary text-sm uppercase underline"
                                onClick={openLiveChat}
                            >
                                {t('chat_with_us')}
                            </Button>
                        </div>
                    </GoniaCard>
                </div>

                {/* Social Media Section */}
                <GoniaCard className="p-8 border-2 border-blue-600/20 bg-blue-50/30">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 flex items-center justify-center text-white">
                                <Facebook className="h-6 w-6 fill-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-blue-900">{t('social_media')}</h3>
                                <p className="text-xs font-bold text-blue-700/60 uppercase">{t('facebook_label')}</p>
                            </div>
                        </div>
                        <a 
                            href="https://www.facebook.com/BalakaTravel01" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full md:w-auto h-12 px-8 bg-blue-600 text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-[4px_4px_0_0_#1e3a8a] active:translate-x-1 active:translate-y-1 active:shadow-none"
                        >
                            Visit Facebook <ExternalLink className="h-4 w-4" />
                        </a>
                    </div>
                </GoniaCard>

                {/* Global Offices */}
                <GoniaCard className="p-8 border-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <MapPin className="h-24 w-24" />
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-xl font-black uppercase tracking-tight text-primary">{t('global_offices')}</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Riyadh */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h4 className="font-black uppercase text-[10px] tracking-normal text-secondary">{t('riyadh_office')}</h4>
                                    <p className={cn("text-sm font-bold leading-relaxed", locale === 'bn' && "font-bengali")}>
                                        {t('riyadh_address')}
                                    </p>
                                </div>
                                <div className="space-y-1 pt-2 border-t border-primary/5">
                                    <p className="text-[10px] font-black text-primary/40 uppercase">Direct Contact</p>
                                    <p className="text-sm font-mono font-bold text-primary">051-1474-705</p>
                                    <p className="text-sm font-mono font-bold text-primary">053-9900-660</p>
                                </div>
                            </div>

                            {/* Jeddah */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h4 className="font-black uppercase text-[10px] tracking-normal text-secondary">{t('jeddah_office')}</h4>
                                    <p className={cn("text-sm font-bold leading-relaxed", locale === 'bn' && "font-bengali")}>
                                        {t('jeddah_address')}
                                    </p>
                                </div>
                                <div className="space-y-1 pt-2 border-t border-primary/5">
                                    <p className="text-[10px] font-black text-primary/40 uppercase">Direct Contact</p>
                                    <p className="text-sm font-mono font-bold text-primary">053-9900-661</p>
                                </div>
                            </div>

                            {/* Dhaka */}
                            <div className="space-y-4 md:col-span-2">
                                <div className="space-y-1">
                                    <h4 className="font-black uppercase text-[10px] tracking-normal text-secondary">{t('dhaka_office')}</h4>
                                    <p className={cn("text-sm font-bold leading-relaxed", locale === 'bn' && "font-bengali")}>
                                        {t('dhaka_address')}
                                    </p>
                                </div>
                                <div className="space-y-1 pt-2 border-t border-primary/5">
                                    <p className="text-[10px] font-black text-primary/40 uppercase">Direct Contact</p>
                                    <p className="text-sm font-mono font-bold text-primary">01831831111</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </GoniaCard>
            </div>

            {/* Right: WhatsApp Integration */}
            <div className="lg:col-span-5">
                <GoniaCard className="rounded-none border-2 border-[var(--gonia-success)] shadow-[8px_8px_0_0_var(--gonia-primary)] overflow-hidden sticky top-24">
                    <div className="bg-[var(--gonia-success)] p-8 text-white">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-white/20 p-3">
                                <GoniaIcons.WhatsApp className="h-8 w-8 fill-white stroke-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">{t('direct_whatsapp')}</h3>
                                <p className="text-xs font-bold uppercase tracking-normal opacity-80">{t('instant_response')}</p>
                            </div>
                        </div>
                        <p className="text-sm font-medium leading-relaxed">
                            Skip the queue! Connect directly with our certified agents for visa consultations and cargo tracking.
                        </p>
                    </div>
                    <div className="p-8 bg-white space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-[var(--gonia-success)]">
                                <div className="h-2 w-2 rounded-full bg-[var(--gonia-success)] animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-normal">{t('live_agent')}</span>
                            </div>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3 text-sm font-medium text-muted-foreground">
                                    <GoniaIcons.Success className="h-4 w-4 mt-0.5 text-[var(--gonia-success)]" />
                                    <span>Instant PNR & Status Updates</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm font-medium text-muted-foreground">
                                    <GoniaIcons.Success className="h-4 w-4 mt-0.5 text-[var(--gonia-success)]" />
                                    <span>Direct Document Submission</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm font-medium text-muted-foreground">
                                    <GoniaIcons.Success className="h-4 w-4 mt-0.5 text-[var(--gonia-success)]" />
                                    <span>24/7 Multi-lingual Support</span>
                                </li>
                            </ul>
                        </div>
                        <WhatsAppButton 
                            label="Start Chatting with Agent" 
                            size="lg" 
                            className="w-full h-14 text-xs shadow-[4px_4px_0_0_var(--gonia-primary)]"
                        />
                    </div>
                </GoniaCard>
            </div>
        </div>
      </GoniaPageShell>
    );
}