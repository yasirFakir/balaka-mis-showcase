"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"
import { fetchClient, API_URL } from "@/core/api"
import { useWebSocket } from "@/core/hooks/use-web-socket"
import { Notification, User } from "@/core/types"

type EventCallback = (event: string, data: Record<string, any> | string) => void;

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: number | string) => Promise<void>
  markAllRead: () => Promise<void>
  refresh: () => Promise<void>
  activeToasts: Notification[]
  removeToast: (id: string | number) => void
  subscribeToEvents: (callback: EventCallback) => () => void
  toast: {
      success: (title: string, messageOrOptions?: string | { id?: string | number, description?: string }) => void
      error: (title: string, messageOrOptions?: string | { id?: string | number, description?: string }) => void
      info: (title: string, messageOrOptions?: string | { id?: string | number, description?: string }) => void
      loading: (title: string, messageOrOptions?: string | { id?: string | number, description?: string }) => string | number
  }
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children, user }: { children: React.ReactNode; user?: User | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeToasts, setActiveToasts] = useState<Notification[]>([])
  
  // Loop Protection Ref: Immediate bailout for identical rapid-fire toasts
  const lastToastRef = useRef<{ title: string, message: string, time: number } | null>(null);
  const listenersRef = useRef<Set<EventCallback>>(new Set());

  const subscribeToEvents = useCallback((callback: EventCallback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const handleWebSocketMessage = useCallback((event: string, data: any) => {
    listenersRef.current.forEach(callback => callback(event, data));
  }, []);

  // WebSocket Connection
  useWebSocket("/api/v1/events/ws", handleWebSocketMessage);

  const refresh = useCallback(async () => {
    try {
      const response = await fetchClient<{ items: Notification[], total: number } | Notification[]>("/api/v1/notifications/")
      // Handle both flat array (legacy) and ListResponse (new standard)
      const data = Array.isArray(response) ? response : (response.items || []);
      setNotifications(data)
    } catch (error) {
      console.error("Failed to fetch notifications", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Internal listener for notifications

  useEffect(() => {
    const unsubscribe = subscribeToEvents((event, data) => {
      if (event === "new_notification") {
        if (typeof data === "object" && user && data.user_id === user.id) {
            refresh()
            if (data.title) {
                // SUPPRESSION LOGIC: Don't show toast if user is already looking at the relevant page
                const currentPath = window.location.pathname;
                if (data.link && (currentPath === data.link || currentPath.endsWith(data.link))) {
                    console.log("[Sonar] Suppressing redundant notification for active page:", currentPath);
                    return;
                }

                const newToast: Notification = {
                    id: data.id,
                    title: data.title,
                    message: data.message,
                    link: data.link,
                    notification_type: data.type || "system",
                    is_read: false,
                    created_at: data.created_at || new Date().toISOString(),
                    is_transient: false
                };
                setActiveToasts(prev => [...prev, newToast]);
            }
        }
      }
    });
    return unsubscribe;
  }, [user, refresh, subscribeToEvents]);

  const markAsRead = useCallback(async (id: number | string) => {
    if (typeof id === 'string' && id.startsWith('local-')) return;

    try {
      await fetchClient(`/api/v1/notifications/${id}/read`, { method: "PUT" })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (error) {
      console.error("Failed to mark notification as read", error)
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await fetchClient("/api/v1/notifications/read-all", { method: "PUT" })
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (error) {
      console.error("Failed to mark all as read", error)
    }
  }, [])

  const removeToast = useCallback((id: string | number) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // HELPER: Show local transient toast
  const showToast = useCallback((title: string, messageOrOptions?: string | { id?: string | number, description?: string }, type: string = "info") => {
      const id = (typeof messageOrOptions === 'object' && messageOrOptions.id) 
          ? `local-${messageOrOptions.id}-${Math.random().toString(36).substr(2, 9)}` 
          : `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const message = typeof messageOrOptions === 'string' 
          ? messageOrOptions 
          : (messageOrOptions?.description || "");

      // Loop Protection: Avoid identical rapid-fire toasts (Immediate Ref Check)
      const now = Date.now();
      if (lastToastRef.current && 
          lastToastRef.current.title === title && 
          lastToastRef.current.message === message && 
          (now - lastToastRef.current.time < 500)) { // increased to 500ms for safety
          return lastToastRef.current.title; // return title as a dummy ID
      }
      
      // Update Ref immediately before state change
      lastToastRef.current = { title, message, time: now };

      const newToast: Notification = {
          id,
          title,
          message,
          notification_type: type,
          is_read: false,
          created_at: new Date().toISOString(),
          is_transient: true
      };

      setActiveToasts(prev => [...prev, newToast]);
      return id;
  }, []);

  const toastHelpers = React.useMemo(() => ({
      success: (title: string, msg?: any) => { showToast(title, msg, "success"); },
      error: (title: string, msg?: any) => { showToast(title, msg, "error"); },
      info: (title: string, msg?: any) => { showToast(title, msg, "info"); },
      loading: (title: string, msg?: any) => showToast(title, msg, "loading")
  }), [showToast]);

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n) => !n.is_read).length : 0;

  const contextValue = React.useMemo(() => ({ 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllRead, 
    refresh,
    activeToasts,
    removeToast,
    subscribeToEvents,
    toast: toastHelpers
  }), [notifications, unreadCount, loading, markAsRead, markAllRead, refresh, activeToasts, removeToast, subscribeToEvents, toastHelpers]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}