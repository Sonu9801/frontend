"use client";

import React, { useState, useMemo } from "react";
import { Activity, Clock, CheckCircle2, XCircle, Truck, AlertTriangle, UserCog, Filter, Download, Search } from "lucide-react";
import { useActivities, useVehicles, useWorkers } from "@/hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { parseUTCDate } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";

const getEventIcon = (type: string) => {
  switch (type) {
    case "qc_passed":
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case "qc_failed":
      return <XCircle className="w-5 h-5 text-red-500" />;
    case "vehicle_dispatched":
      return <Truck className="w-5 h-5 text-blue-500" />;
    case "emergency_created":
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case "worker_started":
      return <UserCog className="w-5 h-5 text-indigo-500" />;
    default:
      return <Activity className="w-5 h-5 text-muted-foreground" />;
  }
};

const getEventBgColor = (type: string) => {
  switch (type) {
    case "qc_passed": return "bg-emerald-500/10 border-emerald-500/20";
    case "qc_failed": return "bg-red-500/10 border-red-500/20";
    case "vehicle_dispatched": return "bg-blue-500/10 border-blue-500/20";
    case "emergency_created": return "bg-amber-500/10 border-amber-500/20";
    case "worker_started": return "bg-indigo-500/10 border-indigo-500/20";
    default: return "bg-muted border-border";
  }
};

export default function ActivityLogsPage() {
  const { data: activities = [], isLoading: isLoadingActivities } = useActivities();
  const { data: vehiclesData } = useVehicles({ pageSize: 1000 });
  const vehicles = vehiclesData?.items ?? [];
  const { data: workersData } = useWorkers({ pageSize: 1000 });
  const workers = workersData?.items ?? [];

  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredActivities = useMemo(() => {
    return activities
      .filter((activity: any) => {
        if (filter !== "all" && activity.eventType !== filter) return false;
        if (!searchQuery.trim()) return true;
        
        const q = searchQuery.toLowerCase();
        const descMatch = (activity.description || "").toLowerCase().includes(q);
        const typeMatch = (activity.eventType || "").toLowerCase().includes(q);
        
        const vehicle = vehicles.find((v: any) => v.id === activity.vehicleId?.toString());
        const vehicleMatch = vehicle && (vehicle.vehicleNumber?.toLowerCase().includes(q) || vehicle.model?.toLowerCase().includes(q));
        
        const worker = workers.find((w: any) => w.id === activity.workerId?.toString());
        const workerMatch = worker && worker.name?.toLowerCase().includes(q);

        return descMatch || typeMatch || vehicleMatch || workerMatch;
      })
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activities, filter, searchQuery, vehicles, workers]);

  // Key stats
  const totalEvents = activities.length;
  const qcEvents = activities.filter((a: any) => a.eventType === "qc_passed" || a.eventType === "qc_failed").length;
  const dispatchEvents = activities.filter((a: any) => a.eventType === "vehicle_dispatched").length;
  const workerEvents = activities.filter((a: any) => a.eventType === "worker_started" || a.eventType === "stage_changed").length;

  const handleExportCSV = () => {
    if (filteredActivities.length === 0) {
      toast.error("No activities to export");
      return;
    }
    const headers = ["Timestamp", "Event Type", "Description", "Vehicle", "Worker"];
    const rows = filteredActivities.map((act: any) => {
      const v = vehicles.find((x: any) => x.id === act.vehicleId?.toString());
      const w = workers.find((x: any) => x.id === act.workerId?.toString());
      const timeStr = act.timestamp ? format(parseUTCDate(act.timestamp), "yyyy-MM-dd HH:mm:ss") : "";
      return [
        `"${timeStr}"`,
        `"${act.eventType || ""}"`,
        `"${(act.description || "").replace(/"/g, '""')}"`,
        `"${v?.vehicleNumber || act.vehicleId || ""}"`,
        `"${w?.name || act.workerId || ""}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activity_logs_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Activity logs exported successfully");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-5 border-b border-border bg-card">
        <PageHeader
          title="Activity Logs"
          subtitle="System-wide audit trail, stage transitions, and operational events"
          actions={
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search logs, vehicle, worker..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm bg-muted/40"
                />
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 rounded-lg border border-border flex-1 sm:flex-initial">
                <Filter size={14} className="text-muted-foreground shrink-0" />
                <select 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-transparent text-xs md:text-sm font-medium text-foreground outline-none cursor-pointer w-full sm:w-auto"
                >
                  <option value="all">All Events</option>
                  <option value="qc_passed">QC Passed</option>
                  <option value="qc_failed">QC Failed</option>
                  <option value="vehicle_dispatched">Dispatches</option>
                  <option value="stage_changed">Stage Changes</option>
                  <option value="worker_started">Worker Activities</option>
                </select>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV}
                className="gap-1.5 flex-1 sm:flex-initial h-9"
              >
                <Download size={14} /> Export CSV
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex-1 p-3 sm:p-6 overflow-y-auto pb-24 md:pb-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Executive KPI Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-sm">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Recorded Logs</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalEvents}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Chronological system events</p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-sm">
              <p className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Quality Audits</p>
              <p className="text-2xl font-bold text-foreground mt-1">{qcEvents}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Pass & fail inspections</p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-sm">
              <p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 tracking-wider">Dispatches</p>
              <p className="text-2xl font-bold text-foreground mt-1">{dispatchEvents}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Finished logistics movements</p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-sm">
              <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Stage & Worker Actions</p>
              <p className="text-2xl font-bold text-foreground mt-1">{workerEvents}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Assembly line transitions</p>
            </div>
          </div>

          {isLoadingActivities ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-border bg-card">
                  <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-12 bg-card border border-border rounded-xl">
              <EmptyState
                icon={Activity}
                title="No activities found"
                description={searchQuery ? "No activities matched your search criteria." : "There are no recorded activities matching your current filter criteria."}
              />
            </div>
          ) : (
            <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {filteredActivities.map((activity: any) => {
                const vehicle = vehicles.find((v: any) => v.id === activity.vehicleId?.toString());
                const worker = workers.find((w: any) => w.id === activity.workerId?.toString());
                
                return (
                  <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Icon */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${getEventBgColor(activity.eventType)}`}>
                      {getEventIcon(activity.eventType)}
                    </div>
                    
                    {/* Content */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {activity.eventType.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {format(parseUTCDate(activity.timestamp), "MMM d, yyyy h:mm a")}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground">{activity.description}</p>
                      
                      {(vehicle || worker) && (
                        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                          {vehicle && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                              Vehicle: <strong className="ml-1 text-foreground">{vehicle.vehicleNumber}</strong>
                            </span>
                          )}
                          {worker && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                              Worker: <strong className="ml-1 text-foreground">{worker.name}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

