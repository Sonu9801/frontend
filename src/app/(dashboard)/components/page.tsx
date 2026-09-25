"use client";

import React, { useState } from "react";
import { ComponentReportsTab } from "../reports/components/ComponentReportsTab";
import { formatFilterLabel } from "../reports/components/dateFilterUtils";
import { Boxes, Calendar as CalendarIcon, Filter, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ComponentsModulePage() {
  const [selectedPreset, setSelectedPreset] = useState("Last 30 Days");
  const [customMonth, setCustomMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    department: "All",
    status: "All",
    shift: "All"
  });

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === "Custom Month") {
      setDateRange(`Month: ${customMonth}`);
    } else if (preset === "Custom Range") {
      if (startDate && endDate) {
        setDateRange(`Custom: ${startDate} to ${endDate}`);
      } else {
        setDateRange("All Time");
      }
    } else {
      setDateRange(preset);
    }
  };

  const handleCustomMonthChange = (monthVal: string) => {
    setCustomMonth(monthVal);
    if (selectedPreset === "Custom Month") {
      setDateRange(`Month: ${monthVal}`);
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    if (selectedPreset === "Custom Range" && start && end) {
      setDateRange(`Custom: ${start} to ${end}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Top Header */}
      <div className="flex-shrink-0 p-4 md:px-6 md:py-5 border-b border-border bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Components Module</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Track component tasks, worker PWA job assignments & component production logs
                {dateRange !== "All Time" && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    Filter: {formatFilterLabel(dateRange)}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto mt-4 md:mt-0">
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border w-full md:w-auto">
              <CalendarIcon size={16} className="text-muted-foreground shrink-0" />
              <select 
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="bg-transparent text-sm font-medium text-foreground outline-none cursor-pointer flex-1"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
                <option value="Custom Month">Select Month (Custom Month)</option>
                <option value="Custom Range">Custom Date Range</option>
                <option value="All Time">All Time</option>
              </select>

              {selectedPreset === "Custom Month" && (
                <input 
                  type="month"
                  value={customMonth}
                  onChange={(e) => handleCustomMonthChange(e.target.value)}
                  className="bg-background border border-input rounded-md px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                />
              )}

              {selectedPreset === "Custom Range" && (
                <div className="flex items-center gap-1">
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                    className="bg-background border border-input rounded-md px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                    className="bg-background border border-input rounded-md px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" className="gap-2 flex-1 md:flex-none" onClick={handlePrint}>
                <Printer size={16} /> Print
              </Button>
              <Button variant="outline" className="gap-2 flex-1 md:flex-none" onClick={() => setShowFilters(!showFilters)}>
                <Filter size={16} /> Filters
              </Button>
            </div>
          </div>
        </div>
        
        {showFilters && (
          <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Department / Component</span>
              <select 
                className="bg-background border border-input rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[150px] w-full"
                value={filters.department}
                onChange={(e) => setFilters({...filters, department: e.target.value})}
              >
                <option value="All">All Departments</option>
                <option value="Platform">Platform</option>
                <option value="Gate">Gate</option>
                <option value="Aircutter">Aircutter</option>
                <option value="Paint">Paint</option>
                <option value="Model">Model</option>
                <option value="Band">Band</option>
                <option value="Cutting">Cutting</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Status</span>
              <select 
                className="bg-background border border-input rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[150px] w-full"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="All">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="assigned">Assigned</option>
              </select>
            </div>

            <div className="flex items-end w-full sm:w-auto sm:ml-auto">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setFilters({ department: "All", status: "All", shift: "All" })}
                className="text-muted-foreground hover:text-foreground w-full sm:w-auto"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <ComponentReportsTab dateRange={dateRange} filters={filters} />
        </div>
      </div>
    </div>
  );
}
