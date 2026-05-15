"use client";

import { useState, useEffect } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker, generateZodSchema, FormSchema, useNotifications } from "@/ui";




import { useForm, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";



import { PhoneInput } from "../shared/phone-input";



import { fetchClient, API_URL } from "@/core/api";
import { Loader2, Edit2, Upload, FileText } from "lucide-react";

interface EditRequestFormDialogProps {
  requestId: number;
  initialFormData: Record<string, any>;
  formSchema: FormSchema;
  userContext?: {
      id: number;
      phone?: string;
      email?: string;
  };
  serviceSlug?: string;
  onUpdated: () => void;
  trigger?: React.ReactNode;
}

export function EditRequestFormDialog({
    requestId,
    initialFormData,
    formSchema,
    userContext,
    serviceSlug,
    onUpdated,
    trigger
}: EditRequestFormDialogProps) {
    const { toast } = useNotifications();
    const [open, setOpen] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    // Use Shared Validation Logic
    const { schema: zodSchema } = generateZodSchema(formSchema);

    const form = useForm<FieldValues>({
        resolver: zodResolver(zodSchema),
        defaultValues: initialFormData,
    });

    useEffect(() => {
        if (open) {
            form.reset(initialFormData);
        }
    }, [open, initialFormData, form]);

    const handleFileUpload = async (key: string, file: File) => {
        // 5MB Limit Check
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size too large. Maximum limit is 5MB.");
            return;
        }

        setUploadingField(key);
        const uploadData = new FormData();
        uploadData.append("file", file);

        try {
            const token = localStorage.getItem("token");
            
            const queryParams = new URLSearchParams();
            if (userContext) {
                queryParams.append("user", userContext.id.toString());
                queryParams.append("service_name", serviceSlug || "service");
                queryParams.append("service_id", requestId.toString());
                queryParams.append("field_name", key);
            }

            const response = await fetch(`${API_URL}/api/v1/files/upload?${queryParams.toString()}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: uploadData
            });

            if (!response.ok) throw new Error("Upload failed");
            
            const result = await response.json();
            form.setValue(key, result.url);
            toast.success("File uploaded successfully");
        } catch (error) {
            toast.error("Failed to upload file");
        } finally {
            setUploadingField(null);
        }
    };

    const onSubmit = async (data: FieldValues) => {
        try {
            await fetchClient(`/api/v1/service-requests/${requestId}`, {
                method: "PUT",
                body: JSON.stringify({ form_data: data })
            });

            toast.success("Application data updated successfully");
            setOpen(false);
            onUpdated();
        } catch (error: any) {
            const message = error instanceof Error ? error.message : "Failed to update application data";
            toast.error(message);
        }
    };

    const onError = (errors: FieldValues) => {
        const firstErrorKey = Object.keys(errors)[0];
        if (firstErrorKey) {
            const errorMessage = errors[firstErrorKey]?.message || "Validation failed. Please check your inputs.";
            toast.error(errorMessage);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2 rounded-none border-2 border-primary/20 hover:border-primary">
                        <Edit2 className="h-4 w-4" /> Edit Data
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-none border-2">
                <DialogHeader className="p-6 bg-brand-canvas/30 border-b">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Application Data</DialogTitle>
                    <DialogDescription className="text-xs uppercase font-bold text-muted-foreground tracking-normal">
                        Modify the information submitted by the client.
                    </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex flex-col">
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                            {formSchema.sections.map((section, sIdx) => (
                                <div key={sIdx} className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-normal text-primary/60 border-b-2 border-primary/10 pb-1">
                                        {section.title}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {section.fields.map((field) => (
                                            <FormField
                                                key={field.key}
                                                control={form.control}
                                                name={field.key}
                                                render={({ field: formField }) => (
                                                    <FormItem className="space-y-1">
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">
                                                            {field.label} {field.required && <span className="text-destructive">*</span>}
                                                        </FormLabel>
                                                        <FormControl>
                                                            {field.type === "select" ? (
                                                                <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                                                                    <SelectTrigger className="h-9 rounded-none bg-background">
                                                                        <SelectValue placeholder={`Select ${field.label}`} />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-none border-2">
                                                                        {field.options?.map((opt, i) => (
                                                                            <SelectItem key={i} value={opt}>{opt}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : field.type === "phone" ? (
                                                                <PhoneInput value={formField.value || ""} onChange={formField.onChange} />
                                                            ) : field.type === "date" ? (
                                                                <DatePicker 
                                                                    date={formField.value ? new Date(formField.value) : undefined} 
                                                                    setDate={(date) => formField.onChange(date?.toISOString().split('T')[0])}
                                                                    className="w-full h-9 rounded-none"
                                                                />
                                                            ) : field.type === "file" ? (
                                                                <div className="space-y-2">
                                                                    {formField.value && typeof formField.value === 'string' && (formField.value.startsWith('/static/') || formField.value.startsWith('/api/')) && (
                                                                        <div className="flex items-center justify-between p-2 bg-primary/5 border border-dashed border-primary/20">
                                                                            <span className="text-[10px] font-mono font-bold text-primary truncate max-w-[150px]">{String(formField.value).split('/').pop()}</span>
                                                                            <Button 
                                                                                type="button" 
                                                                                variant="outline" 
                                                                                size="sm" 
                                                                                className="h-6 text-[10px] rounded-none border-primary/20 hover:border-primary px-2" 
                                                                                onClick={async () => {
                                                                                    const value = formField.value as string;
                                                                                    const newWindow = window.open('', '_blank');
                                                                                    if (newWindow) newWindow.document.write('Loading secure document...');

                                                                                    try {
                                                                                        if (value.startsWith('/static/')) {
                                                                                            if (newWindow) newWindow.location.href = `${API_URL}${value}`;
                                                                                            return;
                                                                                        }

                                                                                        const token = localStorage.getItem("token");
                                                                                        const fullUrl = value.startsWith('http') ? value : `${API_URL}${value}`;
                                                                                        const res = await fetch(fullUrl, { headers: { "Authorization": `Bearer ${token}` } });
                                                                                        if (!res.ok) throw new Error(`Server error: ${res.status}`);
                                                                                        
                                                                                        const blob = await res.blob();
                                                                                        const url = window.URL.createObjectURL(blob);
                                                                                        if (newWindow) newWindow.location.href = url;
                                                                                    } catch (err: any) {
                                                                                        if (newWindow) newWindow.close();
                                                                                        toast.error(`Could not load document: ${err.message}`);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                View
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                    <div className="relative">
                                                                        <Input type="file" className="hidden" id={`edit-file-${field.key}`} onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) handleFileUpload(field.key, file);
                                                                        }} disabled={uploadingField === field.key} />
                                                                        <Button type="button" variant="outline" className="w-full h-9 text-xs rounded-none border-2 border-primary/10 hover:border-primary gap-2" asChild disabled={uploadingField === field.key}>
                                                                            <label htmlFor={`edit-file-${field.key}`} className="cursor-pointer">
                                                                                {uploadingField === field.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                                                                {uploadingField === field.key ? "Uploading..." : "Replace File"}
                                                                            </label>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <Input 
                                                                    type={field.type === "number" ? "number" : "text"}
                                                                    placeholder={field.label}
                                                                    className="h-9 rounded-none bg-background focus-visible:ring-primary/20"
                                                                    {...formField}
                                                                    value={formField.value ?? ""}
                                                                />
                                                            )}
                                                        </FormControl>
                                                        <FormMessage className="text-[9px] font-bold uppercase tracking-tighter" />
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                            <DialogFooter className="p-6 bg-primary/[0.02] border-t border-primary/5">
                                <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 px-8 uppercase font-black text-xs shadow-[4px_4px_0_0_var(--gonia-accent)]">
                                    {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                                </Button>
                            </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
