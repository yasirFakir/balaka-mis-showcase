"use client";

import { useEffect, useState } from "react";
import { fetchClient } from "@/core/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, LoadingSpinner, gonia } from "@/ui";



import { ShieldCheck, Search, Plus, Pencil, Shield } from "lucide-react";
import { RoleBuilderDialog } from "@/components/users/role-builder-dialog";



import { cn } from "@/lib/utils";
import { Role } from "@/core/types";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    try {
      const response = await fetchClient<any>("/api/v1/roles/");
      const data = Array.isArray(response) ? response : (response.items || []);
      setRoles(data);
    } catch (error) {
      console.error("Failed to load roles", error);
    } finally {
      setLoading(false);
    }
  }

  const list = Array.isArray(roles) ? roles : [];
  const filtered = list.filter(r => 
    r.name.toLowerCase().includes(filter.toLowerCase()) ||
    r.description?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
      return <LoadingSpinner size="lg" full />;
  }

  return (
    <div className="space-y-10">
      {/* Gonia v1.5 Anchored Header */}
      <div className={gonia.layout.pageHeader}>
        <div className="space-y-1">
            <h1 className={cn(gonia.text.h1, "flex items-center gap-3")}>
                <ShieldCheck className="h-8 w-8" /> System Access Control
            </h1>
            <p className={gonia.text.caption}>
                Define role-based permissions and secure administrative scopes.
            </p>
        </div>
        <RoleBuilderDialog 
            onRoleSaved={loadRoles} 
            trigger={
                <Button className={cn(gonia.button.base, gonia.button.primary, "gap-2")}>
                    <Plus className="h-4 w-4" /> Create New Role
                </Button>
            }
        />
      </div>

      <Card className={cn(gonia.layout.card, "p-0 overflow-hidden bg-white")}>
        <CardHeader className="bg-primary/5 border-b border-primary/10 py-4 px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className={gonia.text.label}>Defined Roles</h2>
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                <Input 
                    placeholder="Search roles..." 
                    className={cn(gonia.input.base, "pl-10 h-9")}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto technical-scrollbar">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-white">
              <TableRow className="border-primary/10 hover:bg-transparent">
                <TableHead className={cn(gonia.text.label, "pl-8 py-4 w-[200px]")}>Role Name</TableHead>
                <TableHead className={gonia.text.label}>Scope Description</TableHead>
                <TableHead className={gonia.text.label}>Active Permissions</TableHead>
                <TableHead className={cn(gonia.text.label, "text-right pr-8")}>Configuration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((role) => (
                <TableRow key={role.id} className="group hover:bg-primary/5 transition-colors border-primary/5">
                  <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-primary/10 rounded-none text-primary">
                            <Shield className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm text-primary uppercase">{role.name}</span>
                      </div>
                  </TableCell>
                  <TableCell className={cn(gonia.text.body, "text-xs text-muted-foreground")}>
                      {role.description}
                  </TableCell>
                  <TableCell>
                      <div className="flex gap-1.5 flex-wrap max-w-md">
                          {role.permissions.slice(0, 4).map(p => (
                              <Badge key={p.id} className={cn(gonia.badge.base, "bg-[var(--gonia-secondary)] text-white px-2 py-0.5 tracking-tighter")}>
                                  {p.slug}
                              </Badge>
                          ))}
                          {role.permissions.length > 4 && (
                              <Badge variant="outline" className="text-[9px] h-5 rounded-none border-primary/20 bg-primary/5 px-2">
                                  +{role.permissions.length - 4} more
                              </Badge>
                          )}
                      </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <RoleBuilderDialog 
                        role={role} 
                        onRoleSaved={loadRoles} 
                        trigger={
                            <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "h-8 px-3 shadow-none")}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Config
                            </Button>
                        }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}