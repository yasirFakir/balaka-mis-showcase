"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, FileCode, UploadCloud, Plus, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { gonia } from "../lib/gonia-theme";

import { 
  Form, 
  GoniaField,
  GONIA_INPUT_CLASSES, 
  GONIA_ERROR_CLASSES 
} from "../forms";
import { Button } from "../base/button";
import { Input } from "../forms/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../forms/select";
import { DatePicker } from "../forms/date-picker";

import { 
  generateZodSchema
} from "../lib/form-validation";
import { FormSchema } from "../lib/form-types";

// We'll define a standard type for remote option loaders
export type RemoteOptionLoader = (source: string) => Promise<string[]>;

export interface GoniaDynamicFormProps {
  schema: FormSchema;
  onSubmit: (data: any) => Promise<void>;
  onValuesChange?: (data: any) => void;
  submitLabel?: string;
  defaultValues?: any;
  /**
   * Optional custom field renderer for specific types or keys.
   */
  renderField?: (field: any, formField: any, error: any) => React.ReactNode;
  /**
   * Function to load options for fields with a 'source' property.
   */
  loadRemoteOptions?: RemoteOptionLoader;
  /**
   * Custom file upload handler.
   */
  onFileUpload?: (file: File, fieldKey: string) => Promise<string>;
  /**
   * Additional form footer content (replaces default submit button if provided)
   */
  footer?: (form: any) => React.ReactNode;
  /**
   * If true, hides the default submit button entirely.
   */
  hideSubmit?: boolean;
  /**
   * Application context (e.g. internal vs client)
   */
  context?: {
    user_identifier: string;
    [key: string]: any;
  };
  className?: string;
}

/**
 * A standardized, responsive dynamic form engine for Gonia.
 */
