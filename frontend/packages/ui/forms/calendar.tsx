"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "../lib/utils"
import { buttonVariants } from "../base/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-white", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4 relative",
        month_caption: "flex justify-center items-center h-10 relative mb-2 w-full mt-0",
        caption_label: "text-sm font-black uppercase tracking-normal text-primary z-0",
        nav: "absolute top-4 left-4 sm:left-5 right-4 sm:right-5 h-10 flex items-center justify-between px-1 z-20 pointer-events-none",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "h-7 w-7 bg-white p-0 opacity-100 rounded-none border-2 border-primary/20 hover:border-primary hover:bg-primary text-primary pointer-events-auto transition-all"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "h-7 w-7 bg-white p-0 opacity-100 rounded-none border-2 border-primary/20 hover:border-primary hover:bg-primary text-primary pointer-events-auto transition-all"
        ),
        month_grid: "w-full border-collapse relative z-0",
        weekdays: "flex w-full mb-2",
        weekday: "text-muted-foreground w-8 sm:w-9 font-black text-[10px] uppercase tracking-tighter flex-1 flex items-center justify-center",
        week: "flex w-full mt-1",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 flex items-center justify-center",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 sm:h-9 sm:w-9 p-0 font-bold rounded-none hover:bg-primary hover:text-white border border-transparent transition-all text-[10px] sm:text-xs w-full"
        ),
        selected: "bg-[var(--gonia-secondary-pale)]! text-black! hover:bg-[var(--gonia-secondary-pale)]! hover:text-black! focus:bg-[var(--gonia-secondary-pale)]! focus:text-black!",
        today: "bg-primary/10! text-primary! font-black",
        outside: "day-outside text-muted-foreground/30 opacity-50 pointer-events-none",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className="h-4 w-4 stroke-[3px]" />;
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }