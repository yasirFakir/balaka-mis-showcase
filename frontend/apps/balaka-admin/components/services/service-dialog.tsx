"use client";

import { useState } from "react";
import { 
  Button, 
  GoniaResponsiveDialog,
  Input, 
  Label, 
  Textarea, 
  useNotifications, 
  GONIA_INPUT_CLASSES, 
  GoniaCurrencyInput,
  gonia
} from "@/ui";




import { fetchClient } from "@/core/api";

import { Plus, Globe, Lock, ShieldAlert, Tag, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

const SERVICE_TAGS = [
    "Ticket Service",
    "Cargo Service",
    "Hajj & Umrah",
    "Passport & Visa",
    "Documents",
    "General Service"
];

interface ServiceDefinition {
  id?: number;
  name: string;
  slug: string;
  category?: string;
  tags: string[];
  base_price: number;
  description?: string;
  form_schema?: any;
  is_active?: boolean;
  is_public: boolean;
  is_available?: boolean;
}

interface SavedServiceDefinition extends ServiceDefinition {
    id: number;
    is_available: boolean;
    is_active: boolean;
}

interface ServiceDialogProps {
  onServiceSaved: (service: SavedServiceDefinition) => void;
  trigger?: React.ReactNode;
}

export function ServiceDialog({ onServiceSaved, trigger }: ServiceDialogProps) {
  const { toast } = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["General Service"]);
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const toggleTag = (tag: string) => {
      setSelectedTags(prev => 
        prev.includes(tag) 
            ? prev.filter(t => t !== tag) 
            : [...prev, tag]
      );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTags.length === 0) {
        toast.error("Please select at least one tag");
        return;
    }
    setLoading(true);

    try {
      const defaultSchema = { sections: [{ title: "Application Details", fields: [] }] };

      const payload = {
        name,
        slug,
        category: selectedTags[0], // Keep category as first tag for backward compatibility
        tags: selectedTags,
        base_price: price,
        description,
        form_schema: defaultSchema,
        is_active: true,
        is_public: isPublic
      };

      const savedService = await fetchClient<SavedServiceDefinition>("/api/v1/services/", {
          method: "POST",
          body: JSON.stringify(payload)
      });

      onServiceSaved(savedService);
      toast.success("Service created! Redirecting to editor...");
      setOpen(false);
      
      setName("");
      setSlug("");
      setSelectedTags(["General Service"]);
      setPrice(0);
      setDescription("");
      setIsPublic(true);

      router.push(`/services/${savedService.id}`);

    } catch (error: any) {
      toast.error(error.message || "Failed to create service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {trigger ? (
          <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
          <Button 
            onClick={() => setOpen(true)}
            className="h-10 rounded-none font-bold uppercase tracking-normal text-[11px] gap-2 shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
              <Plus className="h-4 w-4" /> Create Service
          </Button>
      )}

      <GoniaResponsiveDialog
        isOpen={open}
        onOpenChange={setOpen}
        title="New Service Definition"
        description="Define basic parameters // Set global visibility"
        maxWidth="lg"
        footer={
          <Button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="w-full h-12 rounded-none font-black uppercase tracking-normal text-xs shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none transition-all"
          >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
              Create Service & Launch Editor
          </Button>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="name" className="text-[11px] font-semibold tracking-tight text-muted-foreground">Service Name</Label>
            <Input 
                id="name" 
                value={name} 
                onChange={(e) => {
                    const newName = e.target.value;
                    setName(newName);
                    setSlug(newName.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]/g, ""));
                }} 
                className={GONIA_INPUT_CLASSES}
                placeholder="e.g. Family Visa"
                required 
            />
          </div>

          <div className="space-y-2.5">
            <Label className="text-[11px] font-semibold tracking-tight text-muted-foreground flex items-center gap-2">
                <Tag className="h-3 w-3" /> Service Tags (Select Multiple)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border border-border/40 bg-white/50">
                {SERVICE_TAGS.map(tag => (
                    <label key={tag} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={selectedTags.includes(tag)}
                            onChange={() => toggleTag(tag)}
                            className="h-4 w-4 rounded-none border-2 border-primary text-primary focus:ring-primary"
                        />
                        <span className={`text-[10px] font-bold uppercase transition-colors ${selectedTags.includes(tag) ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-muted-foreground'}`}>
                            {tag}
                        </span>
                    </label>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-[11px] font-semibold tracking-tight text-muted-foreground">Base Price</Label>
                <div className="relative">
                    <GoniaCurrencyInput 
                        id="price" 
                        value={price} 
                        onChange={setPrice} 
                        className={cn(GONIA_INPUT_CLASSES, "font-mono pl-12")}
                        required 
                    />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug" className="text-[11px] font-semibold tracking-tight text-muted-foreground">URL Slug</Label>
                <Input id="slug" value={slug} readOnly className={cn(GONIA_INPUT_CLASSES, "font-mono text-[10px] border-dashed opacity-60 cursor-not-allowed")} />
              </div>
          </div>

          <div className="space-y-1.5 text-left">
            <Label htmlFor="description" className="text-[11px] font-semibold tracking-tight text-muted-foreground">Description</Label>
            <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className={cn(GONIA_INPUT_CLASSES, "resize-none min-h-[80px] pt-2")}
                placeholder="Briefly describe the service for clients..."
            />
          </div>

          <div className="pt-2">
              <label className="flex items-center gap-4 p-4 bg-white border border-border/40 cursor-pointer group hover:border-primary/30 transition-all text-left">
                  <input 
                    type="checkbox" 
                    checked={isPublic} 
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-5 w-5 rounded-none border-2 border-primary text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                      <div className="flex items-center gap-2">
                          {isPublic ? <Globe className="h-3.5 w-3.5 text-emerald-600" /> : <Lock className="h-3.5 w-3.5 text-destructive" />}
                          <span className="text-[11px] font-bold uppercase tracking-tight">
                              {isPublic ? "Public Service" : "Private / Internal Operation"}
                          </span>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium mt-0.5 leading-normal">
                          {isPublic ? "Visible to all clients in the public catalog." : "Hidden from clients. Only accessible via Internal Operations Hub."}
                      </p>
                  </div>
              </label>
          </div>
        </form>
      </GoniaResponsiveDialog>
    </>
  );
}
