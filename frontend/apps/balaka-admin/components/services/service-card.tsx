"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/ui";
import { useRouter } from "next/navigation";
import { Info, CheckCircle2, Pencil, Trash2, Eye, EyeOff, Layout, Package } from "lucide-react";
import { SecureImage } from "../shared/secure-image";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/core/currency-context";
import Link from "next/link";

interface ServiceDefinition {
    id: number;
    name: string;
    slug: string;
    description: string;
    base_price: number;
    image_url?: string | null;
    is_active: boolean;
    is_available: boolean;
    is_public: boolean;
    assigned_staff?: {
        id: number;
        full_name: string;
        profile_picture?: string | null;
    }[];
}

interface ServiceCardProps {
    service: ServiceDefinition;
    onToggleVisibility: (s: any) => void;
    onDelete: (id: number) => void;
}

export function ServiceCard({ service, onToggleVisibility, onDelete }: ServiceCardProps) {
    const router = useRouter();
    const { formatCurrency } = useCurrency();

    return (
        <Card className={cn(
            "flex flex-col h-full rounded-none border-2 transition-all duration-200 group text-left relative overflow-hidden",
            service.is_public ? "border-border bg-card hover:shadow-[4px_4px_0_0_var(--gonia-primary)]" : "border-destructive/20 bg-destructive/5 hover:shadow-[4px_4px_0_0_var(--gonia-destructive)]"
        )}>
            {/* Clickable Overlay for the whole card */}
            <Link 
                href={`/services/${service.id}`}
                className="absolute inset-0 z-10"
                aria-label={`View details for ${service.name}`}
            />
            
            <CardHeader className="border-b border-border/50 bg-muted/10 p-0 overflow-hidden aspect-[16/9] relative">
                <SecureImage 
                    serviceSlug={service.slug}
                    src={service.image_url} 
                    alt={service.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    fallback={
                        <div className="w-full h-full bg-muted/20 flex items-center justify-center text-muted-foreground/50">
                            <Layout className="h-8 w-8" />
                        </div>
                    }
                />
                
                <div className="absolute top-2 right-2 flex gap-1 z-20">
                    {!service.is_public && (
                        <Badge variant="destructive" className="text-[8px] h-4 rounded-none font-black uppercase">Internal</Badge>
                    )}
                    {!service.is_available && (
                        <Badge variant="outline" className="text-[8px] h-4 rounded-none border-destructive/30 bg-white text-destructive uppercase">Hidden</Badge>
                    )}
                </div>

                {/* Staff Avatars overlay */}
                <div className="absolute bottom-2 left-2 flex -space-x-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {service.assigned_staff?.slice(0, 3).map((u, i) => (
                        <div 
                            key={u.id}
                            title={u.full_name}
                            className="w-6 h-6 rounded-none bg-white border border-primary/20 flex items-center justify-center text-[8px] font-black uppercase text-primary overflow-hidden shadow-sm"
                        >
                             {u.profile_picture ? (
                                <img src={`${process.env.NEXT_PUBLIC_API_URL}${u.profile_picture}`} alt="" className="h-full w-full object-cover" />
                            ) : u.full_name.charAt(0)}
                        </div>
                    ))}
                    {(service.assigned_staff?.length || 0) > 3 && (
                        <div className="w-6 h-6 rounded-none bg-primary text-white border border-primary/20 flex items-center justify-center text-[8px] font-black">
                            +{(service.assigned_staff?.length || 0) - 3}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow pt-4 flex flex-col">
                <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="flex flex-col">
                        <CardTitle className="text-sm font-black uppercase tracking-tight group-hover:text-primary transition-colors leading-tight truncate">
                            {service.name}
                        </CardTitle>
                        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-tighter mt-0.5">{service.slug}</span>
                    </div>
                    <Badge className="shrink-0 bg-primary text-white border-none rounded-none px-2 py-0.5 whitespace-nowrap text-[10px] font-mono shadow-none z-20">
                        {service.base_price > 0 ? formatCurrency(service.base_price) : "MODULAR"}
                    </Badge>
                </div>
                <CardDescription className="line-clamp-2 text-[10px] mt-1 flex-grow">
                    {service.description}
                </CardDescription>
                
                <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center z-20">
                    <div className="flex gap-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn("h-7 w-7 p-0 rounded-none transition-all", service.is_available ? "text-emerald-600 hover:bg-emerald-50" : "text-muted-foreground hover:bg-muted")}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleVisibility(service);
                            }}
                            title={service.is_available ? "Hide from Catalog" : "Show in Catalog"}
                        >
                            {service.is_available ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Link href={`/services/${service.id}/edit`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-none hover:bg-primary hover:text-white transition-all">
                                <Pencil className="h-3 w-3" />
                            </Button>
                        </Link>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 w-7 p-0 rounded-none border-destructive/30 text-destructive hover:bg-destructive hover:border-destructive hover:text-white transition-all"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete(service.id);
                            }}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                    
                    <div className="text-[8px] font-black uppercase text-primary/40 group-hover:text-primary transition-colors flex items-center gap-1">
                        Details <Package className="h-2 w-2" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
