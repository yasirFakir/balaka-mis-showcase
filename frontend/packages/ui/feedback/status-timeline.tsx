"use client";

import * as React from "react";
import { format } from "date-fns";
import { Circle } from "lucide-react";
import { cn } from "../lib/utils";
import { gonia, GoniaStatusConfig } from "../lib/gonia-theme";
import { GoniaIcons } from "../lib/icon-registry";
import { StatusHistory } from "@/core/types";

interface StatusTimelineProps {
  history: StatusHistory[];
  currentStatus: string;
}

/**
 * Shared Status Timeline component for Gonia UI.
 * Displays a vertical progression of status updates with business icons.
 */
export function StatusTimeline({ history, currentStatus }: StatusTimelineProps) {
  // Sort history by date descending (newest first)
  const sortedHistory = [...history].sort(
    (a, b) => {
        const timeA = new Date(a.changed_at || a.created_at || 0).getTime();
        const timeB = new Date(b.changed_at || b.created_at || 0).getTime();
        return timeB - timeA;
    }
  );

  const getStatusIcon = (status: string) => {
    const theme: GoniaStatusConfig = gonia.statusTheme[status] || {
      color: "bg-primary/10 text-primary",
      label: status,
      icon: "Pending"
    }
    
    const IconComponent = (GoniaIcons as any)[theme.icon] || GoniaIcons.Pending;
    
    return (
        <div className={cn("flex h-6 w-6 items-center justify-center ring-4 ring-white", theme.color)}>
          <IconComponent className={cn("h-3.5 w-3.5", status === "Processing" && "animate-spin-slow")} />
        </div>
    );
  };

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:left-3 before:h-full before:w-px before:bg-primary/10 ml-2">
      {/* Initial Submission */}
      {sortedHistory.length === 0 && (
          <div className="relative pl-10">
              <span className="absolute left-0 flex h-6 w-6 items-center justify-center bg-white border border-primary/20 ring-4 ring-white">
                  <Circle className="h-2.5 w-2.5 text-primary/40" />
              </span>
              <div className="flex flex-col gap-0.5">
                  <span className={cn(gonia.text.label, "m-0")}>Request Submitted</span>
                  <span className={cn(gonia.text.caption, "opacity-60")}>Awaiting administrative review</span>
              </div>
          </div>
      )}

      {sortedHistory.map((event, idx) => (
        <div key={event.id || idx} className="relative pl-10">
          <span className="absolute left-0 flex h-6 w-6 items-center justify-center ring-4 ring-white overflow-hidden">
            {getStatusIcon(event.new_status)}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className={cn(gonia.text.label, "m-0")}>
              Status: <span className="text-primary">{event.new_status}</span>
            </span>
            <div className="flex items-center gap-2">
                <span className={cn(gonia.text.caption, "text-[9px] opacity-40 uppercase font-mono tracking-tighter")}>
                    {format(new Date(event.changed_at || event.created_at || Date.now()), "MMM d, yyyy · HH:mm")}
                </span>
                {event.changed_by && (
                    <>
                        <span className="h-1 w-1 rounded-full bg-primary/20" />
                        <span className={cn(gonia.text.caption, "text-[9px] uppercase font-bold tracking-tight")}>
                            {event.changed_by.full_name || event.changed_by.email}
                        </span>
                    </>
                )}
            </div>
          </div>
        </div>
      ))}
      
      {sortedHistory.length > 0 && (
           <div className="relative pl-10">
                <span className="absolute left-0 flex h-6 w-6 items-center justify-center bg-white border border-primary/20 ring-4 ring-white">
                    <Circle className="h-2.5 w-2.5 text-primary/20" />
                </span>
                <div className="flex flex-col gap-0.5">
                    <span className={cn(gonia.text.label, "m-0 opacity-40")}>Request Created</span>
                    <span className={cn(gonia.text.caption, "opacity-30")}>Initial system record created</span>
                </div>
            </div>
      )}
    </div>
  );
}
