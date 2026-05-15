"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchClient } from "@/core/api";
import { useRouter } from "next/navigation";
import { User } from "@/core/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  imageKey: number;
  login: (token: string, mustChangePassword?: boolean) => Promise<void>;
  logout: () => void;
  hasPermission: (slug: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageKey, setImageKey] = useState(Date.now());
  const router = useRouter();

  const logout = useCallback((reason: "logout" | "session_expired" = "logout") => {
    localStorage.removeItem("token");
    if (typeof window !== "undefined") {
      sessionStorage.setItem("auth-reason", reason);
    }
    setUser(null);
    router.push("/auth");
  }, [router]);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || token === "undefined" || token === "null") return;

    try {
      const userData = await fetchClient<User>("/api/v1/users/me", { token });
      setUser(userData);
      setImageKey(Date.now());
    } catch (error) {
      console.error("Failed to refresh user", error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const token = localStorage.getItem("token");
      
      // Sanity check for token validity
      if (!token || token === "undefined" || token === "null" || token.length < 10) {
        if (token === "undefined" || token === "null") {
          localStorage.removeItem("token");
        }
        setLoading(false);
        return;
      }

      try {
        const userData = await fetchClient<User>("/api/v1/users/me", { token });
        if (isMounted) {
          setUser(userData);
        }
      } catch (error: any) {
        console.error("Failed to load user", error);
        if (isMounted) {
          // Only remove token if it's explicitly an auth error (SESSION_EXPIRED)
          if (error.message === "SESSION_EXPIRED") {
            localStorage.removeItem("token");
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadUser();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleExpiry = () => {
      // Only trigger if we actually have a token to remove
      if (localStorage.getItem("token")) {
        logout("session_expired");
      }
    };

    window.addEventListener("auth:session-expired", handleExpiry);
    return () => window.removeEventListener("auth:session-expired", handleExpiry);
  }, [logout]);

  const login = async (token: string, mustChangePassword = false) => {
    localStorage.setItem("token", token);
    try {
        const userData = await fetchClient<User>("/api/v1/users/me", { token });
        
        // Security Check: Ensure only Staff/Admin can enter the Admin panel
        const isClientOnly = userData.roles.every(r => r.name === "Client");
        if (isClientOnly && !userData.is_superuser) {
            localStorage.removeItem("token");
            throw new Error("ACCESS_DENIED_CLIENT: This portal is for staff only. Please use the client portal at airbalakatravel.com");
        }

        setUser(userData);
        
        if (mustChangePassword) {
            router.push("/profile?reset=true");
        } else {
            router.push("/");
        }
    } catch (error) {
        console.error("Login failed during user fetch", error);
        localStorage.removeItem("token");
        throw error;
    }
  };

  const hasPermission = useCallback((slug: string) => {
      if (!user) return false;
      if (user.is_superuser) return true;
      
      const isAdmin = user.roles.some(role => role.name === "Admin");
      if (isAdmin) return true;
      
      return user.roles.some(role => role.permissions.some(p => p.slug === slug));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, imageKey, login, logout, hasPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
