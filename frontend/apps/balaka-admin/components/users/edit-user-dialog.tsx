"use client";

import { useState, useEffect } from "react";
import { 
  Button, 
  GoniaResponsiveDialog, 
  Input, 
  Label, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger, 
  DatePicker, 
  useNotifications, 
  PHONE_REGEX, 
  NAME_REGEX, 
  GoniaField, 
  GONIA_INPUT_CLASSES, 
  GONIA_ERROR_CLASSES, 
  Form, 
  LoadingSpinner 
} from "@/ui";






import { PhoneInput } from "../shared/phone-input";
import { fetchClient, API_URL } from "@/core/api";
import { ServiceDefinition, User, Role } from "@/core/types";

import { Pencil, User as UserIcon, MapPin, Shield, Database, Camera } from "lucide-react";
import { SecureImage } from "../shared/secure-image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { cn } from "@/lib/utils";




interface EditUserDialogProps {
  user: User;
  onUserUpdated: (updatedUser: User) => void;
  allowRoleEdit?: boolean;
  trigger?: React.ReactNode;
}

const editUserSchema = z.object({
  full_name: z.string().min(1, "Name is required"), // Relaxed to allow any name
  email: z.string().email("Invalid email address"),
  phone_number: z.string().regex(new RegExp(PHONE_REGEX), "Invalid Phone Number"), // Matches shared validation
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  nid_number: z.string().optional().or(z.literal("")), // Relaxed
  passport_number: z.string().optional().or(z.literal("")), // Relaxed
  passport_expiry: z.string().optional().or(z.literal("")),
  visa_number: z.string().optional().or(z.literal("")), // Relaxed
  visa_expiry: z.string().optional().or(z.literal("")),
  iqama_number: z.string().optional().or(z.literal("")), // Relaxed
  iqama_expiry: z.string().optional().or(z.literal("")),
  address_line1: z.string().optional().or(z.literal("")),
  address_line2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zip_code: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
});

