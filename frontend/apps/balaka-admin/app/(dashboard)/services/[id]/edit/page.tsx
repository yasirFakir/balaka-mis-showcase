"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    useNotifications, 
    Button, 
    Card, 
    CardContent, 
    CardHeader,
    CardTitle,
    CardDescription,
    Input, 
    Badge, 
    Label, 
    Textarea, 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger, 
    LoadingSpinner,
    Separator,
    GoniaCurrencyInput,
    GoniaPageShell
} from "@/ui";
import { fetchClient } from "@/core/api";

import { 
    ArrowLeft, 
    Save, 
    RefreshCw,
    Package,
    Info,
    Calculator,
    ShieldCheck,
    Mail,
    Phone,
    Image as ImageIcon,
    Layout,
    Search,
    UserPlus,
    CheckCircle2,
    Users as UsersIcon,
    X,
    UserCheck,
    Briefcase
} from "lucide-react";

import { ServiceVariantEditor, ServiceVariant } from "@/components/services/service-variant-editor";
import { FormBuilder } from "@/components/services/form-builder";
import { FinancialSchemaBuilder } from "@/components/services/financial-schema-builder";
import { FinancialItem } from "@/components/finance/financial-breakdown-editor";
import { SecureImage } from "@/components/shared/secure-image";
import { CurrencySwitcher } from "@/components/shared/currency-switcher";
import { User } from "@/core/types";
import { useCurrency } from "@/core/currency-context";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ServiceDefinition {
  id: number;
  name: string;
  slug: string;
  category?: string;
  tags?: string[];
  description: string;
  image_url?: string | null;
  base_price: number;
  is_active: boolean;
  is_public: boolean;
  variants: ServiceVariant[];
  form_schema: any;
  financial_schema: FinancialItem[];
  assigned_staff?: User[];
}

const SERVICE_TAGS = [
    "Ticket Service",
    "Cargo Service",
    "Hajj & Umrah",
    "Passport & Visa",
    "Documents",
    "General Service"
];

