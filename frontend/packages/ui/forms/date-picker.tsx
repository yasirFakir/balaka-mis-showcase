"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "../base/button"
import { Calendar } from "../forms/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../layout/popover"
import { GONIA_INPUT_CLASSES } from "./gonia-field"

export interface DatePickerProps {
  date?: Date
  setDate: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  disablePastDates?: boolean
}

export function DatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  className,
  disabled = false,
  disablePastDates = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            GONIA_INPUT_CLASSES,
            "w-full justify-start text-left font-normal px-3",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
          {date ? format(date, "PPP") : <span className="text-xs uppercase tracking-wider font-bold opacity-60">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-none border-2" align="center" sideOffset={8}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            setDate(selectedDate)
            setOpen(false)
          }}
          disabled={disablePastDates ? { before: new Date() } : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
