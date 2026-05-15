"use client";

import { useState, useEffect } from "react";
import { 
  Button, 
  GoniaResponsiveDialog, 
  Input, 
  useNotifications, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  PHONE_REGEX, 
  NAME_REGEX, 
  GoniaField, 
  GONIA_INPUT_CLASSES, 
  GONIA_ERROR_CLASSES, 
  Label, 
  gonia, 
  Form, 
  LoadingSpinner 
} from "@/ui";


import { fetchClient, API_URL } from "@/core/api";

import { UserPlus, Loader2, Plus, Camera, User as UserIcon, Database } from "lucide-react";

import { PhoneInput } from "../shared/phone-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { cn } from "@/lib/utils";

import { SecureImage } from "../shared/secure-image";


import { Role } from "@/core/types";



interface CreateStaffDialogProps {
  onStaffCreated: (user: any) => void;
  trigger?: React.ReactNode;
}

const staffSchema = z.object({
  fullName: z.string().min(2, "Name is too short").regex(new RegExp(NAME_REGEX), "Name cannot contain numbers"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().regex(new RegExp(PHONE_REGEX), "Invalid Phone Number"),
  selectedRole: z.string().min(1, "Please select a role"),
  staffCategory: z.string().min(1, "Select a category"),
  workOffice: z.string().min(1, "Select an office"),
  nidNumber: z.string().optional().or(z.literal("")),
  passportNumber: z.string().optional().or(z.literal("")),
  iqamaNumber: z.string().optional().or(z.literal("")),
});

export function CreateStaffDialog({ onStaffCreated, trigger }: CreateStaffDialogProps) {
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [profilePicture, setProfilePicture] = useState("");

  const form = useForm<z.infer<typeof staffSchema>>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "+966 ",
      selectedRole: "",
      staffCategory: "Field Operations",
      workOffice: "Riyadh (RUH)",
      nidNumber: "",
      passportNumber: "",
      iqamaNumber: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      loadRoles();
      loadServices();
    }
  }, [open]);

  async function loadRoles() {
    try {
      const data = await fetchClient<any>("/api/v1/roles/");
      const roles = Array.isArray(data) ? data : (data.items || []);
      setAvailableRoles(roles.filter((r: any) => r.name !== "Client"));
    } catch (error) {
      console.error("Failed to load roles", error);
    }
  }

  async function loadServices() {
    try {
      const data = await fetchClient<any>("/api/v1/services/");
      setAvailableServices(Array.isArray(data) ? data : (data.items || []));
    } catch (error) {
      console.error("Failed to load services", error);
    }
  }

  const handleServiceToggle = (serviceId: number) => {
    setSelectedServiceIds(prev => 
        prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size too large. Maximum limit is 5MB.");
      return;
    }

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/v1/files/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: uploadData
      });

      if (!response.ok) throw new Error("Upload failed");
      const result = await response.json();
      setProfilePicture(result.url);
      toast.success("Profile picture uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof staffSchema>) => {
    const roleId = availableRoles.find(r => r.name === values.selectedRole)?.id;
    if (!roleId) return;

    setIsLoading(true);

    try {
      const newUser = await fetchClient<any>("/api/v1/users/staff", {
        method: "POST",
        body: JSON.stringify({ 
            full_name: values.fullName,
            email: values.email,
            phone_number: values.phoneNumber,
            profile_picture: profilePicture,
            staff_category: values.staffCategory,
            work_office: values.workOffice,
            nid_number: values.nidNumber || null,
            passport_number: values.passportNumber || null,
            iqama_number: values.iqamaNumber || null,
            role_ids: [roleId],
            allowed_service_ids: selectedServiceIds
        })
      });

      onStaffCreated(newUser);
      toast.success("Staff member created successfully");
      setOpen(false);
      form.reset();
      setProfilePicture("");
      setSelectedServiceIds([]);
    } catch (error: any) {
      console.error("Create Staff Error:", error);
      let errorMessage = "Failed to create staff";
      if (error.detail && Array.isArray(error.detail)) {
          errorMessage = error.detail.map((err: any) => `${err.loc[1]}: ${err.msg}`).join(", ");
      } else if (error.message) {
          errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-block">
        {trigger || (
          <Button className={cn(gonia.button.base, gonia.button.primary, "h-10 px-6")}>
              <Plus className="h-4 w-4 mr-2" /> Register New Staff
          </Button>
        )}
      </div>

      <GoniaResponsiveDialog
        isOpen={open}
        onOpenChange={setOpen}
        title="Add New Staff Member"
        description="Create a new administrative account with specific regional and service access."
        maxWidth="xl"
        footer={
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoading || uploading} 
            className={cn(gonia.button.base, gonia.button.primary, "w-full h-12")}
          >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Register Staff Member
          </Button>
        }
      >
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="flex flex-col items-center mb-4">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-none overflow-hidden border-2 border-primary/20 flex items-center justify-center bg-primary/5">
                    {profilePicture ? (
                      <SecureImage src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-10 h-10 text-primary/20" />
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <label htmlFor="staff-avatar-upload" className="absolute bottom-[-8px] right-[-8px] bg-primary p-2 rounded-none text-white cursor-pointer shadow-[2px_2px_0_0_var(--gonia-warning)] hover:shadow-none transition-all">
                    <Camera className="h-4 w-4" />
                    <input id="staff-avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <GoniaField control={form.control} name="fullName" label="Full Name" required>
                  {({ field, error }) => (
                    <Input {...field} className={cn(gonia.input.base, error && GONIA_ERROR_CLASSES)} />
                  )}
                </GoniaField>
                <GoniaField control={form.control} name="email" label="Email Address" required>
                  {({ field, error }) => (
                    <Input {...field} type="email" className={cn(gonia.input.base, error && GONIA_ERROR_CLASSES)} />
                  )}
                </GoniaField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <GoniaField control={form.control} name="staffCategory" label="Staff Category" required>
                  {({ field, error }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={cn(gonia.input.base, error && GONIA_ERROR_CLASSES)}>
                            <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2 border-primary/20">
                            <SelectItem value="Management" className="text-sm font-bold">Management</SelectItem>
                            <SelectItem value="Field Operations" className="text-sm font-bold">Field Operations</SelectItem>
                            <SelectItem value="Logistics Team" className="text-sm font-bold">Logistics Team</SelectItem>
                            <SelectItem value="Support Desk" className="text-sm font-bold">Support Desk</SelectItem>
                        </SelectContent>
                    </Select>
                  )}
                </GoniaField>
                <GoniaField control={form.control} name="workOffice" label="Assigned Office" required>
                  {({ field, error }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={cn(gonia.input.base, error && GONIA_ERROR_CLASSES)}>
                            <SelectValue placeholder="Select office..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2 border-primary/20">
                            <SelectItem value="Riyadh (RUH)" className="text-sm font-bold">Riyadh (RUH)</SelectItem>
                            <SelectItem value="Dhaka (DAC)" className="text-sm font-bold">Dhaka (DAC)</SelectItem>
                            <SelectItem value="Jeddah (JED)" className="text-sm font-bold">Jeddah (JED)</SelectItem>
                        </SelectContent>
                    </Select>
                  )}
                </GoniaField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                <GoniaField control={form.control} name="phoneNumber" label="Phone Number" required>
                  {({ field, error }) => (
                    <PhoneInput value={field.value} onChange={field.onChange} className={cn("h-11", error ? "border-destructive" : "border-primary/20")} />
                  )}
                </GoniaField>
                <div className="bg-secondary/10 border-2 border-secondary/20 p-4">
                    <p className="text-[10px] uppercase font-black text-secondary-foreground mb-1">Security Protocol</p>
                    <p className="text-[11px] leading-tight text-primary/70">
                      A <strong>temporary password</strong> will be automatically generated and sent to the provided email. The staff member will be required to change it on their first login.
                    </p>
                </div>
              </div>

              <div className="pt-6 border-t border-primary/10">
                <h4 className={cn(gonia.text.label, "mb-4 text-primary/40 flex items-center gap-2")}>
                  <Database className="h-4 w-4" /> Service Access Scope
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-primary/5 border-2 border-primary/10">
                    {availableServices.length === 0 ? (
                      <div className="col-span-2 flex justify-center py-4">
                        <LoadingSpinner size="sm" />
                      </div>
                    ) : (
                        availableServices.map(service => (
                            <label key={service.id} className="flex items-center space-x-3 cursor-pointer group">
                                <input 
                                    type="checkbox"
                                    className="rounded-none border-2 border-primary/20 text-primary focus:ring-primary h-4 w-4"
                                    checked={selectedServiceIds.includes(service.id)}
                                    onChange={() => handleServiceToggle(service.id)}
                                />
                                <span className="text-xs font-bold text-primary group-hover:text-secondary transition-colors">{service.name}</span>
                            </label>
                        ))
                    )}
                </div>
                <p className={cn(gonia.text.caption, "mt-3 italic")}>
                  * Unchecked scope grants access to all system services by default.
                </p>
              </div>

              <GoniaField control={form.control} name="selectedRole" label="Assigned Role" required>
                {({ field, error }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={cn(gonia.input.base, error && GONIA_ERROR_CLASSES)}>
                          <SelectValue placeholder="Select system role..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-2 border-primary/20">
                          {availableRoles.map(role => (
                              <SelectItem key={role.id} value={role.name} className="text-sm font-bold">{role.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                )}
              </GoniaField>
            </form>
        </Form>
      </GoniaResponsiveDialog>
    </>
  );
}
