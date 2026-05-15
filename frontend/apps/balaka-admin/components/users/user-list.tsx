"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchClient } from "@/core/api";
import { useGoniaDirectory } from "@/core/hooks/use-gonia-directory";
import { 
  Badge, 
  Button, 
  GoniaCard, 
  GoniaCardHeader, 
  GoniaContainer, 
  GoniaStack, 
  H2, 
  GoniaDataTable, 
  Column, 
  LoadingSpinner, 
  useNotifications, 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger, 
  gonia,
  Input,
  GoniaIcons,
  GoniaFilter,
  GoniaFilterCheckbox,
  GoniaFilterSection
} from "@/ui";
import { Trash2, Search, Pencil, User as UserIcon, ShieldAlert } from "lucide-react";

import { User } from "@/core/types";
import { useAuth } from "@/lib/auth-context";

import { EditUserDialog } from "./edit-user-dialog";

import { SecureImage } from "../shared/secure-image";
import { cn } from "@/lib/utils";


interface UserListProps {
    roleFilter?: "Client" | "Staff";
}

export function UserList({ roleFilter }: UserListProps) {
  const { hasPermission } = useAuth();
  const { toast } = useNotifications();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(roleFilter ? [roleFilter] : ["All"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Use useMemo for filters
  const filters = useMemo(() => ({
    role: selectedRoles.includes("All") ? undefined : selectedRoles[0] // API expects string for now, simplistic
  }), [selectedRoles]);

  const { 
    data: users, 
    total,
    summary,
    loading, 
    page,
    setPage,
    limit,
    refresh,
    removeItem, 
    updateItem 
  } = useGoniaDirectory<User, { stats: any }>({
    endpoint: "/api/v1/users/",
    // No client-side filter needed as we use server-side
    onError: () => toast.error("Failed to load user directory"),
    search: debouncedSearch,
    filters
  });
  
  const stats = summary?.stats || { all: 0, clients: 0, staff: 0 };

  const handleUserUpdated = (updatedUser: User) => {
    updateItem(updatedUser);
  };

  const handleDeleteUser = async (userId: number) => {
      try {
          await fetchClient(`/api/v1/users/${userId}`, {
              method: "DELETE",
          });
          // Wait slightly for backend to commit mutation
          refresh(500);
          toast.success("Account deactivated successfully");
      } catch (error) {
          toast.error("Failed to deactivate account");
      }
  };
  
  const toggleRole = (role: string) => {
     // Single select behavior for roles simplified
     if (role === "All") setSelectedRoles(["All"]);
     else setSelectedRoles([role]);
  };

  const columns: Column<User>[] = [
    {
      id: "id",
      header: "ID",
      accessorKey: "id",
      className: "w-[80px] pl-8 text-primary/40 font-mono",
      cell: (user: User) => `#${user.id.toString().padStart(4, '0')}`
    },
    {
      id: "profile",
      header: "Profile / Information",
      accessorKey: "full_name",
      cell: (user: User) => (
        <div className="flex items-center gap-4 py-1">
          <div className="w-10 h-10 rounded-none border-2 border-primary/10 flex items-center justify-center bg-primary/5 overflow-hidden shrink-0">
            {user.profile_picture ? (
              <SecureImage src={user.profile_picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-primary/20" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-primary uppercase tracking-tight">{user.full_name || "N/A"}</span>
            <span className="text-[11px] opacity-40 uppercase font-mono">{user.email}</span>
          </div>
        </div>
      )
    },
    {
      id: "phone",
      header: "Phone Number",
      accessorKey: "phone_number",
      className: "font-mono text-xs font-bold text-primary/60"
    },
    {
      id: "roles",
      header: "Assigned Roles",
      cell: (user: User) => {
        const displayRoles = user.is_superuser 
          ? user.roles?.filter(r => r.name !== "Admin")
          : user.roles;

        return (
          <div className="flex gap-1.5 flex-wrap">
            {user.is_superuser && (
              <Badge className={cn(gonia.badge.base, "bg-primary text-white border-primary")}>
                Super Account
              </Badge>
            )}
            {displayRoles?.map(role => (
              <Badge key={role.id} className={cn(gonia.badge.base, "bg-secondary text-white")}>
                {role.name}
              </Badge>
            ))}
          </div>
        );
      }
    },
    {
      id: "status",
      header: "Status",
      cell: (user: User) => (
        <Badge className={cn(gonia.badge.base, user.is_active ? "bg-emerald-600" : "bg-destructive", "text-white")}>
          {user.is_active ? "Active" : "Inactive"}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right pr-8",
      cell: (user: User) => (
        <div className="flex justify-end gap-3">
          {hasPermission("users.manage") && (
            <EditUserDialog 
              user={user} 
              onUserUpdated={handleUserUpdated}
              allowRoleEdit={roleFilter === "Staff" || selectedRoles.includes("Staff")}
              trigger={
                <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "h-8 px-2 text-primary/60 hover:bg-primary hover:text-white shadow-none transition-all")}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              }
            />
          )}
          {hasPermission("users.manage") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "h-8 px-2 border-destructive/30 text-destructive/60 hover:bg-destructive hover:border-destructive hover:text-white shadow-none transition-all")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-none border-2 border-primary bg-white shadow-none">
                <AlertDialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="h-6 w-6 text-destructive" />
                    <AlertDialogTitle className={gonia.text.h2}>Account Deactivation</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription className={gonia.text.body}>
                    You are about to deactivate this account. The user will lose all access to the system immediately.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6">
                  <AlertDialogCancel className={cn(gonia.button.base, gonia.button.outline, "mt-0")}>Abort</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className={cn(gonia.button.base, gonia.button.destructive)}>
                    Deactivate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )
    }
  ];
  
  const hasActiveFilters = !selectedRoles.includes("All");
  const activeCount = hasActiveFilters ? selectedRoles.length : 0;

  if (loading && !users.length) {
    return <LoadingSpinner size="lg" full />;
  }

  return (
    <GoniaCard>
      <GoniaCardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <H2>
             Directory: {selectedRoles.includes("Staff") ? "Staff" : selectedRoles.includes("Client") ? "Clients" : "All Users"}
            </H2>
            
            <div className="flex items-center gap-2">
                 {/* Search Input */}
                <div className="relative w-full md:w-64">
                    <GoniaIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-none border-primary/20 focus:border-primary/40 bg-white shadow-none w-full"
                    />
                </div>

                {/* Filter Button (Unified) */}
                <GoniaFilter 
                  activeCount={activeCount}
                  onReset={() => toggleRole("All")}
                  title="Filter by Role"
                >
                  <GoniaFilterSection title="Account Roles" />
                  <GoniaFilterCheckbox 
                    label="All Users" 
                    value="All" 
                    count={stats.all || 0} 
                    checked={selectedRoles.includes("All")}
                    onChange={toggleRole}
                  />
                  <div className="h-px bg-primary/10 my-1" />
                  <GoniaFilterCheckbox 
                    label="Clients" 
                    value="Client" 
                    count={stats.clients || 0} 
                    checked={selectedRoles.includes("Client")}
                    onChange={toggleRole}
                  />
                  <GoniaFilterCheckbox 
                    label="Staff Members" 
                    value="Staff" 
                    count={stats.staff || 0} 
                    checked={selectedRoles.includes("Staff")}
                    onChange={toggleRole}
                  />
                </GoniaFilter>
            </div>
        </div>
      </GoniaCardHeader>
      <div className="p-6">
        <GoniaDataTable 
          data={users} 
          columns={columns} 
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          searchable={false}
          isLoading={loading}
          renderMobileCard={(user) => (
            <div className="flex flex-col gap-4 relative">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-none border-2 border-primary/10 flex items-center justify-center bg-primary/5 overflow-hidden shrink-0">
                    {user.profile_picture ? (
                      <SecureImage src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-primary/20" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-black text-sm text-primary uppercase tracking-tight truncate">{user.full_name || "N/A"}</span>
                    <span className="text-[10px] font-mono font-bold text-primary/40 truncate">{user.email}</span>
                  </div>
                </div>
                <Badge className={cn("h-5 text-[8px] px-1.5 py-0 uppercase font-black rounded-none", user.is_active ? "bg-emerald-600" : "bg-destructive")}>
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-primary/5">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black uppercase text-primary/30 tracking-widest">ID Reference</span>
                  <span className="text-[11px] font-mono font-black text-primary/60">#{user.id.toString().padStart(4, '0')}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black uppercase text-primary/30 tracking-widest">Contact Signal</span>
                  <span className="text-[11px] font-mono font-black text-primary/60 truncate">{user.phone_number || "NO SIGNAL"}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {user.is_superuser && (
                  <Badge className="h-5 bg-primary/10 text-primary border border-primary/20 rounded-none text-[8px] font-black uppercase px-1.5">
                    Super Account
                  </Badge>
                )}
                {(user.is_superuser ? user.roles?.filter(r => r.name !== "Admin") : user.roles)?.map(role => (
                  <Badge key={role.id} className="h-5 bg-secondary/10 text-secondary border border-secondary/20 rounded-none text-[8px] font-black uppercase px-1.5">
                    {role.name}
                  </Badge>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {hasPermission("users.manage") && (
                  <>
                    <EditUserDialog 
                      user={user} 
                      onUserUpdated={handleUserUpdated}
                      allowRoleEdit={roleFilter === "Staff" || selectedRoles.includes("Staff")}
                      trigger={
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-none border-primary/20 text-primary/60 hover:bg-primary hover:text-white shadow-none transition-all">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-none border-destructive/20 text-destructive/60 hover:bg-destructive hover:border-destructive hover:text-white shadow-none transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-none border-2 border-primary bg-white shadow-none">
                        <AlertDialogHeader>
                          <div className="flex items-center gap-3 mb-2">
                            <ShieldAlert className="h-6 w-6 text-destructive" />
                            <AlertDialogTitle className={gonia.text.h2}>Account Deactivation</AlertDialogTitle>
                          </div>
                          <AlertDialogDescription className={gonia.text.body}>
                            You are about to deactivate this account. The user will lose all access to the system immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6">
                          <AlertDialogCancel className={cn(gonia.button.base, gonia.button.outline, "mt-0")}>Abort</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className={cn(gonia.button.base, gonia.button.destructive)}>
                            Deactivate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          )}
        />
      </div>
    </GoniaCard>
  );
}
