"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchClient } from "@/core/api";
import { User } from "@/core/types";
import { 
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
    LoadingSpinner
} from "@/ui";
import { Check, User as UserIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserSelectProps {
    onSelect: (user: User) => void;
    selectedUserId?: number;
    placeholder?: string;
    className?: string;
}

export function UserSelect({ onSelect, selectedUserId, placeholder = "Select a client...", className }: UserSelectProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    const loadUsers = async (q: string = "") => {
        setLoading(true);
        try {
            const response = await fetchClient<any>(`/api/v1/users/?q=${q}&limit=20`);
            const data = Array.isArray(response) ? response : (response.items || []);
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId), [users, selectedUserId]);

    return (
        <div className={cn("w-full relative", className)}>
            <Combobox 
                value={selectedUserId?.toString()} 
                onValueChange={(val) => {
                    if (!val) return;
                    const user = users.find(u => u.id.toString() === val);
                    if (user) onSelect(user);
                }}
            >
                <ComboboxInput
                    placeholder={placeholder}
                    className="h-12"
                    value={searchValue}
                    onChange={(e) => {
                        const val = e.currentTarget.value;
                        setSearchValue(val);
                        // Optional: trigger loadUsers(val) with debounce
                    }}
                />
                <ComboboxContent>
                    <ComboboxList>
                        {loading && users.length === 0 && (
                            <div className="p-4 flex justify-center">
                                <LoadingSpinner size="sm" />
                            </div>
                        )}
                        {users.map((user) => (
                            <ComboboxItem
                                key={user.id}
                                value={user.id.toString()}
                                className="p-3"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                            {user.full_name.charAt(0)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{user.full_name}</span>
                                            <span className="text-[10px] font-mono text-muted-foreground uppercase">{user.email}</span>
                                        </div>
                                    </div>
                                    {selectedUserId === user.id && <Check className="h-4 w-4 text-primary" />}
                                </div>
                            </ComboboxItem>
                        ))}
                        <ComboboxEmpty>
                            {loading ? "Searching..." : "No clients found."}
                        </ComboboxEmpty>
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        </div>
    );
}