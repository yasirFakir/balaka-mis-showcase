"use client";

import { 
  useNotifications, 
  FormSchema, 
  GoniaDynamicForm 
} from "@/ui";

import { PhoneInput } from "./phone-input";
import { fetchClient } from "@/core/api";
import { useState } from "react";
import { cn } from "@/lib/utils";


import { User, Vendor } from "@/core/types";

interface DynamicFormProps {
  schema: FormSchema;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onValuesChange?: (data: Record<string, any>) => void;
  submitLabel?: string;
  hideSubmit?: boolean;
  defaultValues?: Record<string, any>;
  context?: {
    user_identifier: string;
    service_name: string;
    service_id: string | number;
  };
}

export function DynamicForm({ 
  schema, 
  onSubmit, 
  onValuesChange, 
  submitLabel = "Submit Application", 
  hideSubmit = false,
  defaultValues: initialValues, 
  context 
}: DynamicFormProps) {
  const { toast } = useNotifications();

  const loadRemoteOptions = async (source: string): Promise<string[]> => {
    try {
        let options: string[] = [];
        if (source === "staff") {
            const data = await fetchClient<{ items: User[] } | User[]>("/api/v1/users/staff-directory");
            const users = Array.isArray(data) ? data : (data.items || []);
            options = users.map((u) => `${u.full_name} (${u.staff_category || 'Staff'} - ${u.work_office || 'General'})`);
        } else if (source === "vendors") {
            const data = await fetchClient<{ items: Vendor[] } | Vendor[]>("/api/v1/vendors/");
            const vendors = Array.isArray(data) ? data : (data.items || []);
            options = vendors.map((v) => v.name);
        } else if (source === "clients") {
            const data = await fetchClient<{ items: User[] } | User[]>("/api/v1/users/");
            const users = Array.isArray(data) ? data : (data.items || []);
            options = users
                .filter((u) => u.roles.some((r) => r.name === "Client"))
                .map((u) => `${u.full_name} (${u.email})`);
        }
        return options;
    } catch (error) {
        console.error(`Failed to fetch remote options for ${source}`, error);
        return [];
    }
  };

  const handleFileUpload = async (file: File, fieldKey: string): Promise<string> => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size too large. Maximum limit is 5MB.");
      throw new Error("File too large");
    }
    
    const formData = new FormData();
    formData.append("file", file);

    const queryParams = new URLSearchParams();
    if (context) {
        queryParams.append("user", context.user_identifier);
        queryParams.append("service_name", context.service_name);
        queryParams.append("service_id", context.service_id.toString());
        queryParams.append("field_name", fieldKey);
    }

    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/files/upload?${queryParams.toString()}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");

    const data = await res.json();
    toast.success("File uploaded successfully");
    return data.url;
  };

  return (
    <GoniaDynamicForm 
      schema={schema}
      onSubmit={onSubmit}
      onValuesChange={onValuesChange}
      submitLabel={submitLabel}
      hideSubmit={hideSubmit}
      defaultValues={initialValues}
      loadRemoteOptions={loadRemoteOptions}
      onFileUpload={handleFileUpload}
      context={context}
      renderField={(field, formField, error) => {
          if (field.type === "phone") {
              return (
                <PhoneInput 
                    value={formField.value || ""} 
                    onChange={formField.onChange} 
                    placeholder={field.placeholder || "1711-000000"}
                    className={error ? "ring-1 ring-destructive/30" : ""}
                />
              );
          }
          return null;
      }}
    />
  );
}
