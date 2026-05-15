"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useNotifications, gonia } from "@/ui";





import { fetchClient } from "@/core/api";

import { Store, Loader2, Plus, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";


interface CreateVendorDialogProps {
  onVendorCreated: () => void;
  trigger?: React.ReactNode;
}

export function CreateVendorDialog({ onVendorCreated, trigger }: CreateVendorDialogProps) {
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "EXTERNAL",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchClient("/api/v1/vendors/", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      toast.success("Account created successfully");
      onVendorCreated();
      setOpen(false);
      setFormData({ name: "", type: "EXTERNAL", contact_person: "", phone: "", email: "", address: "" });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Failed to create account";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
            <Button className={cn(gonia.button.base, gonia.button.primary, "gap-2")}>
                <Plus className="h-4 w-4" /> Add Account
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-none border-2 border-primary bg-white">
        <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <DialogTitle className={gonia.text.h2}>Register New Account</DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-[var(--gonia-canvas)]">
          <div className="space-y-2">
            <Label className={gonia.text.label}>Account Category</Label>
            <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v })}
            >
                <SelectTrigger className={gonia.input.base}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2">
                    <SelectItem value="EXTERNAL" className="text-xs font-bold uppercase">External Supplier / Airline</SelectItem>
                    <SelectItem value="INTERNAL" className="text-xs font-bold uppercase">Internal Cost Center</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={gonia.text.label}>Official Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={formData.type === "EXTERNAL" ? "e.g. Saudi Airlines" : "e.g. Office Petty Cash"}
              className={gonia.input.base}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className={gonia.text.label}>Contact Person</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Full Name"
                className={gonia.input.base}
              />
            </div>
            <div className="space-y-2">
              <Label className={gonia.text.label}>Contact Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+966..."
                className={gonia.input.base}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className={gonia.text.label}>Email Address</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="accounts@company.com"
              className={gonia.input.base}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-primary/10">
            <Button 
              type="submit"
              disabled={loading} 
              className="w-full h-12 rounded-none font-black uppercase tracking-normal shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Save Vendor Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}