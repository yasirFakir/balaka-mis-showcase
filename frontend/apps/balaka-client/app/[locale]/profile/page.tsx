"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { useAuth } from "@/lib/auth-context";
import { fetchClient, API_URL } from "@/core/api";
import { Button, Input, Label, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker, useNotifications, PHONE_REGEX, PASSPORT_REGEX, VISA_NUMBER_REGEX, IQAMA_REGEX, GoniaField, GONIA_INPUT_CLASSES, GONIA_ERROR_CLASSES, Form, LoadingSpinner } from "@/ui";






import { PhoneInput } from "@/components/shared/phone-input";

import { User as UserIcon, MapPin, FileText, ShieldCheck, Camera, Save, Edit2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { SecureImage } from "@/components/shared/secure-image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { GoniaPageShell } from "@/ui";
import { UserCircle } from "lucide-react";




// Relaxed schema to prevent blocking users with valid but non-standard IDs
const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().regex(new RegExp(PHONE_REGEX), "Invalid Phone Number"),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  passport_number: z.string().regex(new RegExp(PASSPORT_REGEX), "Invalid Passport").optional().or(z.literal("")),
  passport_expiry: z.string().optional().or(z.literal("")),
  visa_number: z.string().regex(new RegExp(VISA_NUMBER_REGEX), "Invalid Visa Number").optional().or(z.literal("")),
  visa_expiry: z.string().optional().or(z.literal("")),
  iqama_number: z.string().regex(new RegExp(IQAMA_REGEX), "Invalid Iqama").optional().or(z.literal("")),
  iqama_expiry: z.string().optional().or(z.literal("")),
  address_line1: z.string().optional().or(z.literal("")),
  address_line2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zip_code: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
});

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const { toast } = useNotifications();
    const t = useTranslations('Profile');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageKey, setImageKey] = useState(0);
    
    // React Hook Form Setup
    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            full_name: "",
            email: "",
            phone_number: "",
            date_of_birth: "",
            gender: "",
            nationality: "",
            passport_number: "",
            passport_expiry: "",
            visa_number: "",
            visa_expiry: "",
            iqama_number: "",
            iqama_expiry: "",
            address_line1: "",
            address_line2: "",
            city: "",
            state: "",
            zip_code: "",
            country: "",
        },
        mode: "onChange"
    });

    // Reset form when user loads or edit mode changes
    useEffect(() => {
        if (user) {
            form.reset({
                full_name: user.full_name || "",
                email: user.email || "",
                phone_number: user.phone_number || "",
                date_of_birth: user.date_of_birth || "",
                gender: user.gender || "",
                nationality: user.nationality || "",
                passport_number: user.passport_number || "",
                passport_expiry: user.passport_expiry || "",
                visa_number: user.visa_number || "",
                visa_expiry: user.visa_expiry || "",
                iqama_number: user.iqama_number || "",
                iqama_expiry: user.iqama_expiry || "",
                address_line1: user.address_line1 || "",
                address_line2: user.address_line2 || "",
                city: user.city || "",
                state: user.state || "",
                zip_code: user.zip_code || "",
                country: user.country || "",
            });
        }
    }, [user, isEditing, form]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 5MB Limit Check
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size too large. Maximum limit is 5MB.");
            return;
        }

        setPendingFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const onSubmit = async (values: z.infer<typeof profileSchema>) => {
        setLoading(true);

        try {
            const finalFormData: any = { ...values };

            // Keep existing profile picture unless changed
            if (user?.profile_picture) {
                finalFormData.profile_picture = user.profile_picture;
            }

            // Upload pending file if exists
            if (pendingFile) {
                setUploading(true);
                const uploadData = new FormData();
                uploadData.append("file", pendingFile);
                
                const queryParams = new URLSearchParams();
                queryParams.append("user", user?.id.toString() || "unknown");
                queryParams.append("service_name", "profile-management");
                queryParams.append("service_id", "personal");
                queryParams.append("field_name", "avatar");

                const uploadResponse = await fetch(`${API_URL}/api/v1/files/upload?${queryParams.toString()}`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
                    body: uploadData
                });

                if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json().catch(() => ({ detail: "File upload failed" }));
                    throw new Error(errorData.detail || "File upload failed");
                }
                
                const uploadResult = await uploadResponse.json();
                finalFormData.profile_picture = uploadResult.url;
                setUploading(false);
            }

            await fetchClient("/api/v1/users/me", {
                method: "PUT",
                body: JSON.stringify(finalFormData)
            });
            await refreshUser();
            toast.success(t('success'));
            setIsEditing(false);
            setPendingFile(null);
            setImageKey(prev => prev + 1); 
        } catch (error: any) {
            // Detailed error reporting
            let errorMessage = "Failed to update profile";
            if (typeof error.message === "string") {
                errorMessage = error.message;
            }
            if (Array.isArray(error.detail)) {
                errorMessage = error.detail.map((err: any) => err.msg).join(", ");
            }
            toast.error(errorMessage);
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setPendingFile(null);
        setPreviewUrl(null);
        form.reset(); // Revert to original user data
    };

    return (
        <ProtectedRoute>
            <GoniaPageShell
                title={t('title')}
                subtitle={t('subtitle')}
                icon={<UserCircle className="h-8 w-8" />}
                size="lg"
            >
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Left: Avatar & Action */}
                    <div className="w-full md:w-1/3 space-y-4">
                        <Card className="rounded-none border-2 shadow-none">
                            <CardContent className="pt-8 pb-8 flex flex-col items-center">
                                                            <div className="relative group">
                                                                <div className="w-40 h-40 rounded-none overflow-hidden border-2 border-primary/20 flex items-center justify-center bg-muted/30">
                                                                    {previewUrl ? (
                                                                        <img 
                                                                            src={previewUrl} 
                                                                            alt="Preview" 
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : user?.profile_picture ? (
                                                                        <SecureImage 
                                                                            key={imageKey}
                                                                            src={user.profile_picture} 
                                                                            alt="Profile" 
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <UserIcon className="w-20 h-20 text-primary/20" />
                                                                    )}
                                                                    {(uploading || loading) && (
                                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                            <LoadingSpinner size="md" className="text-white" />
                                                                        </div>
                                                                    )}
                                                                </div>                                    {isEditing && (
                                        <label htmlFor="avatar-upload" className="absolute bottom-[-10px] right-[-10px] bg-primary p-2 rounded-none text-white cursor-pointer shadow-[4px_4px_0_0_var(--gonia-accent)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                                            <Camera className="h-4 w-4" />
                                            <input 
                                                id="avatar-upload" 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*" 
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                        </label>
                                    )}
                                </div>
                                <div className="mt-6 text-center space-y-1">
                                    <h2 className="text-xl font-black uppercase tracking-tight text-primary">{user?.full_name || "User"}</h2>
                                    <p className="text-xs font-mono text-muted-foreground">{user?.email}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {!isEditing && (
                            <Button onClick={() => setIsEditing(true)} className="w-full h-10 rounded-none font-black uppercase tracking-normal text-[11px] gap-2 shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                                <Edit2 className="h-4 w-4" /> Edit Profile
                            </Button>
                        )}
                    </div>

                    {/* Right: Tabs */}
                    <div className="flex-1 w-full">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
                                <Tabs defaultValue="personal" className="w-full">
                                    <TabsList className="mb-8">
                                        <TabsTrigger value="personal" className="flex-1 gap-2"><UserIcon className="h-4 w-4" /> {t('personal')}</TabsTrigger>
                                        <TabsTrigger value="address" className="flex-1 gap-2"><MapPin className="h-4 w-4" /> {t('address')}</TabsTrigger>
                                        <TabsTrigger value="documents" className="flex-1 gap-2"><FileText className="h-4 w-4" /> {t('passport')}</TabsTrigger>
                                        <TabsTrigger value="iqama" className="flex-1 gap-2"><ShieldCheck className="h-4 w-4" /> {t('iqama')}</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="personal">
                                        <Card>
                                            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <GoniaField control={form.control} name="full_name" label="Full Name" required>
                                                        {({ field, error }) => (
                                                            <div className="w-full">
                                                                <Input {...field} disabled={!isEditing} className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES, !isEditing && "disabled:bg-muted/50 disabled:opacity-100")} />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="email" label="Email Address" required>
                                                        {({ field, error }) => (
                                                            <div className="w-full">
                                                                <Input {...field} type="email" disabled={!isEditing} className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES, !isEditing && "disabled:bg-muted/50 disabled:opacity-100")} />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="phone_number" label="Phone Number" required>
                                                        {({ field, error }) => (
                                                            <div className="w-full">
                                                                {isEditing ? (
                                                                    <PhoneInput value={field.value} onChange={field.onChange} className={error ? "ring-1 ring-destructive/30" : ""} />
                                                                ) : (
                                                                    <Input value={field.value} disabled className="h-11 rounded-none bg-muted/50 border-border/40 disabled:opacity-100 disabled:bg-muted/50" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="date_of_birth" label="Date of Birth">
                                                        {({ field }) => (
                                                            <div className="w-full">
                                                                <DatePicker 
                                                                    date={field.value ? new Date(field.value) : undefined} 
                                                                    setDate={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                                                    className="h-11 rounded-none bg-muted/50 border-border/40"
                                                                    disabled={!isEditing}
                                                                />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="gender" label="Gender">
                                                        {({ field }) => (
                                                            <div className="w-full">
                                                                <Select value={field.value} onValueChange={field.onChange} disabled={!isEditing}>
                                                                    <SelectTrigger className="h-11 rounded-none bg-muted/50 border-border/40 focus:bg-background transition-colors">
                                                                        <SelectValue placeholder="Select gender" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-none border-2">
                                                                        <SelectItem value="Male">Male</SelectItem>
                                                                        <SelectItem value="Female">Female</SelectItem>
                                                                        <SelectItem value="Other">Other</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="nationality" label="Nationality">
                                                        {({ field, error }) => (
                                                            <div className="w-full">
                                                                <Input {...field} disabled={!isEditing} className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES, !isEditing && "disabled:bg-muted/50 disabled:opacity-100")} />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="address">
                                        <Card className="rounded-none border-2">
                                            <CardHeader><CardTitle className="text-lg font-black uppercase tracking-tight">Address Details</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                <GoniaField control={form.control} name="address_line1" label="Address Line 1">
                                                    {({ field }) => (
                                                        <div className="w-full">
                                                            <Input {...field} disabled={!isEditing} className="h-11 rounded-none bg-muted/50 border-border/40 disabled:opacity-100 disabled:bg-muted/50" />
                                                        </div>
                                                    )}
                                                </GoniaField>
                                                <GoniaField control={form.control} name="address_line2" label="Address Line 2 (Optional)">
                                                    {({ field }) => (
                                                        <div className="w-full">
                                                            <Input {...field} disabled={!isEditing} className="h-11 rounded-none bg-muted/50 border-border/40 disabled:opacity-100 disabled:bg-muted/50" />
                                                        </div>
                                                    )}
                                                </GoniaField>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <GoniaField control={form.control} name="city" label="City">
                                                        {({ field }) => (
                                                            <div className="w-full">
                                                                <Input {...field} disabled={!isEditing} className="h-11 rounded-none bg-muted/50 border-border/40 disabled:opacity-100 disabled:bg-muted/50" />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="state" label="State / Province">
                                                        {({ field }) => (
                                                            <div className="w-full">
                                                                <Input {...field} disabled={!isEditing} className="h-11 rounded-none bg-muted/50 border-border/40 disabled:opacity-100 disabled:bg-muted/50" />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="zip_code" label="Zip Code">
                                                        {({ field }) => (
                                                            <div className="w-full">
                                                                <Input {...field} disabled={!isEditing} className="h-11 rounded-none bg-muted/50 border-border/40 disabled:opacity-100 disabled:bg-muted/50" />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="country" label="Country">
                                                        {({ field }) => (
                                                            <div className="w-full">
                                                                <Input {...field} disabled={!isEditing} className="h-11 rounded-none bg-muted/50 border-border/40 disabled:opacity-100 disabled:bg-muted/50" />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="documents">
                                        <Card className="rounded-none border-2">
                                            <CardHeader><CardTitle className="text-lg font-black uppercase tracking-tight">Passport & Visa Information</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <GoniaField control={form.control} name="passport_number" label="Passport Number">
                                                        {({ field, error }) => (
                                                            <div className="w-full">
                                                                <Input {...field} disabled={!isEditing} className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES, !isEditing && "disabled:bg-muted/50 disabled:opacity-100")} />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="passport_expiry" label="Passport Expiry">
                                                        {({ field }) => (
                                                            <div className="w-full">
                                                                <DatePicker 
                                                                    date={field.value ? new Date(field.value) : undefined} 
                                                                    setDate={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                                                    className="h-11 rounded-none bg-muted/50 border-border/40"
                                                                    disabled={!isEditing}
                                                                />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="visa_number" label="Visa Number">
                                                        {({ field, error }) => (
                                                            <div className="w-full">
                                                                <Input {...field} disabled={!isEditing} className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES, !isEditing && "disabled:bg-muted/50 disabled:opacity-100")} />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="visa_expiry" label="Visa Expiry">
                                                        {({ field }) => (
                                                            <div className="w-full">
                                                                <DatePicker 
                                                                    date={field.value ? new Date(field.value) : undefined} 
                                                                    setDate={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                                                    className="h-11 rounded-none bg-muted/50 border-border/40"
                                                                    disabled={!isEditing}
                                                                />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="iqama">
                                        <Card className="rounded-none border-2">
                                            <CardHeader><CardTitle className="text-lg font-black uppercase tracking-tight">Iqama / Residency Details</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <GoniaField control={form.control} name="iqama_number" label="Iqama Number">
                                                        {({ field, error }) => (
                                                            <div className="w-full">
                                                                <Input {...field} disabled={!isEditing} className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES, !isEditing && "disabled:bg-muted/50 disabled:opacity-100")} />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                    <GoniaField control={form.control} name="iqama_expiry" label="Iqama Expiry">
                                                        {({ field }) => (
                                                            <div className="w-full">
                                                                <DatePicker 
                                                                    date={field.value ? new Date(field.value) : undefined} 
                                                                    setDate={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                                                    className="h-11 rounded-none bg-muted/50 border-border/40"
                                                                    disabled={!isEditing}
                                                                />
                                                            </div>
                                                        )}
                                                    </GoniaField>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    {isEditing && (
                                        <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={cancelEdit} 
                                                className="h-10 px-6 rounded-none border-primary text-primary hover:bg-primary hover:text-white transition-all font-black uppercase tracking-normal text-[11px]"
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                type="submit" 
                                                disabled={loading} 
                                                className="h-10 px-6 rounded-none font-black uppercase tracking-normal text-[11px] gap-2 shadow-[3px_3px_0_0_var(--gonia-accent)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                                            >
                                                {loading ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
                                                {t('save')}
                                            </Button>
                                        </div>
                                    )}
                                </Tabs>
                            </form>
                        </Form>
                    </div>
                </div>
            </GoniaPageShell>
        </ProtectedRoute>
    );
}
