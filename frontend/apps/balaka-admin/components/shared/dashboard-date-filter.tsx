"use client";

import * as React from "react";
import { subDays, startOfMonth, endOfMonth } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker } from "@/ui";
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react";


interface DateFilterProps {
  onFilterChange: (start: Date | null, end: Date | null) => void;
}

export function DashboardDateFilter({ onFilterChange }: DateFilterProps) {
  const [range, setRange] = React.useState("30d");
  
  const [startDate, setStartDate] = React.useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());

  const handleRangeChange = (val: string) => {
    setRange(val);
    const now = new Date();
    
    let start: Date | null = null;
    let end: Date | null = now;

    switch (val) {
        case "7d":
            start = subDays(now, 7);
            break;
        case "30d":
            start = subDays(now, 30);
            break;
        case "90d":
            start = subDays(now, 90);
            break;
        case "month":
            start = startOfMonth(now);
            end = endOfMonth(now);
            break;
        case "all":
            start = null;
            end = null;
            break;
        case "custom":
            return;
    }
    
    setStartDate(start || undefined);
    setEndDate(end || undefined);
    onFilterChange(start, end);
  };

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
      setRange("custom");
      
      let s = startDate;
      let e = endDate;

      if (type === 'start') {
        setStartDate(date);
        s = date;
      } else {
        setEndDate(date);
        e = date;
      }
      
      onFilterChange(s || null, e || null);
  };

    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <div className="flex items-center w-full sm:w-auto">
                  <Select value={range} onValueChange={handleRangeChange}>
                      <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-none bg-white border-2 border-primary/10 hover:border-primary/40 transition-colors">
                          <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5 text-primary/40" />
                      <SelectValue placeholder="Period..." />
                  </div>
              </SelectTrigger>
              <SelectContent className="rounded-none border-2">
                  <SelectItem value="7d" className="text-[10px] font-bold uppercase">Last 7 Days</SelectItem>
                  <SelectItem value="30d" className="text-[10px] font-bold uppercase">Last 30 Days</SelectItem>
                  <SelectItem value="90d" className="text-[10px] font-bold uppercase">Last 3 Months</SelectItem>
                  <SelectItem value="month" className="text-[10px] font-bold uppercase">This Month</SelectItem>
                  <SelectItem value="custom" className="text-[10px] font-bold uppercase">Custom Range</SelectItem>
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Time</SelectItem>
              </SelectContent>
          </Select>
        </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                  <DatePicker 
                    date={startDate}
                    setDate={(date) => handleDateChange('start', date)}
                    className="flex-1 md:w-[180px] h-10 rounded-none border-2 border-primary/10"
                    placeholder="Start"
                  />
                  <div className="flex justify-center shrink-0">
                      <ArrowRight className="h-4 w-4 text-primary/40" />
                  </div>
                  <DatePicker 
                    date={endDate}
                    setDate={(date) => handleDateChange('end', date)}
                    className="flex-1 md:w-[180px] h-10 rounded-none border-2 border-primary/10"
                    placeholder="End"
                  />
              </div>
      </div>
    );

  }

  