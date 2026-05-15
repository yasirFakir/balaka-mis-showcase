"use client";

import { useState, useEffect } from "react";
import { 
  Combobox, 
  ComboboxInput, 
  ComboboxContent, 
  ComboboxList, 
  ComboboxItem, 
  ComboboxEmpty,
  ComboboxValue,
  ComboboxTrigger,
  Label,
  LoadingSpinner,
  useNotifications
} from "@/ui";
import { fetchClient } from "@/core/api";
import { User } from "@/core/types";
import { User as UserIcon, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientSelectorProps {
    onSelect: (user: User | null) => void;
    selectedUserId?: number | null;
}

export function ClientSelector({ onSelect, selectedUserId }: ClientSelectorProps) {
    const { toast } = useNotifications();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const response = await fetchClient<{ items: User[] }>(`/api/v1/users/?role=Client&q=${search}&limit=50`);
                setUsers(response.items || []);
                
                if (selectedUserId && !selectedUser) {
                    const found = response.items.find(u => u.id === selectedUserId);
                    if (found) setSelectedUser(found);
                }
            } catch (error) {
                console.error("Failed to fetch clients", error);
                toast.error("Failed to load client directory");
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(() => {
            fetchUsers();
        }, 300);

        return () => clearTimeout(timer);
    }, [search, selectedUserId, toast]);

    const handleSelect = (userId: string | null) => {
        if (!userId) return;
        const user = users.find(u => u.id.toString() === userId) || null;
        setSelectedUser(user);
        onSelect(user);
    };

    return (
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-normal text-primary/60">Target Client / Originator</Label>
            <Combobox 
                value={selectedUser?.id.toString() || ""} 
                onValueChange={handleSelect}
            >
                <div className="relative">
                    <ComboboxInput 
                        placeholder="Search by name, email or phone..." 
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        className="h-12 pl-10 bg-white border-2 border-primary/10 rounded-none focus-within:border-primary/40 transition-all font-bold text-sm"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/30" />
                </div>
                
                <ComboboxContent className="max-h-80 overflow-y-auto">
                    <ComboboxList>
                        {loading && (
                            <div className="p-4 flex justify-center">
                                <LoadingSpinner size="sm" />
                            </div>
                        )}
                        {!loading && users.length === 0 && (
                            <ComboboxEmpty className="p-4 text-center text-xs font-bold text-muted-foreground uppercase">
                                No clients found matching "{search}"
                            </ComboboxEmpty>
                        )}
                        {users.map((user) => (
                            <ComboboxItem 
                                key={user.id} 
                                value={user.id.toString()}
                                className="flex items-center gap-3 p-3 cursor-pointer border-b border-primary/5 last:border-0"
                            >
                                <div className="w-8 h-8 bg-primary/5 flex items-center justify-center border border-primary/10 rounded-none shrink-0">
                                    <UserIcon className="h-4 w-4 text-primary/40" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-black uppercase text-primary truncate">{user.full_name}</span>
                                    <span className="text-[10px] font-mono text-muted-foreground truncate">{user.email}</span>
                                </div>
                                {selectedUser?.id === user.id && (
                                    <Check className="ml-auto h-4 w-4 text-primary" />
                                )}
                            </ComboboxItem>
                        ))}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        </div>
    );
}
