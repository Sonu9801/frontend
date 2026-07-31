"use client";

import React, { useMemo } from "react";
import { useWorkerPerformance } from "@/hooks/useQueries";
import { exportToCSV, exportToExcel, exportToPDF } from "./exportUtils";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function WorkersPerformanceTab({ 
  dateRange,
  filters
}: { 
  dateRange: string;
  filters: any;
}) {
  // Convert dateRange/filters to a YYYY-MM if needed, or pass the selected month
  // For simplicity, assuming current month if not specifically passed in a standard format
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { data: performanceDataRaw, isLoading } = useWorkerPerformance(currentMonth);

  const performanceData = useMemo(() => {
    if (Array.isArray(performanceDataRaw)) return performanceDataRaw;
    if (performanceDataRaw && Array.isArray(performanceDataRaw.items)) return performanceDataRaw.items;
    return [];
  }, [performanceDataRaw]);

  const tableData = useMemo(() => {
    return performanceData.map((d: any) => ({
      ID: d.employeeId || d.employee_id || d.id,
      Name: d.name || d.worker_name || "Unknown",
      Department: d.department || "Unassigned",
      "Platform No.": d.items_built ? (Array.isArray(d.items_built) ? d.items_built.join(", ") : d.items_built) : (d.todayAssignment || "-"),
      "Jobs Completed": d.jobs_completed ?? d.completedJobs ?? 0,
      "Self Assigned": d.self_assigned ?? 0,
      "Supervisor Assigned": d.supervisor_assigned ?? 0,
      "Expected Time (min)": d.expected_minutes ?? 0,
      "Actual Time (min)": d.actual_minutes ?? 0,
      "Efficiency (%)": d.efficiency_percent ?? d.efficiency ?? 0
    }));
  }, [performanceData]);

  const headers = ["ID", "Name", "Department", "Platform No.", "Jobs Completed", "Self Assigned", "Supervisor Assigned", "Expected Time (min)", "Actual Time (min)", "Efficiency (%)"];

  const handleExport = (type: "csv" | "excel" | "pdf") => {
    const filename = "Worker_Performance_Report";
    if (type === "csv") exportToCSV(filename, headers, tableData);
    else if (type === "excel") exportToExcel(filename, headers, tableData);
    else exportToPDF(filename, "Worker Performance Report", headers, tableData, { dateRange, summary: "Monthly performance overview by worker" });
  };

  const chartData = useMemo(() => {
    return performanceData
      .filter((d: any) => (d.jobs_completed || d.completedJobs || 0) > 0)
      .slice(0, 10)
      .map((d: any) => ({
        name: (d.name || d.worker_name || "Worker").split(" ")[0],
        Efficiency: d.efficiency_percent ?? d.efficiency ?? 0,
        Jobs: d.jobs_completed ?? d.completedJobs ?? 0
      }));
  }, [performanceData]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading performance data...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Worker Performance (Monthly)</h2>
          <p className="text-sm text-muted-foreground">Detailed metrics on jobs completed, assignment source, and time efficiency.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>Export CSV</Button>
           <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>Export Excel</Button>
           <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>Export PDF</Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold mb-4">Top Performers Efficiency</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} unit="%" />
              <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Legend />
              <Bar yAxisId="left" dataKey="Efficiency" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="Jobs" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm mt-6">
        <div className="p-4 border-b border-border bg-muted/20 font-semibold text-sm">
           Performance Metrics
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                {headers.map(h => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-8 text-center text-muted-foreground">
                    No performance data available for this period.
                  </td>
                </tr>
              ) : tableData.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-muted-foreground">{row.ID}</td>
                  <td className="px-4 py-3 font-semibold">{row.Name}</td>
                  <td className="px-4 py-3">{row.Department}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate" title={row["Platform No."]}>{row["Platform No."]}</td>
                  <td className="px-4 py-3">{row["Jobs Completed"]}</td>
                  <td className="px-4 py-3">{row["Self Assigned"]}</td>
                  <td className="px-4 py-3">{row["Supervisor Assigned"]}</td>
                  <td className="px-4 py-3">{row["Expected Time (min)"]}</td>
                  <td className="px-4 py-3">{row["Actual Time (min)"]}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                      row["Efficiency (%)"] >= 100 ? "bg-success/10 text-success" : 
                      row["Efficiency (%)"] >= 80 ? "bg-warning/10 text-warning" : 
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {row["Efficiency (%)"]}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
