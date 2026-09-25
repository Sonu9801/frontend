"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { componentsApi, jobsApi } from "@/lib/api";
import { useWorkers } from "@/hooks/useQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Download, FileText, Eye, Image as ImageIcon, Search, User, Boxes, RotateCcw, X, Filter } from "lucide-react";
import { isDateInFilterRange } from "./dateFilterUtils";
import { exportToCSV, exportToExcel, exportToPDF } from "./exportUtils";

interface ComponentReportsTabProps {
  dateRange?: string;
  filters?: any;
}

const parseDate = (dateRaw?: string | null) => {
  if (!dateRaw) return null;
  let str = String(dateRaw).trim();
  str = str.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/, "$1T$2");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    str += "Z";
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (dateRaw?: string | null) => {
  const d = parseDate(dateRaw);
  return d ? d.toLocaleString() : "-";
};

export function ComponentReportsTab({ dateRange = "All Time", filters }: ComponentReportsTabProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

  // Local filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("All");
  const [selectedComponentType, setSelectedComponentType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const { data: allComponents = [], isLoading: isLoadingComponents } = useQuery({
    queryKey: ["allComponents"],
    queryFn: async () => {
      return await componentsApi.getAllTasks();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: allJobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ["allJobs"],
    queryFn: async () => {
      return await jobsApi.getAll();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: workersData } = useWorkers({ pageSize: 1000 });

  const isLoading = isLoadingComponents || isLoadingJobs;

  // Combine component tasks and production jobs
  const combinedItems = useMemo(() => {
    const compList = Array.isArray(allComponents)
      ? allComponents
      : (allComponents as any)?.items || (allComponents as any)?.data || [];

    const jobsList = Array.isArray(allJobs)
      ? allJobs
      : (allJobs as any)?.items || (allJobs as any)?.data || [];

    const normComponents = compList.map((c: any) => ({
      id: `comp-${c.id}`,
      component_type: c.component_type,
      component_number: c.component_number,
      status: c.status || "in_progress",
      workers: c.workers || [],
      start_time: c.start_time || c.created_at,
      end_time: c.end_time,
      photo_proof_url: c.photo_proof_url,
      source: "Self-Task"
    }));

    const normJobs = jobsList.map((j: any) => {
      let photoUrl = j.photo_proof_url;
      if (!photoUrl && j.photos && j.photos.length > 0) {
        photoUrl = j.photos[j.photos.length - 1].photo_url;
      }
      const vehicleNum = j.vehicle
        ? (j.vehicle.vehicle_number || j.vehicle.chassis_number || j.vehicle.platform_number || `PF-${j.vehicle_id}`)
        : `Job #${j.id}`;

      const stageCapitalized = j.stage ? (j.stage.charAt(0).toUpperCase() + j.stage.slice(1)) : "Production Job";

      return {
        id: `job-${j.id}`,
        component_type: stageCapitalized,
        component_number: vehicleNum,
        status: j.status || "assigned",
        workers: j.workers || [],
        start_time: j.start_time || j.assigned_date,
        end_time: j.end_time,
        photo_proof_url: photoUrl,
        source: "Assigned Job"
      };
    });

    return [...normComponents, ...normJobs];
  }, [allComponents, allJobs]);

  // Registered Workers List for filter dropdown
  const allRegisteredWorkers = useMemo(() => {
    const list = workersData?.items ?? (Array.isArray(workersData) ? workersData : []);
    const names = new Set<string>();
    list.forEach((w: any) => {
      if (w.name) names.add(w.name);
    });
    combinedItems.forEach((item: any) => {
      if (Array.isArray(item.workers)) {
        item.workers.forEach((w: any) => {
          if (w.name) names.add(w.name);
        });
      }
    });
    return Array.from(names).sort();
  }, [workersData, combinedItems]);

  // Component Types / Stages for filter dropdown
  const allComponentTypes = useMemo(() => {
    const defaultStages = ["Platform", "Gate", "Aircutter", "Paint", "Model", "Band", "Cutting", "Chassis", "Assembly"];
    const set = new Set<string>(defaultStages);
    combinedItems.forEach((item: any) => {
      if (item.component_type) set.add(item.component_type);
    });
    return Array.from(set).sort();
  }, [combinedItems]);

  // Filter components by dateRange, global filters, and local search/dropdown filters
  const filteredComponents = useMemo(() => {
    if (!combinedItems || !Array.isArray(combinedItems)) return [];

    // Effective filter values (merging parent filters if present)
    const effWorker = selectedWorker !== "All"
      ? selectedWorker
      : (filters?.workerName && filters.workerName !== "All" ? filters.workerName : (filters?.worker && filters.worker !== "All" ? filters.worker : "All"));

    const effCompType = selectedComponentType !== "All"
      ? selectedComponentType
      : (filters?.componentType && filters.componentType !== "All" ? filters.componentType : (filters?.department && filters.department !== "All" ? filters.department : "All"));

    const effStatus = selectedStatus !== "All"
      ? selectedStatus
      : (filters?.status && filters.status !== "All" ? filters.status : "All");

    const effSearch = (searchQuery || filters?.searchQuery || "").trim().toLowerCase();

    return combinedItems.filter((comp: any) => {
      // 1. Date Range Filtering
      const compDateRaw = comp.start_time || comp.end_time;
      if (!isDateInFilterRange(compDateRaw, dateRange)) {
        return false;
      }

      // 2. Status filter
      if (effStatus !== "All") {
        if (comp.status?.toLowerCase() !== effStatus.toLowerCase()) return false;
      }

      // 3. Component Type / Stage filter (component-wise)
      if (effCompType !== "All") {
        const typeMatch = comp.component_type?.toLowerCase() === effCompType.toLowerCase() ||
                          comp.workers?.some((w: any) => w.department?.toLowerCase() === effCompType.toLowerCase());
        if (!typeMatch) return false;
      }

      // 4. Worker Name filter (worker-wise)
      if (effWorker !== "All") {
        const workerMatch = comp.workers?.some((w: any) => 
          (w.name && w.name.toLowerCase() === effWorker.toLowerCase()) ||
          (w.id && String(w.id) === String(effWorker))
        );
        if (!workerMatch) return false;
      }

      // 5. Search Query (matches Component Number/ID, Type, Worker Name, Status, Source)
      if (effSearch) {
        const compNum = (comp.component_number || "").toLowerCase();
        const compType = (comp.component_type || "").toLowerCase();
        const workerNames = (comp.workers || []).map((w: any) => (w.name || "").toLowerCase()).join(" ");
        const statusStr = (comp.status || "").toLowerCase();
        const sourceStr = (comp.source || "").toLowerCase();

        const match = compNum.includes(effSearch) ||
                      compType.includes(effSearch) ||
                      workerNames.includes(effSearch) ||
                      statusStr.includes(effSearch) ||
                      sourceStr.includes(effSearch);
        if (!match) return false;
      }

      return true;
    });
  }, [combinedItems, dateRange, filters, selectedWorker, selectedComponentType, selectedStatus, searchQuery]);

  const hasActiveFilters = searchQuery !== "" || selectedWorker !== "All" || selectedComponentType !== "All" || selectedStatus !== "All";

  const resetLocalFilters = () => {
    setSearchQuery("");
    setSelectedWorker("All");
    setSelectedComponentType("All");
    setSelectedStatus("All");
  };

  const headers = ["Type", "Number/ID", "Status", "Workers", "Start Time", "End Time", "Source"];
  
  const tableData = useMemo(() => {
    return filteredComponents.map((c: any) => ({
      Type: c.component_type,
      "Number/ID": c.component_number,
      Status: c.status?.replace("_", " "),
      Workers: c.workers?.map((w: any) => w.name).join(", ") || "-",
      "Start Time": formatDate(c.start_time),
      "End Time": formatDate(c.end_time),
      Source: c.source
    }));
  }, [filteredComponents]);

  const handleExport = (type: "csv" | "excel" | "pdf") => {
    const filename = `Component_Production_Report_${dateRange.replace(/\s+/g, '_')}`;
    if (type === "csv") exportToCSV(filename, headers, tableData);
    else if (type === "excel") exportToExcel(filename, headers, tableData);
    else exportToPDF(filename, "Component Production Report", headers, tableData, { dateRange, summary: "Combined Component & Worker PWA Production Report." });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Controls for Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-bold text-lg text-foreground">Component Production Analytics</h2>
          <p className="text-xs text-muted-foreground">Showing records for: <span className="font-semibold text-primary">{dateRange}</span> ({filteredComponents.length} items)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download size={14} className="mr-1.5" /> CSV
          </Button>

          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <Download size={14} className="mr-1.5" /> Excel
          </Button>

          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <FileText size={14} className="mr-1.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Embedded Worker & Component Filter Controls */}
      <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-primary" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Filter Log (Worker-wise & Component-wise)
            </span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetLocalFilters}
              className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Worker Name Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <User size={12} className="text-primary" /> Worker Name
            </label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium cursor-pointer"
            >
              <option value="All">All Workers</option>
              {allRegisteredWorkers.map((wName: string) => (
                <option key={wName} value={wName}>
                  {wName}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Component Type / Stage Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Boxes size={12} className="text-primary" /> Component / Stage
            </label>
            <select
              value={selectedComponentType}
              onChange={(e) => setSelectedComponentType(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium cursor-pointer"
            >
              <option value="All">All Component Types</option>
              {allComponentTypes.map((type: string) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Status Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="assigned">Assigned</option>
            </select>
          </div>

          {/* 4. Text Search Query */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Search Component / ID</label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search ID, worker, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border bg-card">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Total Components & Jobs</h3>
            <p className="text-3xl font-bold text-foreground">{filteredComponents.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Completed</h3>
            <p className="text-3xl font-bold text-emerald-600">
              {filteredComponents.filter((c: any) => c.status === "completed").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">In Progress / Assigned</h3>
            <p className="text-3xl font-bold text-amber-600">
              {filteredComponents.filter((c: any) => c.status === "in_progress" || c.status === "assigned" || c.status === "not_started").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Data Table */}
      <Card className="border border-border bg-card overflow-hidden">
        <CardHeader className="border-b border-border p-4 bg-muted/20">
          <CardTitle className="text-sm font-semibold text-foreground">Component & Worker Production Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredComponents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm font-medium">
              No component or worker tasks found for {dateRange}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Type / Stage</th>
                    <th className="px-4 py-3">Number/ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Workers</th>
                    <th className="px-4 py-3">Start Time</th>
                    <th className="px-4 py-3">End Time</th>
                    <th className="px-4 py-3">Photo Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredComponents.map((comp: any) => {
                    const isCompleted = comp.status === "completed";
                    const isInProgress = comp.status === "in_progress";
                    return (
                      <tr key={comp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {comp.component_type}
                          <span className="block text-[10px] font-normal text-muted-foreground">{comp.source}</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-primary">{comp.component_number}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={isCompleted ? "secondary" : "default"}
                            className={
                              isCompleted
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : isInProgress
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            }
                          >
                            {comp.status?.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {comp.workers?.length > 0 ? (
                              comp.workers.map((w: any) => (
                                <span key={w.id} className="text-[10px] font-medium text-foreground bg-muted px-2 py-0.5 rounded-md">
                                  {w.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(comp.start_time)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(comp.end_time)}
                        </td>
                        <td className="px-4 py-3">
                          {comp.photo_proof_url ? (
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto({
                                url: comp.photo_proof_url,
                                title: `${comp.component_type} - ${comp.component_number}`
                              })}
                              className="text-primary hover:underline font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye size={13} /> View Photo
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-xs">No Photo</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Proof Dialog Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-md bg-background border border-border p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-4 border-b border-border bg-muted/20">
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ImageIcon size={16} className="text-primary" />
              {selectedPhoto?.title || "Work Proof Photo"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Captured photo proof submitted upon work completion.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 flex flex-col items-center justify-center bg-black/90 min-h-[300px]">
            {selectedPhoto?.url ? (
              <img
                src={selectedPhoto.url}
                alt="Work Proof"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            ) : (
              <p className="text-muted-foreground text-xs">Photo unavailable</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

