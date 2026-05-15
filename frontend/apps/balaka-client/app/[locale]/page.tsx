import { getTranslations } from 'next-intl/server';
import { HeroAnimation } from '@/components/shared/hero-animation';
import { HeroTextSlider } from '@/components/shared/hero-text-slider';
import { Button, Card, CardContent } from '@/ui';
import { Link } from '@/i18n/navigation';
import { 
  ArrowRight, 
  CheckCircle2, 
  Globe, 
  ShieldCheck, 
  Clock, 
  Award, 
  Users, 
  Star, 
  PhoneCall, 
  Moon, 
  Zap, 
  Lock, 
  BarChart3 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function Page({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations('Home');

  const sliderTexts = [
    t('slider_1'),
    t('slider_2'),
    t('slider_3'),
    t('slider_4'),
    t('slider_5'),
    t('slider_6'),
    t('slider_7'),
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--gonia-canvas)]">
      {/* Hero Section */}
      <section className="relative w-full h-screen md:h-[calc(100vh-80px)] flex items-center overflow-hidden border-b-2 border-primary/5">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <HeroAnimation />
        </div>

        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
          <div className="w-full mb-8">
            <HeroTextSlider texts={sliderTexts} locale={locale} />
          </div>
          
          <div className="max-w-5xl px-4">
            <p className="text-xs sm:text-base md:text-xl text-muted-foreground/70 max-w-4xl mx-auto leading-relaxed font-medium mb-8">
              {t('description')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/services">
                <Button size="xl" className="group w-full sm:w-auto h-16 px-12 rounded-none text-base font-black uppercase tracking-tight gap-3 shadow-[8px_8px_0_0_var(--gonia-accent)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all bg-primary text-white border-2 border-primary">
                  {t('explore')} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="xl" className="w-full sm:w-auto h-16 px-12 rounded-none text-base font-black uppercase tracking-tight border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all bg-white/50 backdrop-blur-md">
                  {t('contact')}
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-[11px] font-black uppercase text-primary/40 pt-12 border-t border-primary/5 mt-12">
               <div className="flex items-center gap-3 group cursor-default">
                 <CheckCircle2 className="h-5 w-5 text-[var(--gonia-success)] transition-transform group-hover:scale-110" /> 
                 <span className="group-hover:text-primary transition-colors">{t('auth_agent')}</span>
               </div>
               <div className="flex items-center gap-3 group cursor-default">
                 <CheckCircle2 className="h-5 w-5 text-[var(--gonia-success)] transition-transform group-hover:scale-110" /> 
                 <span className="group-hover:text-primary transition-colors">{t('secure_protocol')}</span>
               </div>
               <div className="flex items-center gap-3 group cursor-default">
                 <CheckCircle2 className="h-5 w-5 text-[var(--gonia-success)] transition-transform group-hover:scale-110" /> 
                 <span className="group-hover:text-primary transition-colors">{t('realtime_tracking')}</span>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white relative z-20 border-b-2 border-primary/5">
        <div className="container mx-auto px-4 py-20">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
                {[
                  { label: t('experience_years'), value: "12+", icon: Award },
                  { label: t('visas_processed'), value: "5K+", icon: ShieldCheck },
                  { label: t('success_rate'), value: "98%", icon: Star },
                  { label: t('support_hours'), value: "24/7", icon: PhoneCall }
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center md:items-start space-y-4 group">
                    <div className="h-12 w-1 bg-primary/10 group-hover:bg-primary transition-colors duration-500 hidden md:block" />
                    <div className="text-6xl font-black text-primary tracking-tighter group-hover:translate-x-2 transition-transform duration-300">
                      {stat.value}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] uppercase font-black text-muted-foreground tracking-widest opacity-60">
                      <stat.icon className="h-3.5 w-3.5 text-accent" />
                      {stat.label}
                    </div>
                  </div>
                ))}
            </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-40 relative">
          <div className="absolute top-0 right-0 w-1/4 h-full bg-primary/5 -skew-x-12 pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
              <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-24 space-y-6">
                  <h2 className={cn(
                      "text-5xl md:text-7xl font-black uppercase text-primary leading-none tracking-tighter",
                      locale === 'bn' && "font-bengali leading-tight text-4xl md:text-6xl"
                  )}>
                      {t('features_title')}
                  </h2>
                  <div className="w-24 h-2 bg-accent mb-4" />
                  <p className="text-xl text-muted-foreground font-medium">
                      {t('features_desc')}
                  </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { 
                      title: t('ticket_title'), desc: t('ticket_desc'), icon: Globe, 
                      color: "bg-primary", shadow: "shadow-[4px_4px_0_0_var(--gonia-accent)]", 
                      border: "border-t-accent", href: "/services?tab=tickets" 
                    },
                    { 
                      title: t('visa_title'), desc: t('visa_desc'), icon: ShieldCheck, 
                      color: "bg-secondary", shadow: "shadow-[4px_4px_0_0_var(--gonia-accent)]", 
                      border: "border-t-secondary", href: "/services?tab=ids" 
                    },
                    { 
                      title: t('hajj_title'), desc: t('hajj_desc'), icon: Moon, 
                      color: "bg-accent/20 text-primary", shadow: "shadow-[4px_4px_0_0_var(--gonia-secondary)]", 
                      border: "border-t-accent", href: "/services?tab=hajj" 
                    },
                    { 
                      title: t('cargo_title'), desc: t('cargo_desc'), icon: Clock, 
                      color: "bg-primary/10 text-primary", shadow: "shadow-[4px_4px_0_0_var(--gonia-primary)]", 
                      border: "border-t-primary", href: "/services?tab=cargo" 
                    }
                  ].map((service, i) => (
                    <Link href={service.href} key={i} className="block group">
                      <Card className={cn(
                        "rounded-none border-2 border-primary/10 group-hover:border-primary transition-all duration-500 bg-white shadow-none overflow-hidden h-full flex flex-col cursor-pointer active:scale-[0.98] border-t-4",
                        service.border
                      )}>
                          <CardContent className="p-10 flex flex-col flex-1">
                              <div className={cn(
                                "w-16 h-16 flex items-center justify-center rounded-none transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 mb-10 text-white",
                                service.color,
                                service.shadow
                              )}>
                                  <service.icon className="h-8 w-8" />
                              </div>
                              <h3 className={cn("text-2xl font-black uppercase text-primary mb-6", locale === 'bn' && "font-bengali")}>
                                  {service.title}
                              </h3>
                              <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-10 flex-1">
                                  {service.desc}
                              </p>
                              <div className="pt-6 border-t border-primary/5 flex items-center justify-between text-[11px] font-black uppercase text-primary tracking-widest group-hover:text-accent transition-colors">
                                  <span>{t('apply_now')}</span>
                                  <ArrowRight className="h-4 w-4 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                              </div>
                          </CardContent>
                      </Card>
                    </Link>
                  ))}
              </div>
          </div>
      </section>

      {/* The Balaka Advantage (Why Choose Us) */}
      <section className="bg-primary py-20 md:py-40 relative overflow-hidden text-white">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_30%_50%,rgba(120,185,181,0.2),transparent_50%)]" />
          <div className="absolute top-0 right-0 w-1/2 h-full border-l border-white/5 -skew-x-12 translate-x-32 hidden md:block" />
          
          <div className="container mx-auto px-4 relative z-10">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                  <div className="space-y-10 md:space-y-12 text-center lg:text-left">
                      <div className="space-y-6">
                        <h2 className={cn(
                            "text-4xl md:text-5xl lg:text-7xl font-black uppercase leading-none tracking-tighter",
                            locale === 'bn' && "font-bengali leading-tight"
                        )}>
                            {t('why_us_title')}
                        </h2>
                        <p className="text-lg md:text-xl text-white/60 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                            {t('why_us_desc')}
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 md:gap-8 pt-4">
                          {[
                            { title: t('digital_integrity'), desc: t('digital_integrity_desc'), icon: Lock },
                            { title: t('operational_excellence'), desc: t('operational_excellence_desc'), icon: Zap }
                          ].map((feature, i) => (
                            <div key={i} className="p-6 md:p-8 bg-white/5 border border-white/10 space-y-6 group hover:bg-white/10 transition-colors text-left">
                              <div className="w-12 h-12 flex items-center justify-center border-2 border-accent text-accent">
                                <feature.icon className="h-6 w-6" />
                              </div>
                              <div className="space-y-3">
                                <div className="text-sm font-black uppercase tracking-wider">{feature.title}</div>
                                <p className="text-xs text-white/50 leading-relaxed font-medium">{feature.desc}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                  </div>

                  <div className="relative group p-2 md:p-4">
                      <div className="absolute -inset-2 md:-inset-4 border-2 border-accent/20 translate-x-4 translate-y-4 md:translate-x-8 md:translate-y-8 group-hover:translate-x-2 md:group-hover:translate-x-4 group-hover:translate-y-2 md:group-hover:translate-y-4 transition-all duration-700" />
                      <div className="relative bg-white/5 backdrop-blur-3xl border border-white/10 p-8 md:p-16 space-y-10 md:space-y-12 overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-accent opacity-5 -translate-y-16 translate-x-16 rotate-45" />
                          
                          <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8 text-center sm:text-left">
                            <div className="text-6xl md:text-8xl font-black text-accent drop-shadow-2xl">100%</div>
                            <div className="h-px w-20 sm:h-20 sm:w-px bg-white/10" />
                            <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 leading-loose">
                              Registry<br className="hidden sm:block"/> Transparency<br className="hidden sm:block"/> Standard
                            </div>
                          </div>

                          <div className="space-y-4 md:space-y-6">
                            {[
                              { label: t('expert_team'), icon: Users },
                              { label: t('verified_docs'), icon: ShieldCheck },
                              { label: t('compliance_security'), icon: BarChart3 }
                            ].map((item, i) => (
                              <div key={i} className="flex items-center justify-between group/item py-3 md:py-4 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-3 md:gap-4">
                                  <item.icon className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                                  <span className="text-xs md:text-sm font-black uppercase tracking-widest">{item.label}</span>
                                </div>
                                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-accent opacity-20 group-hover/item:opacity-100 transition-opacity" />
                              </div>
                            ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 bg-white">
          <div className="container mx-auto px-4 text-center">
              <div className="max-w-4xl mx-auto space-y-12">
                  <h2 className={cn(
                      "text-5xl md:text-8xl font-black uppercase text-primary leading-none tracking-tighter",
                      locale === 'bn' && "font-bengali leading-tight text-4xl md:text-7xl"
                  )}>
                      {t('trust_title')}
                  </h2>
                  <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
                      {t('trust_desc')}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-10">
                      <Link href="/auth">
                          <Button size="xl" className="h-20 px-16 rounded-none uppercase font-black text-base bg-primary text-white shadow-[10px_10px_0_0_var(--gonia-accent)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all border-2 border-primary active:scale-95">
                              {t('get_started')}
                          </Button>
                      </Link>
                      <Link href="/contact">
                          <div className="flex items-center gap-6 text-primary font-black uppercase text-sm cursor-pointer group px-8 py-4 border-2 border-transparent hover:border-primary/10 transition-all">
                              <div className="w-14 h-14 rounded-none border-2 border-primary flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-white group-hover:rotate-12">
                                  <PhoneCall className="h-6 w-6" />
                              </div>
                              <span className="tracking-widest">{t('speak_agent')}</span>
                          </div>
                      </Link>
                  </div>
              </div>
          </div>
      </section>
    </div>
  );
}
