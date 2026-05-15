"use client";

import { useEffect, useRef, useCallback } from "react";
import { API_URL } from "../api";

type WebSocketMessage = {
  event: string;
  data: any;
};

export function useWebSocket(
  endpoint: string,
  onMessage: (event: string, data: any) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Keep callback ref fresh
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    // Cleanup existing
    if (wsRef.current) {
      wsRef.current.close();
    }

    const token = localStorage.getItem("token")?.replace(/["']/g, "").trim();
    
    // Construct WS URL
    // Handle both absolute (http -> ws) and relative paths
    let wsUrl = endpoint;
    if (!endpoint.startsWith("ws")) {
        const baseUrl = API_URL.replace("http", "ws");
        wsUrl = `${baseUrl}${endpoint}`;
    }
    
    // Append Token
    if (token) {
        const separator = wsUrl.includes("?") ? "&" : "?";
        wsUrl = `${wsUrl}${separator}token=${token}`;
    }

    console.log(`[WebSocket] Connecting to ${endpoint}...`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[WebSocket] Connected`);
      // Start Heartbeat
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, 25000); // 25s keepalive
    };

    ws.onmessage = (event) => {
      if (event.data === "pong") return; // Ignore heartbeats
      
      try {
        const parsed: WebSocketMessage = JSON.parse(event.data);
        onMessageRef.current(parsed.event, parsed.data);
      } catch (e) {
        console.warn("[WebSocket] Failed to parse message:", event.data);
      }
    };

    ws.onclose = (event) => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      
      if (isMountedRef.current) {
        console.log(`[WebSocket] Disconnected (Code: ${event.code}). Reconnecting in 3s...`);
        // Simple 3s reconnect strategy (can be exponential if needed)
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
      ws.close(); // Force close to trigger onclose logic
    };

  }, [endpoint]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [connect]);
}
