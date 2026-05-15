"use client";

import { useState, useEffect } from "react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent, CardHeader, CardTitle, Badge } from "@/ui";




import { Plus, Trash2, GripVertical, Settings2, Hash } from "lucide-react";

import { cn } from "@/lib/utils";

interface FieldDefinition {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[]; 
  accept?: string;
  source?: string;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

interface SectionDefinition {
  title: string;
  fields: FieldDefinition[];
}

interface FormSchema {
  sections: SectionDefinition[];
}

interface FormBuilderProps {
  value: FormSchema;
  onChange: (schema: FormSchema) => void;
}

const FIELD_TEMPLATES = [
  { id: "text", label: "Short Answer", type: "text" },
  { id: "textarea", label: "Long Description", type: "textarea" },
  { id: "phone", label: "Phone Number", type: "phone" },
  { id: "email", label: "Email Address", type: "email" },
  { id: "passport", label: "Passport Number", type: "passport" },
  { id: "nid", label: "National ID", type: "nid" },
  { id: "iqama", label: "Iqama Number", type: "iqama" },
  { id: "visa_number", label: "Visa Number", type: "visa_number" },
  { id: "date", label: "Date Selector", type: "date" },
  { id: "file", label: "Document Upload", type: "file", accept: ".jpg,.jpeg,.png,.pdf" },
  { id: "select", label: "Dropdown Menu", type: "select", options: ["Option 1", "Option 2"] },
  { id: "checkbox_group", label: "Checklist / Multiple Select", type: "checkbox_group", options: ["Item 1", "Item 2"] },
  { id: "staff_selector", label: "Staff / Agent Selector", type: "select", source: "staff" },
  { id: "vendor_selector", label: "Vendor Selector", type: "select", source: "vendors" },
  { id: "client_selector", label: "Client Selector", type: "select", source: "clients" },
  { id: "number", label: "Numeric Value", type: "number" },
];

export function FormBuilder({ value, onChange }: FormBuilderProps) {
  const sections = value.sections || [];

  const updateParent = (newSections: SectionDefinition[]) => {
    onChange({ sections: newSections });
  };

  const addSection = () => {
    updateParent([...sections, { title: "New Section", fields: [] }]);
  };

  const updateSectionTitle = (idx: number, title: string) => {
    const newSections = [...sections];
    newSections[idx] = { ...newSections[idx], title };
    updateParent(newSections);
  };

  const removeSection = (idx: number) => {
    const newSections = [...sections];
    newSections.splice(idx, 1);
    updateParent(newSections);
  };

  const addField = (sectionIdx: number) => {
    const newSections = [...sections];
    const newFields = [...newSections[sectionIdx].fields, {
      key: `field_${crypto.randomUUID().split('-')[0]}`,
      label: "New Field",
      type: "text",
      required: true,
      validation: {}
    }];
    
    newSections[sectionIdx] = { ...newSections[sectionIdx], fields: newFields };
    updateParent(newSections);
  };

  const applyTemplate = (sectionIdx: number, fieldIdx: number, templateId: string) => {
      const template = FIELD_TEMPLATES.find(t => t.id === templateId);
      if (!template) return;

      updateField(sectionIdx, fieldIdx, {
          type: template.type,
          // Only update label if it's default
          ...(sections[sectionIdx].fields[fieldIdx].label === "New Field" && { label: template.label }),
          accept: (template as any).accept,
          options: (template as any).options,
          source: (template as any).source,
          validation: {} 
      });
  };

  const updateField = (sectionIdx: number, fieldIdx: number, updates: Partial<FieldDefinition>) => {
    const newSections = [...sections];
    const newFields = [...newSections[sectionIdx].fields];
    
    let updatedField = { ...newFields[fieldIdx], ...updates };

    // SYSTEM KEY GENERATION: Automatic, consistent, lowercase
    if (updates.label !== undefined) {
        let baseKey = updates.label.toLowerCase()
            .trim()
            .replace(/\s+/g, "_") // spaces to underscore
            .replace(/[^\w]/g, "") // remove non-alphanumeric except underscore
            .substring(0, 30); // limit length
            
        if (!baseKey) baseKey = "field";
        
        let finalKey = baseKey;
        let count = 1;
        
        // Ensure uniqueness
        const allKeys = newSections.flatMap((s, sI) => 
            s.fields.map((f, fI) => (sI === sectionIdx && fI === fieldIdx) ? null : f.key)
        ).filter(Boolean);

        while (allKeys.includes(finalKey)) {
            finalKey = `${baseKey}_${count}`;
            count++;
        }
        updatedField.key = finalKey;
    }

    newFields[fieldIdx] = updatedField;
    newSections[sectionIdx] = { ...newSections[sectionIdx], fields: newFields };
    
    updateParent(newSections);
  };

  const removeField = (sectionIdx: number, fieldIdx: number) => {
    const newSections = [...sections];
    const newFields = [...newSections[sectionIdx].fields];
    newFields.splice(fieldIdx, 1);
    newSections[sectionIdx] = { ...newSections[sectionIdx], fields: newFields };
    updateParent(newSections);
  };

  return (
    <div className="space-y-10">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="space-y-4">
          <div className="flex items-center gap-4 bg-primary/5 p-3 border-l-4 border-primary">
              <GripVertical className="h-4 w-4 text-primary/40 cursor-move" />
              <div className="flex-1">
                  <Label className="text-[9px] font-black uppercase tracking-normal text-primary/60 mb-1 block">Section Title</Label>
                  <Input 
                    value={section.title} 
                    onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                    className="font-black uppercase tracking-tight text-base border-none p-0 h-auto bg-transparent focus-visible:ring-0 shadow-none" 
                  />
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeSection(sIdx)}>
                  <Trash2 className="h-4 w-4" />
              </Button>
          </div>

          <div className="grid gap-4">
            {section.fields.map((field, fIdx) => (
                <Card key={fIdx} className="rounded-none border-2 shadow-none overflow-hidden group">
                    <CardContent className="p-0">
                        <div className="flex flex-col xl:flex-row items-stretch">
                            {/* LEFT: Display Information */}
                            <div className="flex-1 p-4 md:p-5 space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">
                                        Field Label (Visible to User) <span className="text-destructive">*</span>
                                    </Label>
                                    <Input 
                                        value={field.label} 
                                        onChange={(e) => updateField(sIdx, fIdx, { label: e.target.value })}
                                        className={cn(
                                            "h-11 rounded-none border-2 bg-muted/10 font-bold focus:bg-background transition-all",
                                            !field.label.trim() ? "border-destructive focus-visible:ring-destructive" : "border-border/40"
                                        )}
                                        placeholder="e.g. Passport Number"
                                    />
                                    {!field.label.trim() && (
                                        <span className="text-[9px] font-black uppercase tracking-normal text-destructive animate-in fade-in slide-in-from-top-1">
                                            Label is required
                                        </span>
                                    )}
                                </div>

                                {["select", "checkbox_group"].includes(field.type) && !field.source && (
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                        <Label className="text-[10px] font-black uppercase tracking-normal text-muted-foreground">Options (Comma separated)</Label>
                                        <Input 
                                            placeholder="Item 1, Item 2, Item 3"
                                            value={field.options?.join(",") || ""}
                                            onChange={(e) => updateField(sIdx, fIdx, { options: e.target.value.split(",") })}
                                            className="h-10 text-xs rounded-none border-2 bg-muted/5 font-mono"
                                        />
                                        <p className="text-[8px] text-muted-foreground italic uppercase opacity-60">Separate items with a comma only. Spaces inside items are allowed.</p>
                                    </div>
                                )}

                                {field.source && (
                                    <div className="p-4 bg-primary/5 border border-dashed border-primary/20 rounded-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-normal text-primary">Automated System Sourcing</span>
                                            <span className="text-[11px] font-bold text-primary/60">This field will automatically fetch data from: {field.source.toUpperCase()}</span>
                                        </div>
                                        <Badge className="bg-primary text-white rounded-none uppercase text-[8px] font-black">Dynamic</Badge>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-normal cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={field.required}
                                            className="h-4 w-4 rounded-none border-2 border-primary text-primary focus:ring-primary"
                                            onChange={(e) => updateField(sIdx, fIdx, { required: e.target.checked })}
                                        />
                                        Mandatory Field
                                    </label>
                                    
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 border border-border/40 rounded-sm">
                                        <Hash className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-[9px] font-mono font-bold text-muted-foreground">{field.key}</span>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Type Configuration */}
                            <div className="w-full xl:w-72 bg-muted/20 border-t xl:border-t-0 xl:border-l-2 p-4 md:p-5 flex flex-col justify-between gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-normal text-primary/60 flex items-center gap-1.5">
                                        <Settings2 className="h-3 w-3" /> Field Type
                                    </Label>
                                    <Select 
                                        value={
                                            FIELD_TEMPLATES.find(t => t.type === field.type && (t as any).source === (field as any).source)?.id || 
                                            FIELD_TEMPLATES.find(t => t.type === field.type)?.id || 
                                            field.type
                                        } 
                                        onValueChange={(val) => applyTemplate(sIdx, fIdx, val)}
                                    >
                                        <SelectTrigger className="h-11 rounded-none border-2 border-primary/20 bg-background hover:border-primary/40 transition-all">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none border-2">
                                            {FIELD_TEMPLATES.map(t => (
                                                <SelectItem key={t.id} value={t.id} className="text-xs font-bold uppercase">{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="w-full border-destructive/20 text-destructive hover:bg-destructive hover:border-destructive hover:text-white h-10 rounded-none font-black uppercase tracking-normal text-[10px] transition-all" 
                                    onClick={() => removeField(sIdx, fIdx)}
                                >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove Field
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
            <Button 
                type="button" 
                variant="outline" 
                onClick={() => addField(sIdx)} 
                className="w-full border-2 border-dashed border-primary/20 h-14 font-black uppercase tracking-normal text-[10px] hover:border-primary hover:bg-primary hover:text-white transition-all group"
            >
                <Plus className="mr-2 h-4 w-4 transition-transform group-hover:scale-125" /> 
                Append New Field to {section.title}
            </Button>
          </div>
        </div>
      ))}
      
      <Button 
        type="button" 
        variant="secondary" 
        onClick={addSection} 
        className="w-full h-16 rounded-none border-2 border-primary bg-primary text-white font-black uppercase tracking-normal text-xs shadow-[6px_6px_0_0_var(--gonia-accent)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
      >
        <Plus className="mr-3 h-6 w-6" /> Create New Form Section
      </Button>
    </div>
  );
}