"use client";

import { useState, useEffect } from "react";
import { ServiceCard } from "@/components/services/service-card";
import { fetchClient } from "@/core/api";
import { useNotifications, Tabs, TabsContent, TabsList, TabsTrigger, GoniaPageShell, LoadingSpinner } from "@/ui";
import { useTranslations } from "next-intl";
import { Plane, Package, MoonStar, Grid, LayoutGrid, Briefcase } from "lucide-react";


interface ServiceDefinition {
    id: number;
    name: string;
    slug: string;
    category?: string;
    tags?: string[];
    description: string;
    base_price: number;
    image_url?: string;
}

export default function ServicesCatalogPage() {
  const t = useTranslations('Services');
  const { toast } = useNotifications();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
        try {
            const response = await fetchClient<any>("/api/v1/services/");
            // Handle both flat array and enveloped response { items, total }
            const data = Array.isArray(response) ? response : (response.items || []);
            // Sort alphabetically by name
            const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));
            setServices(sortedData);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load services");
        } finally {
            setLoading(false);
        }
    }
    loadServices();
  }, []);

  const getCategory = (s: ServiceDefinition) => {
      const cat = s.category?.toLowerCase() || "";
      const name = s.name.toLowerCase();
      const tags = (s.tags || []).map(t => t.toLowerCase());
      
      if (tags.includes("ticket service") || cat.includes("ticket") || name.includes("ticket") || name.includes("flight") || name.includes("air")) return "ticket";
      if (tags.includes("cargo service") || cat.includes("cargo") || name.includes("cargo") || name.includes("freight") || name.includes("shipping")) return "cargo";
      if (tags.includes("hajj & umrah") || cat.includes("hajj") || cat.includes("umrah") || name.includes("hajj") || name.includes("umrah") || name.includes("pilgrimage")) return "hajj";
      
      // Treat Passport/Visa/IDs as "General Service"
      if (tags.includes("passport & visa") || cat.includes("passport") || cat.includes("visa") || name.includes("passport") || name.includes("visa") || name.includes("license") || name.includes("jawazat") || tags.includes("documents") || name.includes("document") || name.includes("malumat")) return "passport";
      
      return "general";
  };

  const categories = {
      ticket: services.filter(s => getCategory(s) === "ticket"),
      cargo: services.filter(s => getCategory(s) === "cargo"),
      hajj: services.filter(s => getCategory(s) === "hajj"),
      passport: services.filter(s => getCategory(s) === "passport" || getCategory(s) === "general"),
  };

  return (
      <GoniaPageShell
        title={t('title')}
        subtitle={t('subtitle')}
        icon={<Briefcase className="h-8 w-8" />}
      >
        {loading ? (
            <LoadingSpinner size="lg" className="py-10" />
        ) : services.length === 0 ? (
             <div className="text-muted-foreground p-12 border-2 border-dashed text-center font-bold uppercase tracking-normal opacity-40">{t('no_services')}</div>
        ) : (
            <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-8 items-center">
                    <TabsTrigger value="all">
                        <Grid className="w-4 h-4" /> {t('tabs_all')}
                    </TabsTrigger>
                    <TabsTrigger value="ticket">
                        <Plane className="w-4 h-4" /> {t('tabs_tickets')}
                    </TabsTrigger>
                    <TabsTrigger value="cargo">
                        <Package className="w-4 h-4" /> {t('tabs_cargo')}
                    </TabsTrigger>
                    <TabsTrigger value="hajj">
                        <MoonStar className="w-4 h-4" /> {t('tabs_hajj')}
                    </TabsTrigger>
                    <TabsTrigger value="passport">
                        <LayoutGrid className="w-4 h-4" /> {t('tabs_ids')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0 outline-none">
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {services.map(service => (
                            <ServiceCard key={service.id} service={service} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="ticket" className="mt-0 outline-none">
                    {categories.ticket.length > 0 ? (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {categories.ticket.map(service => (
                                <ServiceCard key={service.id} service={service} />
                            ))}
                        </div>
                    ) : <div className="text-muted-foreground p-12 text-center border-2 border-dashed uppercase font-bold tracking-normal opacity-40">{t('no_tickets')}</div>}
                </TabsContent>

                <TabsContent value="cargo" className="mt-0 outline-none">
                    {categories.cargo.length > 0 ? (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {categories.cargo.map(service => (
                                <ServiceCard key={service.id} service={service} />
                            ))}
                        </div>
                    ) : <div className="text-muted-foreground p-12 text-center border-2 border-dashed uppercase font-bold tracking-normal opacity-40">{t('no_cargo')}</div>}
                </TabsContent>

                <TabsContent value="hajj" className="mt-0 outline-none">
                    {categories.hajj.length > 0 ? (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {categories.hajj.map(service => (
                                <ServiceCard key={service.id} service={service} />
                            ))}
                        </div>
                    ) : <div className="text-muted-foreground p-12 text-center border-2 border-dashed uppercase font-bold tracking-normal opacity-40">{t('no_hajj')}</div>}
                </TabsContent>

                <TabsContent value="passport" className="mt-0 outline-none">
                    {categories.passport.length > 0 ? (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {categories.passport.map(service => (
                                <ServiceCard key={service.id} service={service} />
                            ))}
                        </div>
                    ) : <div className="text-muted-foreground p-12 text-center border-2 border-dashed uppercase font-bold tracking-normal opacity-40">{t('no_passport')}</div>}
                </TabsContent>
            </Tabs>
        )}
      </GoniaPageShell>
  );
}