export function GoniaDynamicForm({ 
  schema, 
  onSubmit, 
  onValuesChange, 
  submitLabel = "Submit", 
  defaultValues: initialValues,
  renderField,
  loadRemoteOptions,
  onFileUpload,
  footer,
  hideSubmit,
  context,
  className
}: GoniaDynamicFormProps) {
  const [uploadingFiles, setUploadingFiles] = React.useState<Record<string, boolean>>({});
  const [remoteOptions, setRemoteOptions] = React.useState<Record<string, string[]>>({});

  const { schema: formSchema, defaultValues: schemaDefaults } = generateZodSchema(schema, context?.user_identifier === "internal");

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues || schemaDefaults,
    mode: "onChange",
  });

  const watchedValues = form.watch();

  // Load Remote Options
  React.useEffect(() => {
    if (!loadRemoteOptions) return;

    const fetchAllRemoteOptions = async () => {
        const newRemoteOptions: Record<string, string[]> = {};
        for (const section of schema.sections) {
            for (const field of section.fields) {
                if (field.source) {
                    try {
                        const options = await loadRemoteOptions(field.source);
                        newRemoteOptions[field.key] = options;
                    } catch (error) {
                        console.error(`Failed to fetch remote options for ${field.source}`, error);
                    }
                }
            }
        }
        setRemoteOptions(newRemoteOptions);
    };

    fetchAllRemoteOptions();
  }, [schema, loadRemoteOptions]);

  // AUTO-COUNT LOGIC: Automatically update ${key}_count when ${key} (list) changes
  React.useEffect(() => {
    let hasChanged = false;
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.type === "list") {
          const countKey = `${field.key}_count`;
          const currentList = watchedValues[field.key] || [];
          const currentCount = watchedValues[countKey];
          
          if (currentCount !== currentList.length) {
            form.setValue(countKey, currentList.length, { shouldDirty: true, shouldTouch: true });
            hasChanged = true;
          }
        }
      });
    });
    // Trigger onValuesChange if we programmatically updated counts
    if (hasChanged && onValuesChange) {
        onValuesChange(form.getValues());
    }
  }, [watchedValues, schema, form, onValuesChange]);

  // Handle value changes
  React.useEffect(() => {
    const subscription = form.watch((value) => {
        if (onValuesChange) {
            onValuesChange(value);
        }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, onValuesChange]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
    const file = e.target.files?.[0];
    if (!file || !onFileUpload) return;

    setUploadingFiles((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      const url = await onFileUpload(file, fieldKey);
      form.setValue(fieldKey, url);
    } catch (error) {
      console.error("File upload failed", error);
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-8", className)}>
        {schema.sections.map((section, idx) => (
          <div key={idx} className="space-y-6">
            {section.title && (
              <h3 className="text-[10px] font-black uppercase tracking-normal text-primary border-b-2 border-primary/10 pb-2">
                {section.title}
              </h3>
            )}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              {section.fields.map((field) => {
                // Conditional Logic Check
                let isHidden = false;
                let isDisabled = !!field.read_only;

                if (field.conditions) {
                  for (const condition of field.conditions) {
                    const dependentValue = watchedValues[condition.depend_on];
                    const met = dependentValue === condition.value;
                    
                    if (condition.action === "hide" && met) {
                      isHidden = true;
                    }
                    if (condition.action === "disable" && met) {
                      isDisabled = true;
                    }
                  }
                }

                // Admin Only restriction
                const isSystemManaged = field.admin_only && context?.user_identifier !== "internal";
                if (isSystemManaged) {
                    isDisabled = true;
                }

                if (isHidden) return null;

                const displayLabel = isSystemManaged 
                    ? `${field.label} (System Managed / সিস্টেম দ্বারা পূরণ করা হবে)` 
                    : field.label;

                return (
                  <GoniaField
                    key={field.key}
                    control={form.control}
                    name={field.key}
                    label={displayLabel}
                    required={isSystemManaged ? false : field.required}
                    className={cn(
                        field.type === "list" && "md:col-span-2",
                        isSystemManaged && "opacity-80"
                    )}
                  >
                    {({ field: formField, error }) => {
                      // Check if there's a custom renderer
                      if (renderField) {
                        const custom = renderField(field, formField, error);
                        if (custom) return custom;
                      }

                      // SPECIAL CASE: Read-only "System Fields" (like counts)
                      // We render these as non-input visual elements
                      if (field.read_only) {
                        return (
                          <div className="h-11 w-full bg-primary/5 flex items-center justify-between px-4 border-l-4 border-primary/20 pointer-events-none select-none">
                            <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest italic">Calculated Value</span>
                            <span className="text-sm font-black text-primary font-mono bg-white px-2 py-0.5 border border-primary/10 shadow-sm">
                                {formField.value ?? "0"}
                            </span>
                          </div>
                        );
                      }

                      const finalDisabled = isDisabled || formField.disabled;
                      const adminOnlyClasses = isSystemManaged ? "bg-muted/30 border-dashed border-primary/20 cursor-not-allowed font-mono italic text-[10px]" : "";

                      return (
                        <div className="w-full">
                          {field.type === "select" ? (
                            <Select onValueChange={formField.onChange} value={formField.value} disabled={finalDisabled}>
                              <SelectTrigger className={cn(GONIA_INPUT_CLASSES, adminOnlyClasses, error && GONIA_ERROR_CLASSES)}>
                                <SelectValue placeholder={isSystemManaged ? "Data pending admin entry" : `Select ${field.label}`} />
                              </SelectTrigger>
                              <SelectContent className="rounded-none border-2">
                                {(remoteOptions[field.key] || field.options || []).map((opt: string, i: number) => (
                                  <SelectItem key={`${opt}-${i}`} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === "year" ? (
                            <Select onValueChange={formField.onChange} value={formField.value} disabled={finalDisabled}>
                              <SelectTrigger className={cn(GONIA_INPUT_CLASSES, adminOnlyClasses, error && GONIA_ERROR_CLASSES)}>
                                <SelectValue placeholder={isSystemManaged ? "System Year" : `Select ${field.label}`} />
                              </SelectTrigger>
                              <SelectContent className="rounded-none border-2">
                                {Array.from({ length: 11 }, (_, i) => {
                                  const year = (new Date().getFullYear() - 5 + i).toString();
                                  return (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          ) : field.type === "checkbox" ? (
                            <label className={cn(
                                "flex items-center gap-3 p-3 bg-white border border-primary/10 transition-all",
                                isSystemManaged ? "bg-muted/10 border-dashed cursor-not-allowed" : "cursor-pointer group hover:border-primary/30",
                                finalDisabled && !isSystemManaged && "opacity-50 cursor-not-allowed grayscale"
                            )}>
                                <input 
                                    type="checkbox"
                                    checked={!!formField.value}
                                    onChange={(e) => formField.onChange(e.target.checked)}
                                    disabled={finalDisabled}
                                    className="h-5 w-5 rounded-none border-2 border-primary text-primary focus:ring-primary"
                                />
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-normal transition-colors",
                                    isSystemManaged ? "text-primary/40" : "text-primary/60 group-hover:text-primary"
                                )}>
                                    {displayLabel}
                                </span>
                            </label>
                          ) : field.type === "list" ? (
                            <div className="space-y-3">
                                {isSystemManaged && (formField.value || []).length === 0 && (
                                    <div className="p-4 border-2 border-dashed border-primary/10 bg-muted/5 text-center">
                                        <p className="text-[10px] font-black uppercase text-primary/30 italic">
                                            List entries will be populated by system during processing
                                        </p>
                                    </div>
                                )}
                                {(formField.value || []).map((val: string, index: number) => (
                                    <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-left-1">
                                        <Input 
                                            value={val}
                                            onChange={(e) => {
                                                const newList = [...formField.value];
                                                newList[index] = e.target.value;
                                                formField.onChange(newList);
                                            }}
                                            placeholder={`${field.label} #${index + 1}`}
                                            className={cn(GONIA_INPUT_CLASSES, adminOnlyClasses, "flex-1")}
                                            disabled={finalDisabled}
                                        />
                                        {!isSystemManaged && (
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => {
                                                    const newList = formField.value.filter((_: any, i: number) => i !== index);
                                                    formField.onChange(newList);
                                                }}
                                                className="h-10 w-10 text-destructive hover:bg-destructive/10 border border-destructive/10"
                                                disabled={finalDisabled}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {!isSystemManaged && (
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={() => formField.onChange([...(formField.value || []), ""])}
                                        className="h-10 border-dashed border-2 gap-2 text-[10px] font-black uppercase tracking-wider w-full md:w-auto"
                                        disabled={finalDisabled}
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add {field.label}
                                    </Button>
                                )}
                            </div>
                          ) : field.type === "checkbox_group" ? (
                            <div className={cn(
                                "grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white border border-primary/10",
                                isSystemManaged && "bg-muted/5 border-dashed",
                                finalDisabled && !isSystemManaged && "opacity-50 pointer-events-none"
                            )}>
                                {(remoteOptions[field.key] || field.options || []).map((opt: string) => (
                                    <label key={opt} className={cn("flex items-center gap-2", isSystemManaged ? "cursor-not-allowed opacity-60" : "cursor-pointer group")}>
                                        <input 
                                            type="checkbox"
                                            checked={(formField.value || []).includes(opt)}
                                            onChange={(e) => {
                                                const current = formField.value || [];
                                                const next = e.target.checked 
                                                    ? [...current, opt]
                                                    : current.filter((v: string) => v !== opt);
                                                formField.onChange(next);
                                            }}
                                            disabled={finalDisabled}
                                            className="h-4 w-4 rounded-none border-2 border-primary text-primary focus:ring-primary"
                                        />
                                        <span className={cn("text-[10px] font-bold uppercase tracking-tight transition-colors", !isSystemManaged && "group-hover:text-primary")}>{opt}</span>
                                    </label>
                                ))}
                            </div>
                          ) : field.type === "file" ? (
                            <div className="space-y-2 w-full">
                                {formField.value && typeof formField.value === 'string' && (
                                    <div className="flex items-center gap-2 p-2 bg-primary/5 border-l-4 border-primary/20 mb-2">
                                        <FileCode className="h-3.5 w-3.5 text-primary/40" />
                                        <span className="text-[10px] font-mono font-black text-primary truncate">
                                            {formField.value.split('/').pop()}
                                        </span>
                                    </div>
                                )}
                                <div className="relative w-full">
                                    <Input 
                                      type="file" 
                                      className={cn(
                                          GONIA_INPUT_CLASSES, 
                                          isSystemManaged ? "bg-muted/30 border-dashed cursor-not-allowed text-transparent" : "cursor-pointer",
                                          gonia.input.file,
                                          error && GONIA_ERROR_CLASSES
                                      )}
                                      onChange={(e) => handleFileChange(e, field.key)}
                                      disabled={finalDisabled || uploadingFiles[field.key]}
                                    />
                                    {isSystemManaged && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="text-[9px] font-black uppercase text-primary/20">Secured Document Field</span>
                                        </div>
                                    )}
                                    {uploadingFiles[field.key] && (
                                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                                            <Loader2 className="animate-spin h-4 w-4" />
                                        </div>
                                    )}
                                    <input type="hidden" {...formField} value={formField.value ?? ""} />
                                </div>
                            </div>
                          ) : field.type === "date" ? (
                            <DatePicker
                              date={formField.value}
                              setDate={formField.onChange}
                              placeholder={isSystemManaged ? "Date Set by System" : `Pick ${field.label}`}
                              className={cn(GONIA_INPUT_CLASSES, adminOnlyClasses, "w-full", error && GONIA_ERROR_CLASSES)}
                              disabled={finalDisabled}
                            />
                          ) : (
                            <Input 
                              type={field.type} 
                              placeholder={isSystemManaged ? "System will provide this data" : (field.placeholder || field.label)} 
                              {...formField} 
                              value={formField.value ?? ""}
                              className={cn(GONIA_INPUT_CLASSES, adminOnlyClasses, error && GONIA_ERROR_CLASSES)}
                              disabled={finalDisabled}
                            />
                          )}
                        </div>
                      );
                    }}
                  </GoniaField>
                );
              })}
            </div>
          </div>
        ))}
        
        {footer ? footer(form) : !hideSubmit && (
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting} 
            className={cn(gonia.button.base, gonia.button.primary, "w-full h-12 text-xs")}
          >
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        )}
      </form>
    </Form>
  );
}