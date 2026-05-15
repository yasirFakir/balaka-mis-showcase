"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Terminal, Trash2, Power, Play, Search, ShieldCheck } from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { API_URL } from "@/core/api";
import { useWebSocket } from "@/core/hooks/use-web-socket";

interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Gonia Technical Terminal
 * A high-precision system console for real-time log streaming.
 */
export function GoniaTerminal() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isActive, setIsActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWebSocketMessage = useCallback((event: string, data: any) => {
    setIsActive(true);
    if (event === "log" && data.timestamp) {
        setLogs(prev => [...prev, data as LogEntry].slice(-100));
    }
  }, []);

  // Secure WebSocket Connection
  useWebSocket("/api/v1/system/lab/ws", handleWebSocketMessage);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "ERROR": return "text-red-500";
      case "WARNING": return "text-amber-500";
      case "SUCCESS": return "text-emerald-500";
      default: return "text-blue-400";
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-[var(--gonia-ink)] border-2 border-primary/20 font-mono overflow-hidden shadow-2xl relative">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border-b border-primary/20 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-normal text-primary">System Activity Log</span>
          {isActive && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-2" />}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLogs([])}
            className="text-primary/40 hover:text-destructive transition-colors"
            title="Clear Buffer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <div className={cn("flex items-center gap-2 px-3 py-1 text-[9px] font-black uppercase tracking-normal", 
              isActive ? "text-emerald-500" : "text-primary/40")}>
            <Power className="h-3 w-3" />
            {isActive ? "Connected" : "Standby"}
          </div>
        </div>
      </div>

      {/* Terminal Body */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-primary/20"
      >
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-2">
            <ShieldCheck className="h-12 w-12" />
            <p className="text-[10px] uppercase tracking-normal font-black">System Idle // Waiting for activity</p>
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="text-[11px] leading-relaxed group border-l border-transparent hover:border-primary/20 hover:bg-white/5 pl-2 transition-all">
            <span className="text-white/30 mr-2">[{format(new Date(log.timestamp), "HH:mm:ss")}]</span>
            <span className={cn("font-black mr-2", getLevelColor(log.level))}>{log.level}</span>
            <span className="text-primary/60 font-bold mr-2 uppercase">[{log.module}]</span>
            <span className="text-white/80">{log.message}</span>
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <span className="text-white/20 ml-2 italic text-[10px]">
                {JSON.stringify(log.metadata)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Terminal Footer */}
      <div className="p-2 bg-black/40 border-t border-primary/10 flex items-center gap-2 shrink-0">
        <Play className="h-3 w-3 text-primary/40" />
        <span className="text-[9px] text-primary/40 uppercase font-black tracking-normal italic animate-pulse">
          {isActive ? "Log Active: Streaming system events" : "Log Inactive: Connection closed"}
        </span>
      </div>
    </div>
  );
}