export function EditUserDialog({ user, onUserUpdated, trigger, allowRoleEdit = false }: EditUserDialogProps) {
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceDefinition[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [profilePicture, setProfilePicture] = useState("");
  const [imageKey, setImageKey] = useState(0);

  const form = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      full_name: user.full_name || "",
      email: user.email || "",
      phone_number: user.phone_number || "",
      date_of_birth: user.date_of_birth || "",
      gender: user.gender || "",
      nationality: user.nationality || "",
      nid_number: user.nid_number || "",
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
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
        form.reset({
            full_name: user.full_name || "",
            email: user.email || "",
            phone_number: user.phone_number || "",
            date_of_birth: user.date_of_birth || "",
            gender: user.gender || "",
            nationality: user.nationality || "",
            nid_number: user.nid_number || "",
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
        setProfilePicture(user.profile_picture || "");
        setSelectedRoleIds(user.roles.map((r: Role) => r.id));
        setSelectedServiceIds(user.allowed_services?.map((s: { id: number }) => s.id) || []);
        
        if (allowRoleEdit) {
            loadRoles();
            loadServices();
        }
    }
  }, [open, user, allowRoleEdit, form]);

  async function loadRoles() {
    try {
      const data = await fetchClient<{ items: Role[] } | Role[]>("/api/v1/roles/");
      setAvailableRoles(Array.isArray(data) ? data : (data.items || []));
    } catch (error) {
      console.error("Failed to load roles", error);
    }
  }

  async function loadServices() {
    try {
      const data = await fetchClient<{ items: ServiceDefinition[] } | ServiceDefinition[]>("/api/v1/services/");
      setAvailableServices(Array.isArray(data) ? data : (data.items || []));
    } catch (error) {
      console.error("Failed to load services", error);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size too large. Maximum limit is 5MB.");
      return;
    }

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append("file", file);
    
    // Pass context for consistent file naming if desired
    const queryParams = new URLSearchParams();
    queryParams.append("user", user.id.toString());
    queryParams.append("service_name", "user-management");
    queryParams.append("service_id", "profile-update");
    queryParams.append("field_name", "avatar");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/v1/files/upload?${queryParams.toString()}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: uploadData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(errorData.detail || "Upload failed");
      }
      const result = await response.json();
      setProfilePicture(result.url);
      toast.success("Profile picture uploaded");
    } catch (error: any) {
      console.error("Upload error:", error);
      const message = error instanceof Error ? error.message : "Failed to upload image";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleRoleToggle = (roleId: number) => {
      setSelectedRoleIds(prev => 
          prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
      );
  };

  const handleServiceToggle = (serviceId: number) => {
      setSelectedServiceIds(prev => 
          prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
      );
  };

  const onSubmit = async (values: z.infer<typeof editUserSchema>) => {
    setLoading(true);

    try {
      const payload: Record<string, any> = { 
          ...values,
          profile_picture: profilePicture,
      };
      
      if (allowRoleEdit) {
          payload.role_ids = selectedRoleIds;
          payload.allowed_service_ids = selectedServiceIds;
      }

      const updatedUser = await fetchClient<User>(`/api/v1/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      onUserUpdated(updatedUser);
      toast.success("User updated successfully");
      setOpen(false);
      setImageKey(prev => prev + 1);
    } catch (error: any) {
      console.error("Edit User Error:", error);
      let errorMessage = "Failed to update user";
      if (error.detail && Array.isArray(error.detail)) {
          errorMessage = error.detail.map((err: any) => `${err.loc[1]}: ${err.msg}`).join(", ");
      } else if (error.message) {
          errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

    return (

      <>

        {trigger ? (

          <div onClick={() => setOpen(true)}>{trigger}</div>

        ) : (

          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>

              <Pencil className="h-4 w-4" />

          </Button>

        )}

  

        <GoniaResponsiveDialog
          isOpen={open}
          onOpenChange={setOpen}
          title="Edit User"
          description="Update user details and access control."
          maxWidth="xl"
          footer={
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={loading || uploading} 
              className="w-full h-11 rounded-none font-black uppercase tracking-normal shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
                {(loading || uploading) && <LoadingSpinner size="sm" className="mr-2" />}
                Save Profile Changes
            </Button>
          }
        >
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="w-full h-12 bg-muted/20 p-1 rounded-none border-b border-primary/10 overflow-x-auto no-scrollbar">
                    <TabsTrigger value="personal" className="flex-1 gap-2 text-[10px] uppercase font-black">
                      <UserIcon className="h-3.5 w-3.5" /> Personal
                    </TabsTrigger>
                    <TabsTrigger value="address" className="flex-1 gap-2 text-[10px] uppercase font-black">
                      <MapPin className="h-3.5 w-3.5" /> Address
                    </TabsTrigger>
                    {allowRoleEdit && (
                      <>
                        <TabsTrigger value="roles" className="flex-1 gap-2 text-[10px] uppercase font-black">
                          <Shield className="h-3.5 w-3.5" /> Roles
                        </TabsTrigger>
                        <TabsTrigger value="scope" className="flex-1 gap-2 text-[10px] uppercase font-black">
                          <Database className="h-3.5 w-3.5" /> Scope
                        </TabsTrigger>
                      </>
                    )}
                  </TabsList>

                  <TabsContent value="personal" className="mt-0 pt-6 space-y-6">
                    <div className="flex justify-center mb-6">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-none overflow-hidden border-2 border-primary/20 flex items-center justify-center bg-muted/30">
                          {profilePicture ? (
                            <SecureImage 
                              key={imageKey}
                              src={profilePicture} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-12 h-12 text-primary/20" />
                          )}
                          {uploading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <LoadingSpinner size="md" className="text-white" />
                            </div>
                          )}
                        </div>
                        <label htmlFor="edit-avatar-upload" className="absolute bottom-[-8px] right-[-8px] bg-primary p-1.5 rounded-none text-white cursor-pointer shadow-[2px_2px_0_0_var(--gonia-accent)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                          <Camera className="h-3.5 w-3.5" />
                          <input 
                            id="edit-avatar-upload" 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <GoniaField control={form.control} name="full_name" label="Full Name" required>
                        {({ field, error }) => (
                          <Input {...field} className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES)} />
                        )}
                      </GoniaField>
                      <GoniaField control={form.control} name="email" label="Email Address" required>
                        {({ field, error }) => (
                          <Input {...field} type="email" className={cn(GONIA_INPUT_CLASSES, error && GONIA_ERROR_CLASSES)} />
                        )}
                      </GoniaField>
                      <GoniaField control={form.control} name="phone_number" label="Phone Number" required>
                        {({ field, error }) => (
                          <PhoneInput value={field.value} onChange={field.onChange} className={error ? "ring-1 ring-destructive/30" : ""} />
                        )}
                      </GoniaField>
                      <GoniaField control={form.control} name="date_of_birth" label="Date of Birth">
                        {({ field }) => (
                          <DatePicker 
                            date={field.value ? new Date(field.value) : undefined} 
                            setDate={(date) => field.onChange(date?.toISOString().split('T')[0])}
                            className="w-full rounded-none h-11 bg-muted/10 border-primary/10"
                          />
                        )}
                      </GoniaField>
                      <GoniaField control={form.control} name="gender" label="Gender">
                        {({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="rounded-none h-11 bg-muted/10 border-primary/10">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-2">
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </GoniaField>
                      <GoniaField control={form.control} name="nationality" label="Nationality">
                        {({ field }) => (
                          <Input {...field} className="rounded-none h-11 bg-muted/10 border-primary/10" />
                        )}
                      </GoniaField>
                    </div>

                    <div className="border-t-2 border-primary/5 pt-6">
                      <h4 className="text-[10px] font-black uppercase tracking-normal text-primary mb-4 flex items-center gap-2">
                        <Shield className="h-3 w-3" /> Identification Details
                      </h4>
                      <div className="grid gap-4">
                          <GoniaField control={form.control} name="nid_number" label="National ID">
                            {({ field }) => (
                              <Input {...field} placeholder="NID Number" className="rounded-none h-11 bg-muted/10 border-primary/10" />
                            )}
                          </GoniaField>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <GoniaField control={form.control} name="passport_number" label="Passport Number">
                                {({ field }) => (
                                  <Input {...field} placeholder="Passport #" className="rounded-none h-11 bg-muted/10 border-primary/10" />
                                )}
                              </GoniaField>
                              <GoniaField control={form.control} name="passport_expiry" label="Passport Expiry">
                                {({ field }) => (
                                  <DatePicker 
                                    date={field.value ? new Date(field.value) : undefined} 
                                    setDate={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                    className="w-full rounded-none h-11 bg-muted/10 border-primary/10"
                                  />
                                )}
                              </GoniaField>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <GoniaField control={form.control} name="iqama_number" label="Iqama Number">
                                {({ field }) => (
                                  <Input {...field} placeholder="Iqama #" className="rounded-none h-11 bg-muted/10 border-primary/10" />
                                )}
                              </GoniaField>
                              <GoniaField control={form.control} name="iqama_expiry" label="Iqama Expiry">
                                {({ field }) => (
                                  <DatePicker 
                                    date={field.value ? new Date(field.value) : undefined} 
                                    setDate={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                    className="w-full rounded-none h-11 bg-muted/10 border-primary/10"
                                  />
                                )}
                              </GoniaField>
                          </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="address" className="mt-0 pt-6 space-y-4">
                    <div className="grid gap-4">
                      <GoniaField control={form.control} name="address_line1" label="Address Line 1">
                        {({ field }) => (
                          <Input {...field} className="rounded-none h-11 bg-muted/10 border-primary/10" />
                        )}
                      </GoniaField>
                      <GoniaField control={form.control} name="address_line2" label="Address Line 2 (Optional)">
                        {({ field }) => (
                          <Input {...field} className="rounded-none h-11 bg-muted/10 border-primary/10" />
                        )}
                      </GoniaField>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <GoniaField control={form.control} name="city" label="City">
                          {({ field }) => (
                            <Input {...field} className="rounded-none h-11 bg-muted/10 border-primary/10" />
                          )}
                        </GoniaField>
                        <GoniaField control={form.control} name="state" label="State / Province">
                          {({ field }) => (
                            <Input {...field} className="rounded-none h-11 bg-muted/10 border-primary/10" />
                          )}
                        </GoniaField>
                        <GoniaField control={form.control} name="zip_code" label="Zip Code">
                          {({ field }) => (
                            <Input {...field} className="rounded-none h-11 bg-muted/10 border-primary/10" />
                          )}
                        </GoniaField>
                        <GoniaField control={form.control} name="country" label="Country">
                          {({ field }) => (
                            <Input {...field} className="rounded-none h-11 bg-muted/10 border-primary/10" />
                          )}
                        </GoniaField>
                      </div>
                    </div>
                  </TabsContent>

                  {allowRoleEdit && (
                    <>
                      <TabsContent value="roles" className="mt-0 pt-6 space-y-4">
                        <div className="grid gap-2">
                          <Label className="text-[10px] uppercase font-black tracking-normal text-muted-foreground">Assigned Roles</Label>
                          {user.is_superuser && (
                            <div className="mb-4 p-4 bg-primary/5 border border-primary/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-black uppercase text-primary">Super Account Detected</span>
                                </div>
                                <p className="text-[10px] text-primary/60 font-bold uppercase tracking-tight">
                                    This user has global superuser privileges. Individual role assignments are redundant but can be maintained for record-keeping.
                                </p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-2 border-primary/10 p-4 bg-background">
                              {availableRoles.length === 0 ? (
                                <div className="col-span-2 flex justify-center py-4">
                                  <LoadingSpinner size="sm" />
                                </div>
                              ) : (
                                  availableRoles.map(role => (
                                      <label key={role.id} className="flex items-center space-x-3 cursor-pointer group">
                                          <input 
                                              type="checkbox"
                                              className="rounded-none border-2 border-primary/20 text-primary focus:ring-primary h-4 w-4"
                                              checked={selectedRoleIds.includes(role.id)}
                                              onChange={() => handleRoleToggle(role.id)}
                                          />
                                          <span className="text-xs font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{role.name}</span>
                                      </label>
                                  ))
                              )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="scope" className="mt-0 pt-6 space-y-4">
                        <div className="grid gap-2">
                          <Label className="text-[10px] uppercase font-black tracking-normal text-muted-foreground">Service Access Scope</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-2 border-primary/10 p-4 bg-background">
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
                                          <span className="text-xs font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{service.name}</span>
                                      </label>
                                  ))
                              )}
                          </div>
                          <p className="text-[10px] font-bold text-primary/60 italic mt-2 uppercase tracking-tighter">
                            * Leave all unchecked to grant access to ALL system services.
                          </p>
                        </div>
                      </TabsContent>
                    </>
                  )}
                </Tabs>
              </form>
          </Form>
        </GoniaResponsiveDialog>

      </>

    );

  }

  