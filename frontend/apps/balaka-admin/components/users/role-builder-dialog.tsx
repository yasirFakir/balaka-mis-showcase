"use client";

import { useState, useEffect } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, useNotifications, Card, CardContent, CardHeader, CardTitle, gonia } from "@/ui";



import { fetchClient } from "@/core/api";

import { Plus, ShieldCheck, Loader2, Key } from "lucide-react";

import { cn } from "@/lib/utils";

import { Role, Permission } from "@/core/types";

interface RoleBuilderDialogProps {
  role?: Role;
  onRoleSaved: () => void;
  trigger?: React.ReactNode;
}

const permissionLabels: Record<string, string> = {
    "view": "See Info",
    "view_all": "See Everything",
    "manage": "Edit Info",
    "process_technical": "Work on Requests",
    "approve_business": "Approve Requests",
    "finalize": "Finish Request",
    "view_ledger": "See Money History",
    "manage_transactions": "Manage Money",
    "settle_staff": "Pay Staff",
    "view_reports": "See Reports",
    "export_ledger": "Download Data",
    "manage_catalog": "Edit Service List",
    "view_private": "See Private Services",
    "view_manifest": "See Cargo List",
    "manage_manifest": "Edit Cargo List",
    "update_tracking": "Update Tracking",
    "receive_items": "Receive Items",
    "backup": "Save Backup",
    "restore": "Restore Backup",
    "configure": "Settings",
    "reset": "Clear Everything"
};

