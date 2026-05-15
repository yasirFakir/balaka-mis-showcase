"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Label, useNotifications } from "@/ui";


import { fetchClient } from "@/core/api";
import { Role } from "@/core/types";
import { User } from "@/core/types";

import { Settings2, Loader2, ShieldCheck } from "lucide-react";

interface RoleManagementDialogProps {
  user: User;
  onUserUpdated: (updatedUser: User) => void;
  trigger?: React.ReactNode;
}

export function RoleManagementDialog({ user, onUserUpdated, trigger }: RoleManagementDialogProps) {
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadRoles();
      setSelectedRoleIds(user.roles.map(r => r.id));
    }
  }, [open, user]);

  async function loadRoles() {
    setLoading(true);
    try {
      const response = await fetchClient<{ items: Role[] } | Role[]>("/api/v1/roles/");
      // Handle both flat array and enveloped response { items, total }
      const data = Array.isArray(response) ? response : (response.items || []);
      setAvailableRoles(data);
    } catch (error) {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }

  const handleToggleRole = (roleId: number) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId) 
        : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = await fetchClient<User>(`/api/v1/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ role_ids: selectedRoleIds })
      });
      
      onUserUpdated(updatedUser);
      toast.success("User roles updated successfully");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to update roles");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Manage</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Assign roles to {user.full_name || user.email}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {loading ? (
            <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {availableRoles.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`role-${role.id}`}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => handleToggleRole(role.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={`role-${role.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {role.name}
                    </label>
                    {role.description && (
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}