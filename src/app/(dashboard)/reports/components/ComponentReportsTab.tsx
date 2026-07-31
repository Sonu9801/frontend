"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { componentsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Download, FileText, Eye, Image as ImageIcon } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "./exportUtils";

interface ComponentReportsTabProps {
  dateRange?: string;
  filters?: any;
}

export function ComponentReportsTab({ dateRange = "All Time", filters }: ComponentReportsTabProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

  const { data: allComponents = [], isLoading } = useQuery({
    queryKey: ["allComponents"],
    queryFn: async () => {
      return await componentsApi.getAllTasks();
    }
  });

  // Filter components by dateRange and global filters
  const filteredComponents = useMemo(() => {
    if (!allComponents || !Array.isArray(allComponents)) return [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return allComponents.filter((comp: any) => {
      // 1. Date Range Filtering
      if (dateRange && dateRange !== "All Time") {
        const compDateRaw = comp.start_time || comp.created_at;
        if (compDateRaw) {
          const compDate = new Date(compDateRaw);
          if (!isNaN(compDate.getTime())) {
            if (dateRange === "Today") {
              if (compDate < todayStart) return false;
            } else if (dateRange === "Yesterday") {
              const yestStart = new Date(todayStart);
              yestStart.setDate(yestStart.getDate() - 1);
              if (compDate < yestStart || compDate >= todayStart) return false;
            } else if (dateRange === "This Week") {
              const weekStart = new Date(todayStart);
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              if (compDate < weekStart) return false;
            } else if (dateRange === "Last 7 Days") {
              const d7 = new Date(todayStart);
              d7.setDate(d7.getDate() - 7);
              if (compDate < d7) return false;
            } else if (dateRange === "Last 30 Days") {
              const d30 = new Date(todayStart);
              d30.setDate(d30.getDate() - 30);
              if (compDate < d30) return false;
            } else if (dateRange === "This Month") {
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              if (compDate < monthStart) return false;
            }
          }
        }
      }

      // 2. Secondary filters (Status / Department)
      if (filters?.status && filters.status !== "All") {
        if (comp.status?.toLowerCase() !== filters.status.toLowerCase()) return false;
      }

      if (filters?.department && filters.department !== "All") {
        const deptMatch = comp.workers?.some((w: any) => w.department?.toLowerCase() === filters.department.toLowerCase());
        if (!deptMatch && comp.component_type?.toLowerCase() !== filters.department.toLowerCase()) return false;
      }

      return true;
    });
  }, [allComponents, dateRange, filters]);

  const headers = ["Type", "Number/ID", "Status", "Workers", "Start Time", "End Time"];
  
  const tableData = useMemo(() => {
    return filteredComponents.map((c: any) => ({
      Type: c.component_type,
      "Number/ID": c.component_number,
      Status: c.status?.replace("_", " "),
      Workers: c.workers?.map((w: any) => w.name).join(", ") || "-",
      "Start Time": c.start_time ? new Date(c.start_time).toLocaleString() : "-",
      "End Time": c.end_time ? new Date(c.end_time).toLocaleString() : "-"
    }));
  }, [filteredComponents]);

  const handleExport = (type: "csv" | "excel" | "pdf") => {
    const filename = `Component_Production_Report_${dateRange.replace(/\s+/g, '_')}`;
    if (type === "csv") exportToCSV(filename, headers, tableData);
    else if (type === "excel") exportToExcel(filename, headers, tableData);
    else exportToPDF(filename, "Component Production Report", headers, tableData, { dateRange, summary: "Production report of self-assigned component tasks." });
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border bg-card">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Total Components</h3>
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
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">In Progress</h3>
            <p className="text-3xl font-bold text-amber-600">
              {filteredComponents.filter((c: any) => c.status === "in_progress").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Data Table */}
      <Card className="border border-border bg-card overflow-hidden">
        <CardHeader className="border-b border-border p-4 bg-muted/20">
          <CardTitle className="text-sm font-semibold text-foreground">Component Production Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredComponents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm font-medium">
              No component tasks found for {dateRange}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Number/ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Workers</th>
                    <th className="px-4 py-3">Start Time</th>
                    <th className="px-4 py-3">End Time</th>
                    <th className="px-4 py-3">Photo Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredComponents.map((comp: any) => (
                    <tr key={comp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{comp.component_type}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{comp.component_number}</td>
                      <td className="px-4 py-3">
                        <Badge variant={comp.status === "completed" ? "secondary" : "default"} className={comp.status === "completed" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}>
                          {comp.status?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {comp.workers?.map((w: any) => (
                            <span key={w.id} className="text-[10px] font-medium text-foreground bg-muted px-2 py-0.5 rounded-md">
                              {w.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {comp.start_time ? new Date(comp.start_time).toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {comp.end_time ? new Date(comp.end_time).toLocaleString() : "-"}
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
                  ))}
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