export function RoleBuilderDialog({ role, onRoleSaved, trigger }: RoleBuilderDialogProps) {
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);

  useEffect(() => {
    if (open) {
        loadPermissions();
        if (role) {
            setName(role.name);
            setDescription(role.description || "");
            setSelectedPermIds(role.permissions.map(p => p.id));
        } else {
            setName("");
            setDescription("");
            setSelectedPermIds([]);
        }
    }
  }, [open, role]);

  async function loadPermissions() {
    try {
      const response = await fetchClient<{ items: Permission[] } | Permission[]>("/api/v1/roles/permissions");
      const data = Array.isArray(response) ? response : (response.items || []);
      setAllPermissions(data);
    } catch (error) {
      console.error("Failed to load permissions", error);
    }
  }

  const handleTogglePerm = (id: number) => {
      setSelectedPermIds(prev => 
          prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      );
  };

  const handleSelectModule = (module: string, select: boolean) => {
      const modulePermIds = allPermissions.filter(p => p.module === module).map(p => p.id);
      if (select) {
          setSelectedPermIds(prev => Array.from(new Set([...prev, ...modulePermIds])));
      } else {
          setSelectedPermIds(prev => prev.filter(id => !modulePermIds.includes(id)));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
        toast.error("Role name is required");
        return;
    }
    setLoading(true);

    try {
      const payload = {
          name,
          description,
          permission_ids: selectedPermIds
      };

      if (role && role.id) {
          await fetchClient(`/api/v1/roles/${role.id}`, {
              method: "PUT",
              body: JSON.stringify(payload)
          });
      } else {
          await fetchClient("/api/v1/roles/", {
              method: "POST",
              body: JSON.stringify(payload)
          });
      }

      onRoleSaved();
      toast.success(`Role ${role ? "updated" : "created"} successfully`);
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save role");
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = allPermissions.reduce((acc, perm) => {
      const module = perm.module || "General";
      if (!acc[module]) acc[module] = [];
      acc[module].push(perm);
      return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
            <Button className={cn(gonia.button.base, gonia.button.primary, "gap-2")}>
                <Plus className="h-4 w-4" /> Create Role
            </Button>
        )}
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[900px] p-0 overflow-hidden rounded-none border-2 border-primary bg-white shadow-2xl"
        closeClassName="text-white opacity-100 hover:text-white/80"
      >
        <DialogHeader className="p-8 bg-primary text-white border-b-4 border-[var(--gonia-accent)]">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 border border-white/20">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight leading-none">
                    {role ? "Edit Role" : "New System Role"}
                </DialogTitle>
                <DialogDescription className="text-white/60 font-mono text-[10px] uppercase font-bold tracking-widest">
                    Manage permissions and access levels
                </DialogDescription>
              </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-[var(--gonia-canvas)] max-h-[75vh] overflow-y-auto technical-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className={cn(gonia.text.label, "text-primary/40")}>Role Name</Label>
                <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className={cn(gonia.input.base, "h-12 text-lg uppercase")}
                    placeholder="e.g. Manager"
                    required 
                />
              </div>
              <div className="space-y-2">
                <Label className={cn(gonia.text.label, "text-primary/40")}>Description</Label>
                <Input 
                    id="desc" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className={cn(gonia.input.base, "h-12")}
                    placeholder="What is this role responsible for?"
                />
              </div>
          </div>

          <div className="p-6 bg-white text-primary border-2 border-[var(--gonia-accent)] flex items-start gap-4">
              <ShieldCheck className="h-6 w-6 shrink-0 mt-1 text-[var(--gonia-accent)]" />
              <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-widest">How Scoping Works</h4>
                  <p className="text-[10px] text-primary/70 leading-relaxed font-bold uppercase tracking-tight">
                      Permissions set <strong>WHAT ACTIONS</strong> a person can do. The <strong>SERVICE SCOPE</strong> (set in Staff Management) defines <strong>WHICH SERVICES</strong> they can see. A Manager with access to all financials will still only see Umrah data if their scope is limited to Umrah.
                  </p>
              </div>
          </div>

          <div className="space-y-6">
              <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-primary/10" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/40">Permission Matrix</h3>
                  <div className="h-px flex-1 bg-primary/10" />
              </div>

              <div className="columns-1 md:col-count-2 lg:columns-2 gap-6 space-y-6">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <Card key={module} className="break-inside-avoid rounded-none border-2 border-primary/10 shadow-none hover:border-primary/30 transition-all bg-white">
                          <CardHeader className="py-3 px-4 bg-primary/5 border-b border-primary/10">
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                      <Key className="h-3 w-3 text-primary/40" />
                                      <CardTitle className="text-[10px] font-black uppercase text-primary tracking-normal">{module}</CardTitle>
                                  </div>
                                  <div className="flex gap-3 text-[8px] font-black uppercase">
                                      <span 
                                        className="cursor-pointer text-primary/40 hover:text-primary transition-colors"
                                        onClick={() => handleSelectModule(module, true)}
                                      >Select All</span>
                                      <span 
                                        className="cursor-pointer text-destructive/40 hover:text-destructive transition-colors"
                                        onClick={() => handleSelectModule(module, false)}
                                      >Clear</span>
                                  </div>
                              </div>
                          </CardHeader>
                          <CardContent className="py-4 px-4 space-y-4">
                              {perms.map(perm => (
                                  <div key={perm.id} className="flex items-start space-x-3 group">
                                      <input 
                                        type="checkbox" 
                                        id={`perm-${perm.id}`}
                                        className="mt-0.5 h-4 w-4 rounded-none border-2 border-primary/20 text-primary focus:ring-primary cursor-pointer accent-primary"
                                        checked={selectedPermIds.includes(perm.id)}
                                        onChange={() => handleTogglePerm(perm.id)}
                                      />
                                      <div className="grid gap-0.5">
                                          <label htmlFor={`perm-${perm.id}`} className="text-[10px] font-black leading-none cursor-pointer uppercase tracking-tight group-hover:text-primary transition-colors">
                                              {permissionLabels[perm.slug.split('.')[1]] || perm.slug.split('.')[1].replace('_', ' ')}
                                          </label>
                                          <p className="text-[9px] text-muted-foreground font-bold leading-tight opacity-60 group-hover:opacity-100 transition-opacity">{perm.description}</p>
                                      </div>
                                  </div>
                              ))}
                          </CardContent>
                      </Card>
                  ))}
              </div>
          </div>

          <DialogFooter className="pt-8 border-t border-primary/10 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase text-muted-foreground hidden sm:block">
                Updates will take effect immediately.
            </p>
            <Button type="submit" disabled={loading} className={cn(gonia.button.base, gonia.button.primary, "h-14 px-10 text-xs shadow-[6px_6px_0_0_var(--gonia-accent)] hover:shadow-none translate-x-[-3px] translate-y-[-3px] active:translate-x-0 active:translate-y-0")}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ShieldCheck className="h-4 w-4 mr-2" /> Save Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}