export default function ServiceEditorPage() {
    const { toast } = useNotifications();
    const { currency, formatCurrency, convertToBDT } = useCurrency();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const [service, setService] = useState<ServiceDefinition | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [vendors, setVendors] = useState<any[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState("overview");
    
    const [allStaff, setAllStaff] = useState<User[]>([]);
    const [assignedStaffIds, setAssignedStaffIds] = useState<number[]>([]);
    const [staffSearch, setStaffSearch] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                const [svcData, vData, sData] = await Promise.all([
                    fetchClient<ServiceDefinition>(`/api/v1/services/${id}`),
                    fetchClient<any>("/api/v1/vendors/"),
                    fetchClient<{ items: User[] }>("/api/v1/users/staff-directory")
                ]);
                
                setService(svcData);
                setVendors(Array.isArray(vData) ? vData : (vData.items || []));
                setAllStaff(sData.items || []);
                setAssignedStaffIds((svcData.assigned_staff || []).map(u => u.id));
                
                if (svcData.variants && svcData.variants.length > 0) {
                    setSelectedVariantId(svcData.variants[0].id ?? null);
                }
            } catch (error) {
                toast.error("Failed to load editor data");
                router.push("/services");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, router]);

    const toggleTag = (tag: string) => {
        if (!service) return;
        const currentTags = service.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        setService({ ...service, tags: newTags });
    };

    const toggleStaff = (staffId: number) => {
        setAssignedStaffIds(prev => 
            prev.includes(staffId) 
                ? prev.filter(id => id !== staffId)
                : [...prev, staffId]
        );
    };

    const handleSave = async () => {
        if (!service) return;

        setSaving(true);
        try {
            const updatedService = await fetchClient<ServiceDefinition>(`/api/v1/services/${id}`, {
                method: "PUT",
                body: JSON.stringify({
                    name: service.name,
                    slug: service.slug,
                    category: service.category || (service.tags && service.tags[0]) || "General Service",
                    tags: service.tags,
                    description: service.description,
                    image_url: service.image_url,
                    base_price: service.base_price,
                    is_active: service.is_active,
                    is_public: service.is_public,
                    variants: service.variants,
                    form_schema: service.form_schema,
                    financial_schema: service.financial_schema,
                    assigned_staff_ids: assignedStaffIds
                }),
            });
            setService(updatedService);
            toast.success("Configuration updated successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to update service");
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !service) return;

        // 1. Immediate local preview to bypass Next.js public refresh lag
        const localUrl = URL.createObjectURL(file);
        setService(prev => prev ? { ...prev, image_url: localUrl } : null);

        const toastId = toast.loading("Uploading thumbnail...");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("service_name", service.name);
        formData.append("service_id", service.id.toString());
        formData.append("field_name", "cover");

        try {
            const token = localStorage.getItem("token");
            
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/files/upload?service_name=${service.name}&service_id=${service.id}&field_name=cover&service_slug=${service.slug}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            // 2. Update with server URL (with timestamp) for the final "Apply Changes" commit
            setService(prev => prev ? { ...prev, image_url: data.url } : null);
            toast.success("Image updated", { id: toastId });
        } catch (error: any) {
            toast.error("Upload failed", { id: toastId });
        }
    };

    const filteredAvailableStaff = useMemo(() => {
        return allStaff.filter(s => 
            !assignedStaffIds.includes(s.id) &&
            (s.full_name.toLowerCase().includes(staffSearch.toLowerCase()) || 
             s.email.toLowerCase().includes(staffSearch.toLowerCase()))
        );
    }, [allStaff, assignedStaffIds, staffSearch]);

    const assignedStaffObjects = useMemo(() => {
        return allStaff.filter(s => assignedStaffIds.includes(s.id));
    }, [allStaff, assignedStaffIds]);

    if (loading) return <LoadingSpinner size="lg" className="py-10" full />;
    if (!service) return null;

    return (
        <GoniaPageShell
            title={`Edit: ${service.name}`}
            subtitle="Configure logic // Set pricing // Assign personnel"
            icon={<Package className="h-8 w-8" />}
            actions={
                <div className="flex items-center gap-3">
                    <CurrencySwitcher />
                    <Button variant="outline" onClick={() => router.push(`/services/${id}`)} className="h-10 rounded-none border-primary/20 text-primary font-black uppercase text-[10px]">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="h-10 px-8 rounded-none font-black uppercase text-[10px] shadow-[4px_4px_0_0_var(--gonia-accent)]">
                        {saving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Apply Changes
                    </Button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className={cn(
                    (activeTab === "overview" || activeTab === "finance") ? "lg:col-span-8" : "lg:col-span-12"
                )}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="mb-8 bg-muted/20 border-2 border-primary/10 p-1">
                            <TabsTrigger value="overview" className="gap-2">Overview</TabsTrigger>
                            <TabsTrigger value="staff" className="gap-2">Access Control</TabsTrigger>
                            <TabsTrigger value="variants" className="gap-2">Products</TabsTrigger>
                            <TabsTrigger value="finance" className="gap-2">Finance</TabsTrigger>
                            <TabsTrigger value="form" className="gap-2">Form Builder</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6 outline-none">
                            <Card className="rounded-none border-2 border-primary shadow-none overflow-hidden">
                                <CardContent className="p-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        <div className="lg:col-span-4 space-y-6">
                                            <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground flex items-center gap-2">
                                                <ImageIcon className="h-3 w-3" /> Service Thumbnail
                                            </Label>
                                            <div className="relative group w-full aspect-[4/3]">
                                                <div className="w-full h-full relative border-2 border-primary/20 overflow-hidden group">
                                                    <SecureImage 
                                                        serviceSlug={service.slug}
                                                        src={service.image_url} 
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                        alt="Service Thumbnail"
                                                        fallback={
                                                            <div className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-primary/30 bg-muted/5">
                                                                <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                                                                <p className="text-[11px] font-black uppercase tracking-wide text-primary">No Image</p>
                                                            </div>
                                                        }
                                                    />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                                        <label className="cursor-pointer">
                                                            <div className="h-10 px-4 flex items-center gap-2 rounded-none bg-white text-primary font-black text-[10px] uppercase">
                                                                <RefreshCw className="h-3.5 w-3.5" /> Replace
                                                            </div>
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                                        </label>

                                                        {service.image_url && (
                                                            <Button 
                                                                variant="destructive" 
                                                                onClick={() => setService(prev => prev ? { ...prev, image_url: null } : null)}
                                                                className="h-10 px-4 rounded-none font-black text-[10px] uppercase bg-red-600 hover:bg-red-700"
                                                            >
                                                                <X className="h-3.5 w-3.5 mr-2" /> Remove
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="lg:col-span-8 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-normal">Service Name</Label>
                                                    <Input value={service.name} onChange={(e) => setService({ ...service, name: e.target.value })} className="h-12 rounded-none font-bold text-lg border-2" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-normal">Slug (Permanent)</Label>
                                                    <Input value={service.slug} readOnly className="h-12 rounded-none bg-muted/5 font-mono text-[11px] cursor-not-allowed border-dashed" />
                                                </div>
                                            </div>

                                            <div className="space-y-2.5">
                                                <Label className="text-[10px] font-black uppercase tracking-normal">Market Classification (Tags)</Label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border border-border bg-muted/5">
                                                    {SERVICE_TAGS.map(tag => (
                                                        <label key={tag} className="flex items-center gap-2 cursor-pointer group">
                                                            <input 
                                                                type="checkbox"
                                                                checked={service.tags?.includes(tag) || false} 
                                                                onChange={() => toggleTag(tag)} 
                                                                className="h-4 w-4 rounded-none border-2 border-primary text-primary focus:ring-primary"
                                                            />
                                                            <span className="text-[10px] font-black uppercase group-hover:text-primary transition-colors">{tag}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2 flex-1 flex flex-col">
                                                <Label className="text-[10px] font-black uppercase tracking-normal">Public Description</Label>
                                                <Textarea value={service.description} onChange={(e) => setService({ ...service, description: e.target.value })} className="flex-1 min-h-[120px] rounded-none p-4 text-sm border-2" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="staff" className="space-y-8 outline-none">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Assigned Column */}
                                <Card className="rounded-none border-2 border-emerald-600/20 shadow-none flex flex-col">
                                    <CardHeader className="bg-emerald-600/5 border-b-2 border-emerald-600/10 py-4">
                                        <CardTitle className="text-xs font-black uppercase tracking-tight text-emerald-800 flex items-center justify-between">
                                            <span className="flex items-center gap-2"><UserCheck className="h-4 w-4" /> Authorized Personnel</span>
                                            <Badge className="bg-emerald-600 rounded-none text-[9px] h-5">{assignedStaffIds.length}</Badge>
                                        </CardTitle>
                                        <CardDescription className="text-[9px] uppercase font-bold text-emerald-700/60">Currently assigned to this service</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0 flex-grow min-h-[400px]">
                                        {assignedStaffObjects.length === 0 ? (
                                            <div className="p-12 text-center text-muted-foreground/40 italic uppercase font-black text-[10px]">
                                                No staff members assigned yet
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-emerald-600/5">
                                                {assignedStaffObjects.map(user => (
                                                    <div key={user.id} className="p-4 flex items-center gap-4 group bg-emerald-50/30">
                                                        <div className="h-10 w-10 bg-emerald-600 text-white flex items-center justify-center font-black border border-emerald-700/20 overflow-hidden shrink-0">
                                                            {user.profile_picture ? (
                                                                <img src={`${process.env.NEXT_PUBLIC_API_URL}${user.profile_picture}`} className="h-full w-full object-cover" alt="" />
                                                            ) : user.full_name.charAt(0)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-black text-xs uppercase tracking-tight text-emerald-900">{user.full_name}</p>
                                                            <p className="text-[9px] font-bold text-emerald-700/60 uppercase truncate">{user.email}</p>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => toggleStaff(user.id)}
                                                            className="h-8 w-8 rounded-none text-emerald-700 hover:bg-emerald-100"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Directory Column */}
                                <Card className="rounded-none border-2 border-primary/10 shadow-none flex flex-col">
                                    <CardHeader className="bg-primary/5 border-b-2 border-primary/10 py-4">
                                        <CardTitle className="text-xs font-black uppercase tracking-tight text-primary flex items-center justify-between">
                                            <span className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Staff Directory</span>
                                            <Badge variant="outline" className="border-primary/20 rounded-none text-[9px] h-5 text-primary">{filteredAvailableStaff.length}</Badge>
                                        </CardTitle>
                                        <div className="mt-4 relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input 
                                                placeholder="Search by name or email..." 
                                                value={staffSearch}
                                                onChange={(e) => setStaffSearch(e.target.value)}
                                                className="pl-9 h-10 rounded-none border-2 border-primary/10 focus:border-primary text-xs"
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0 flex-grow max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {filteredAvailableStaff.length === 0 ? (
                                            <div className="p-12 text-center text-muted-foreground/40 italic uppercase font-black text-[10px]">
                                                {staffSearch ? "No matching staff members" : "All staff members are assigned"}
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-primary/5">
                                                {filteredAvailableStaff.map(user => (
                                                    <div 
                                                        key={user.id} 
                                                        className="p-4 flex items-center gap-4 hover:bg-primary/5 transition-colors group cursor-pointer"
                                                        onClick={() => toggleStaff(user.id)}
                                                    >
                                                        <div className="h-10 w-10 bg-primary/5 text-primary flex items-center justify-center font-black border border-primary/10 overflow-hidden shrink-0 group-hover:border-primary/30">
                                                            {user.profile_picture ? (
                                                                <img src={`${process.env.NEXT_PUBLIC_API_URL}${user.profile_picture}`} className="h-full w-full object-cover" alt="" />
                                                            ) : user.full_name.charAt(0)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-black text-xs uppercase tracking-tight text-primary">{user.full_name}</p>
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase truncate">{user.email}</p>
                                                        </div>
                                                        <UserPlus className="h-4 w-4 text-primary/30 group-hover:text-primary transition-colors" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="variants" className="outline-none">
                            <ServiceVariantEditor variants={service.variants || []} onChange={(newVariants) => setService({ ...service, variants: newVariants })} />
                        </TabsContent>

                        <TabsContent value="finance" className="outline-none">
                            <FinancialSchemaBuilder value={service.financial_schema || []} vendors={vendors} onChange={(newSchema) => setService({ ...service, financial_schema: newSchema })} />
                        </TabsContent>

                        <TabsContent value="form" className="outline-none">
                            <FormBuilder value={service.form_schema || { sections: [] }} onChange={(newSchema) => setService({ ...service, form_schema: newSchema })} />
                        </TabsContent>
                    </Tabs>
                </div>

                {(activeTab === "overview" || activeTab === "finance") && (
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-primary/20 bg-primary/5 sticky top-24 rounded-none border-2 shadow-none overflow-hidden">
                            <div className="bg-primary h-1.5 w-full" />
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-primary uppercase font-black text-sm tracking-normal">
                                    <Calculator className="h-4 w-4" /> Final Pricing Preview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-white p-4 border-2 border-primary/10 space-y-1">
                                    <Label className="text-[9px] font-black uppercase tracking-normal text-muted-foreground">Standard Base Price</Label>
                                    <GoniaCurrencyInput value={service.base_price} onChange={(val) => setService({ ...service, base_price: val })} className="h-12 rounded-none font-bold text-lg border-2 border-primary/20" />
                                </div>

                                <Separator className="bg-primary/10" />

                                <div className="space-y-4">
                                    <div className="flex flex-col bg-white p-4 border-2 border-primary/5 mt-4">
                                        <div className="flex justify-between items-center w-full mb-1">
                                            <span className="font-black uppercase tracking-normal text-[10px] text-muted-foreground">Final Price ({currency})</span>
                                            <span className="font-black text-2xl text-primary font-mono">{formatCurrency(service.base_price)}</span>
                                        </div>
                                        <div className="flex justify-end w-full border-t border-primary/5 pt-2">
                                            <span className="font-bold text-[10px] text-muted-foreground/60 font-mono">
                                                {currency === "SAR" 
                                                    ? `≈ ৳${convertToBDT(service.base_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                                    : `≈ SR ${service.base_price.toFixed(2)}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </GoniaPageShell>
    );
}