"use client";

import React, { useState, useMemo } from "react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Search, ChevronRight, Calculator, CalendarDays, Edit, History, CheckCircle, Trash2, MinusCircle, Plus, FileSpreadsheet, Loader2, RefreshCw, Users, IndianRupee, Clock } from "lucide-react";
import { KPICard } from "@/components/ui/KPICard";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import * as XLSX from "xlsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReasonPromptDialog } from "@/components/shared/ReasonPromptDialog";
import { AuditHistoryDrawer } from "@/components/shared/AuditHistoryDrawer";
import { useEmployeePayroll, useUpdateEmployeePayroll, useGeneratePayroll, useDeletePayroll } from "@/hooks/useQueries";
import { useAuthStore } from "@/store/authStore";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function PayrollEmployeesTab() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const { data: employees = [], isLoading: loading } = useEmployeePayroll(selectedMonth);
  const updatePayroll = useUpdateEmployeePayroll();
  const generatePayroll = useGeneratePayroll();
  const deletePayroll = useDeletePayroll();
  
  const userRole = useAuthStore((state: any) => state.role) || "operator";
  const canEdit = ["admin", "owner"].includes(userRole);

  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [historyRecord, setHistoryRecord] = useState<any>(null);
  const [markPaidRecord, setMarkPaidRecord] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Quick Advance Deduction state
  const [advanceDeductEmp, setAdvanceDeductEmp] = useState<any>(null);
  const [advanceAmountInput, setAdvanceAmountInput] = useState<string>("");
  const [advanceReasonInput, setAdvanceReasonInput] = useState<string>("");
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);

  const openAdvanceDeduct = (emp: any) => {
    setAdvanceDeductEmp(emp);
    setAdvanceAmountInput(emp.deductions ? emp.deductions.toString() : "");
    setAdvanceReasonInput("Advance Deduction");
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((e: any) => e.employeeName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [employees, searchTerm]);

  const payrollStats = useMemo(() => {
    const totalStaff = filteredEmployees.length;
    const totalGross = filteredEmployees.reduce((acc: number, curr: any) => acc + (curr.totalSalary !== undefined ? curr.totalSalary : (curr.baseSalary + curr.otAmount + curr.sundayAmount + curr.bonusAmount)), 0);
    const totalNet = filteredEmployees.reduce((acc: number, curr: any) => acc + (curr.finalSalary || 0), 0);
    const totalExtra = filteredEmployees.reduce((acc: number, curr: any) => acc + (curr.otAmount || 0) + (curr.sundayAmount || 0), 0);
    const paidCount = filteredEmployees.filter((e: any) => (e.status || "").toLowerCase() === "paid").length;
    return { totalStaff, totalGross, totalNet, totalExtra, paidCount };
  }, [filteredEmployees]);

  const generatePayslipPDF = (emp: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text("FOX ENTERPRISES", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("Salary Slip", 105, 28, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 34, { align: "center" });

    // Employee Details
    doc.setFontSize(12);
    doc.text(`Employee Name: ${emp.employeeName}`, 14, 50);
    doc.text(`Employee ID: ${emp.employeeId}`, 14, 58);
    doc.text(`Department: ${emp.department}`, 14, 66);
    doc.text(`Role: ${emp.role}`, 14, 74);

    // Attendance Summary
    autoTable(doc, {
      startY: 85,
      head: [["Present Days", "Half Days", "Absent Days", "OT Hours", "Sunday Hours"]],
      body: [[
        emp.presentDays.toString(), 
        emp.halfDays.toString(), 
        emp.absentDays.toString(), 
        emp.otHours.toString(), 
        emp.sundayHours.toString()
      ]],
      theme: 'grid'
    });

    // Salary Breakdown
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    autoTable(doc, {
      startY: finalY,
      head: [["Earnings / Deductions", "Amount (INR)"]],
      body: [
        ["Base Salary", `Rs. ${emp.baseSalary.toFixed(2)}`],
        ["Overtime Pay", `+ Rs. ${emp.otAmount.toFixed(2)}`],
        ["Sunday Pay", `+ Rs. ${emp.sundayAmount.toFixed(2)}`],
        ["Bonus", `+ Rs. ${emp.bonusAmount.toFixed(2)}`],
        ["Advances / Deductions", `- Rs. ${emp.deductions.toFixed(2)}`]
      ],
      foot: [
        ["Net Final Salary", `Rs. ${emp.finalSalary.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
      footStyles: { fillColor: [46, 204, 113] }
    });

    // Save
    doc.save(`Payslip_${emp.employeeId}_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
  };

  const exportToExcel = () => {
    if (!filteredEmployees || filteredEmployees.length === 0) {
      toast.error("No employee records to export");
      return;
    }

    const excelData = filteredEmployees.map((emp: any) => ({
      "EMP ID": emp.employeeId,
      "Employee Name": emp.employeeName,
      "Department": emp.department,
      "Role": emp.role || "worker",
      "Present Days": emp.presentDays,
      "Half Days": emp.halfDays,
      "Absent Days": emp.absentDays,
      "OT Hours": emp.otHours,
      "Sunday Hours": emp.sundayHours,
      "Base Salary (INR)": emp.baseSalary,
      "OT Pay (INR)": emp.otAmount,
      "Sunday Pay (INR)": emp.sundayAmount,
      "Bonus (INR)": emp.bonusAmount,
      "Gross Salary (Before Deduction) (INR)": emp.totalSalary !== undefined ? emp.totalSalary : (emp.baseSalary + emp.otAmount + emp.sundayAmount + emp.bonusAmount),
      "Deductions / Advance (INR)": emp.deductions,
      "Final Net Salary (INR)": emp.finalSalary,
      "Status": emp.status || "Draft"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    worksheet["!cols"] = [
      { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, 
      { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, 
      { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, 
      { wch: 12 }, { wch: 30 }, { wch: 24 }, { wch: 20 }, { wch: 10 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll_${selectedMonth}`);
    
    XLSX.writeFile(workbook, `Payroll_Summary_${selectedMonth}.xlsx`);
    toast.success("Excel report downloaded successfully (.xlsx)");
  };

  const exportToPDFReport = () => {
    if (!filteredEmployees || filteredEmployees.length === 0) {
      toast.error("No employee records to export");
      return;
    }

    const doc = new jsPDF("landscape");
    
    // Title & Header
    doc.setFontSize(20);
    doc.text("FOX ENTERPRISES", 14, 18);
    doc.setFontSize(12);
    doc.text(`Monthly Payroll Summary Report - ${selectedMonth}`, 14, 26);
    doc.setFontSize(9);
    doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, 14, 32);

    // Summary Totals
    const totalEmployees = filteredEmployees.length;
    const totalNetPayroll = filteredEmployees.reduce((acc: number, curr: any) => acc + (curr.finalSalary || 0), 0);
    const totalGrossPayroll = filteredEmployees.reduce((acc: number, curr: any) => acc + (curr.totalSalary !== undefined ? curr.totalSalary : (curr.baseSalary + curr.otAmount + curr.sundayAmount + curr.bonusAmount)), 0);
    const totalOT = filteredEmployees.reduce((acc: number, curr: any) => acc + (curr.otAmount || 0), 0);
    const totalSunday = filteredEmployees.reduce((acc: number, curr: any) => acc + (curr.sundayAmount || 0), 0);
    const totalDeductions = filteredEmployees.reduce((acc: number, curr: any) => acc + (curr.deductions || 0), 0);

    doc.setFontSize(10);
    doc.text(`Total Staff: ${totalEmployees} | Gross Salary: Rs. ${totalGrossPayroll.toFixed(2)} | Deductions: Rs. ${totalDeductions.toFixed(2)} | Net Payable: Rs. ${totalNetPayroll.toFixed(2)}`, 14, 40);

    // Table
    const tableData = filteredEmployees.map((emp: any) => [
      emp.employeeId,
      emp.employeeName,
      emp.department,
      emp.presentDays.toString(),
      emp.absentDays.toString(),
      emp.otHours.toString(),
      `Rs. ${emp.baseSalary.toFixed(2)}`,
      `Rs. ${emp.otAmount.toFixed(2)}`,
      `Rs. ${emp.sundayAmount.toFixed(2)}`,
      `Rs. ${(emp.totalSalary !== undefined ? emp.totalSalary : (emp.baseSalary + emp.otAmount + emp.sundayAmount + emp.bonusAmount)).toFixed(2)}`,
      `Rs. ${emp.deductions.toFixed(2)}`,
      `Rs. ${emp.finalSalary.toFixed(2)}`,
      emp.status || "Draft"
    ]);

    autoTable(doc, {
      startY: 46,
      head: [["EMP ID", "Name", "Department", "P", "A", "OT (h)", "Base Salary", "OT Pay", "Sunday Pay", "Gross (Rs)", "Ded.", "Final (Rs)", "Status"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 2 },
      foot: [["", "Total Summary", "", "", "", "", "", `Rs. ${totalOT.toFixed(2)}`, `Rs. ${totalSunday.toFixed(2)}`, `Rs. ${totalGrossPayroll.toFixed(2)}`, `Rs. ${totalDeductions.toFixed(2)}`, `Rs. ${totalNetPayroll.toFixed(2)}`, ""]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" }
    });

    doc.save(`Payroll_Report_${selectedMonth}.pdf`);
    toast.success("Payroll PDF report downloaded successfully (.pdf)");
  };

  const exportToCSV = () => {
    if (!filteredEmployees || filteredEmployees.length === 0) {
      toast.error("No employee records to export");
      return;
    }

    const headers = ["EMP ID", "Name", "Department", "Role", "Present Days", "Half Days", "Absent Days", "OT Hours", "Sunday Hours", "Base Salary", "OT Pay", "Sunday Pay", "Bonus", "Gross Salary (Before Deduction)", "Deductions", "Final Salary", "Status"];
    const csvRows = [headers.join(",")];

    filteredEmployees.forEach((emp: any) => {
      const gross = emp.totalSalary !== undefined ? emp.totalSalary : (emp.baseSalary + emp.otAmount + emp.sundayAmount + emp.bonusAmount);
      const row = [
        `"${emp.employeeId}"`,
        `"${emp.employeeName}"`,
        `"${emp.department}"`,
        `"${emp.role || "worker"}"`,
        emp.presentDays,
        emp.halfDays,
        emp.absentDays,
        emp.otHours,
        emp.sundayHours,
        emp.baseSalary,
        emp.otAmount,
        emp.sundayAmount,
        emp.bonusAmount,
        gross,
        emp.deductions,
        emp.finalSalary,
        `"${emp.status || "Draft"}"`
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Payroll_Summary_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully (.csv)");
  };

  const columns: ColumnDef<any>[] = [
    {
      id: "employeeId",
      header: "EMP ID",
      accessor: (row) => <span className="font-mono text-xs">{row.employeeId}</span>,
    },
    {
      id: "employeeName",
      header: "Name",
      accessor: (row) => <span className="font-semibold">{row.employeeName}</span>,
    },
    {
      id: "department",
      header: "Dept",
      accessor: (row) => row.department,
    },
    {
      id: "role",
      header: "Role",
      accessor: (row) => row.role,
    },
    {
      id: "baseSalary",
      header: "Base",
      accessor: (row) => (
        <button
          type="button"
          onClick={() => setEditRecord(row)}
          className="font-mono text-foreground font-semibold hover:text-primary hover:underline cursor-pointer flex items-center gap-1 group"
          title="Click to edit Base Salary & recalculate OT / Sunday pay"
        >
          ₹{row.baseSalary}
          <Edit size={11} className="opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
        </button>
      ),
    },
    {
      id: "otAmount",
      header: "OT",
      accessor: (row) => <span className="font-mono text-orange-500">₹{row.otAmount}</span>,
    },
    {
      id: "sundayAmount",
      header: "Sunday / Festival",
      accessor: (row) => <span className="font-mono text-purple-500">₹{row.sundayAmount}</span>,
    },
    {
      id: "bonusAmount",
      header: "Bonus",
      accessor: (row) => <span className="font-mono text-emerald-500">₹{row.bonusAmount}</span>,
    },
    {
      id: "grossSalary",
      header: "Gross (₹)",
      accessor: (row) => (
        <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
          ₹{row.totalSalary !== undefined ? row.totalSalary : (row.baseSalary + row.otAmount + row.sundayAmount + row.bonusAmount)}
        </span>
      ),
    },
    {
      id: "deductions",
      header: "Ded.",
      accessor: (row) => (
        <button 
          onClick={() => openAdvanceDeduct(row)}
          className="font-mono text-destructive font-semibold hover:underline hover:bg-destructive/10 px-2 py-0.5 rounded transition-all flex items-center gap-1 group cursor-pointer"
          title="Click to deduct / edit advance"
        >
          ₹{row.deductions}
          <MinusCircle size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ),
    },
    {
      id: "finalSalary",
      header: "Final (₹)",
      accessor: (row) => <span className="font-bold text-emerald-600 font-mono">₹{row.finalSalary}</span>,
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => (
        <Badge 
          variant="outline" 
          className={`cursor-pointer transition-colors hover:opacity-80 ${row.status === "Paid" ? "border-success/30 text-success bg-success/10" : "border-yellow-500/30 text-yellow-600 bg-yellow-500/10"}`}
          onClick={() => setEditRecord(row)}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronRight size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setTimeout(() => setSelectedEmp(row), 0)}>
              <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => generatePayslipPDF(row)}>
              <Download className="mr-2 h-4 w-4 text-muted-foreground" /> Download Payslip
            </DropdownMenuItem>
            
            {canEdit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Enterprise Admin</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTimeout(() => openAdvanceDeduct(row), 0)}>
                  <MinusCircle className="mr-2 h-4 w-4 text-destructive" /> Deduct / Record Advance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeout(() => setEditRecord(row), 0)}>
                  <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Salary Components
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeout(() => setMarkPaidRecord(row), 0)}>
                  <CheckCircle className="mr-2 h-4 w-4 text-success" /> Mark as Paid
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  if (confirm(`Are you sure you want to reset/delete the payroll record for ${row.employeeName}?`)) {
                    deletePayroll.mutate({ id: row.id, month: row.month || selectedMonth }, {
                      onSuccess: () => toast.success("Payroll record deleted/reset"),
                      onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to delete")
                    });
                  }
                }}>
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Reset / Delete Record
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTimeout(() => setHistoryRecord(row), 0)}>
                  <History className="mr-2 h-4 w-4 text-muted-foreground" /> Audit History
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-14 bg-card rounded-xl"></div>
      <div className="h-96 bg-card rounded-xl"></div>
    </div>;
  }

  return (
    <div className="space-y-4">
      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <KPICard
          title="Total Staff"
          value={payrollStats.totalStaff}
          description={`Payroll roster (${selectedMonth})`}
          icon={<Users size={14} />}
          semantic="primary"
        />
        <KPICard
          title="Net Payable"
          value={`₹${payrollStats.totalNet.toLocaleString()}`}
          description="Total net disbursal"
          icon={<IndianRupee size={14} />}
          semantic="success"
        />
        <KPICard
          title="OT & Extra Pay"
          value={`₹${payrollStats.totalExtra.toLocaleString()}`}
          description="Overtime & Sunday work"
          icon={<Clock size={14} />}
          semantic={payrollStats.totalExtra > 0 ? "warning" : "neutral"}
        />
        <KPICard
          title="Disbursement Status"
          value={`${payrollStats.paidCount} / ${payrollStats.totalStaff} Paid`}
          description={payrollStats.totalStaff - payrollStats.paidCount > 0 ? `${payrollStats.totalStaff - payrollStats.paidCount} pending payment` : "All salaries cleared"}
          icon={<CheckCircle size={14} />}
          semantic={payrollStats.paidCount === payrollStats.totalStaff && payrollStats.totalStaff > 0 ? "success" : "neutral"}
        />
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col w-full min-h-[500px]">
      
      {/* TOOLBAR */}
      <div className="p-3 sm:p-3.5 border-b border-border bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left: Search + Month + Actions (In-line flex) */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="relative w-full sm:w-52 lg:w-60 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input 
              placeholder="Search employees..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8.5 bg-background rounded-xl border-input w-full text-xs shadow-2xs"
            />
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-background border border-input rounded-xl px-2.5 h-8.5 shrink-0 shadow-2xs">
            <CalendarDays size={13} className="text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground shrink-0">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer pr-1"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((offset) => {
                const now = new Date();
                const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = format(d, "MMMM yyyy");
                return (
                  <option key={val} value={val} className="bg-popover text-popover-foreground">
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Generate Payroll */}
          <Button 
            variant="outline" 
            size="sm"
            className="rounded-xl h-8.5 px-3 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold text-xs whitespace-nowrap cursor-pointer shadow-2xs gap-1.5 shrink-0"
            onClick={() => {
              generatePayroll.mutate(selectedMonth, {
                onSuccess: () => toast.success(`Payroll generated for ${selectedMonth}`)
              });
            }}
          >
            <Calculator size={13} /> Generate Payroll
          </Button>

          {/* Recalculate */}
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-8.5 px-3 border-border hover:bg-muted text-foreground font-semibold text-xs whitespace-nowrap cursor-pointer shadow-2xs gap-1.5 shrink-0"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["employeePayroll"] });
              queryClient.invalidateQueries({ queryKey: ["payrollSummary"] });
              toast.success("Payroll and OT/Sunday calculations re-synced successfully");
            }}
            title="Refresh and sync all payroll, OT, and Sunday calculations"
          >
            <RefreshCw size={13} className="text-primary" /> Recalculate
          </Button>

          {canEdit && (
            <Button 
              variant="outline" 
              size="sm"
              className="rounded-xl h-8.5 px-3 border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 font-semibold text-xs whitespace-nowrap cursor-pointer shadow-2xs gap-1.5 shrink-0"
              onClick={() => {
                if (filteredEmployees.length > 0) {
                  openAdvanceDeduct(filteredEmployees[0]);
                } else {
                  toast.error("No employee found in current view");
                }
              }}
            >
              <MinusCircle size={13} /> Deduct Advance
            </Button>
          )}
        </div>
        
        {/* Right: Export Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            className="rounded-xl h-8.5 px-3 gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold text-xs shadow-2xs cursor-pointer whitespace-nowrap"
            onClick={exportToExcel}
            title="Download full payroll summary in Excel (.xlsx) format"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" /> Export Excel
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            className="rounded-xl h-8.5 px-3 gap-1.5 border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 font-semibold text-xs shadow-2xs cursor-pointer whitespace-nowrap"
            onClick={exportToPDFReport}
            title="Download landscape PDF payroll report with totals"
          >
            <FileText size={14} className="text-red-600" /> Download PDF
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl h-8.5 w-8.5 p-0 border-border cursor-pointer shadow-2xs" title="More Export Options">
                <Download size={13} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Excel Spreadsheet (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDFReport}>
                <FileText className="mr-2 h-4 w-4 text-red-600" /> PDF Payroll Report (.pdf)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4 text-blue-600" /> CSV File (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Payroll Cards List */}
      <div className="md:hidden space-y-3 p-3 bg-muted/10">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border p-6">
            <Users size={32} className="mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-foreground">No payroll records found</p>
            <p className="text-xs text-muted-foreground mt-1">Try generating payroll or selecting another month.</p>
          </div>
        ) : (
          filteredEmployees.map((emp: any) => {
            const gross = emp.totalSalary !== undefined ? emp.totalSalary : (emp.baseSalary + emp.otAmount + emp.sundayAmount + emp.bonusAmount);
            const isPaid = (emp.status || "").toLowerCase() === "paid";

            return (
              <div key={emp.id} className="bg-card border border-border rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-primary">{emp.employeeId}</span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="font-semibold text-foreground text-xs truncate">{emp.employeeName}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{emp.department} • <span className="capitalize">{emp.role || "worker"}</span></p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 cursor-pointer",
                      isPaid ? "border-success/30 text-success bg-success/10" : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                    )}
                    onClick={() => setEditRecord(emp)}
                  >
                    {emp.status || "Draft"}
                  </Badge>
                </div>

                {/* Salary Breakdown 2x2 Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Base Salary</span>
                    <button
                      type="button"
                      onClick={() => setEditRecord(emp)}
                      className="font-mono font-bold text-foreground hover:text-primary hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                      title="Edit Base Salary"
                    >
                      ₹{Number(emp.baseSalary || 0).toLocaleString()}
                      <Edit size={10} className="text-primary" />
                    </button>
                  </div>

                  <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">OT & Sunday</span>
                    <span className="font-mono font-semibold text-orange-600 dark:text-orange-400 block mt-0.5">
                      +₹{(Number(emp.otAmount || 0) + Number(emp.sundayAmount || 0)).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Gross Pay</span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 block mt-0.5">
                      ₹{Number(gross || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Deductions</span>
                    <button
                      type="button"
                      onClick={() => openAdvanceDeduct(emp)}
                      className="font-mono font-semibold text-destructive hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                      title="Deduct advance"
                    >
                      {Number(emp.deductions || 0) > 0 ? `-₹${Number(emp.deductions).toLocaleString()}` : "₹0"}
                      <MinusCircle size={10} />
                    </button>
                  </div>
                </div>

                {/* Net Final Pay Highlight Banner */}
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Net Final Payable</span>
                  <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(emp.finalSalary || 0).toLocaleString()}
                  </span>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/60">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedEmp(emp)}
                    className="h-7 px-2 text-xs font-semibold cursor-pointer"
                  >
                    <FileText size={11} className="mr-1 text-muted-foreground" /> Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generatePayslipPDF(emp)}
                    className="h-7 px-2 text-xs font-semibold cursor-pointer"
                  >
                    <Download size={11} className="mr-1 text-muted-foreground" /> Payslip
                  </Button>
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openAdvanceDeduct(emp)}>
                          <MinusCircle className="mr-2 h-4 w-4 text-destructive" /> Deduct Advance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditRecord(emp)}>
                          <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Salary
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setMarkPaidRecord(emp)}>
                          <CheckCircle className="mr-2 h-4 w-4 text-success" /> Mark as Paid
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setHistoryRecord(emp)}>
                          <History className="mr-2 h-4 w-4 text-muted-foreground" /> Audit History
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block flex-1 overflow-auto">
        <DataTable 
          columns={columns} 
          data={filteredEmployees} 
          rowId={(row) => row.id.toString()}
        />
      </div>

      {/* PAYROLL DETAILS DRAWER */}
      <Sheet open={!!selectedEmp} onOpenChange={(open) => !open && setSelectedEmp(null)}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto" side="right">
          {selectedEmp && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-2xl font-bold flex items-center gap-3">
                  {selectedEmp.employeeName}
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">{selectedEmp.status}</Badge>
                </SheetTitle>
                <SheetDescription>
                  {selectedEmp.employeeId} • {selectedEmp.department} • {selectedEmp.role}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                
                {/* Actions */}
                <div className="flex gap-3 pb-6 border-b border-border">
                  {canEdit && (
                    <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => { setSelectedEmp(null); setEditRecord(selectedEmp); }}>Edit Payroll</Button>
                  )}
                  <Button variant="secondary" className="flex-1" onClick={() => generatePayslipPDF(selectedEmp)}><Download size={16} className="mr-2"/> Payslip</Button>
                </div>

                {/* Attendance Summary */}
                <div>
                  <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2"><CalendarDays size={16}/> Attendance Summary</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-success/10 border border-success/20 p-3 rounded-xl text-center">
                      <p className="text-2xl font-black text-success">{selectedEmp.presentDays}</p>
                      <p className="text-xs font-semibold text-success/80">Present</p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl text-center">
                      <p className="text-2xl font-black text-yellow-600">{selectedEmp.halfDays}</p>
                      <p className="text-xs font-semibold text-yellow-600/80">Half Days</p>
                    </div>
                    <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl text-center">
                      <p className="text-2xl font-black text-destructive">{selectedEmp.absentDays}</p>
                      <p className="text-xs font-semibold text-destructive/80">Absent</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl flex justify-between items-center">
                      <span className="text-xs font-semibold text-orange-600">OT Hours</span>
                      <span className="font-black text-orange-600">{selectedEmp.otHours}h</span>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl flex justify-between items-center">
                      <span className="text-xs font-semibold text-purple-600">Sunday / Festival Hrs</span>
                      <span className="font-black text-purple-600">{selectedEmp.sundayHours}h</span>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown */}
                <div>
                  <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-4 mt-8">Salary Breakdown</h4>
                  <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-3 font-mono text-sm">
                    <div className="flex justify-between"><span>Base Salary</span><span>₹{selectedEmp.baseSalary}</span></div>
                    <div className="flex justify-between text-orange-500"><span>Overtime Pay</span><span>+ ₹{selectedEmp.otAmount}</span></div>
                    <div className="flex justify-between text-purple-500"><span>Sunday / Festival Pay</span><span>+ ₹{selectedEmp.sundayAmount}</span></div>
                    <div className="flex justify-between text-emerald-500"><span>Bonus</span><span>+ ₹{selectedEmp.bonusAmount}</span></div>
                    <div className="flex justify-between text-destructive"><span>Deductions</span><span>- ₹{selectedEmp.deductions}</span></div>
                    <div className="pt-3 mt-3 border-t border-border flex justify-between text-lg font-bold text-foreground">
                      <span>Final Salary</span><span>₹{selectedEmp.finalSalary}</span>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Enterprise Admin Dialogs */}
      <EditPayrollModal
        record={editRecord}
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        onSave={(data, reason) => {
          if (!editRecord) return;
          updatePayroll.mutate({ 
            id: editRecord.id, 
            data: { 
              ...data, 
              month: editRecord.month || selectedMonth,
              reason: reason?.trim() || "Administrative salary adjustment"
            } 
          }, {
            onSuccess: () => {
              toast.success(`Payroll updated successfully for ${editRecord.employeeName}`);
              setEditRecord(null);
            },
            onError: (err: any) => {
              toast.error(err?.response?.data?.detail || "Failed to update payroll");
            }
          });
        }}
        isSaving={updatePayroll.isPending}
      />

      <ReasonPromptDialog
        open={!!markPaidRecord}
        onOpenChange={(open) => !open && setMarkPaidRecord(null)}
        title="Mark Payroll as Paid"
        description={`Confirm marking payroll for ${markPaidRecord?.employeeName} as PAID.`}
        onSubmit={(reason) => {
          if (!markPaidRecord) return;
          updatePayroll.mutate({ 
            id: markPaidRecord.id, 
            data: { 
              month: markPaidRecord.month || selectedMonth, 
              status: "Paid", 
              reason: reason?.trim() || "Marked as paid" 
            } 
          }, {
            onSuccess: () => {
              toast.success("Payroll marked as paid");
              setMarkPaidRecord(null);
            },
            onError: (err: any) => {
              toast.error(err?.response?.data?.detail || "Failed to mark as paid");
            }
          });
        }}
      />

      <AuditHistoryDrawer
        open={!!historyRecord}
        onOpenChange={(open) => !open && setHistoryRecord(null)}
        recordId={historyRecord?.id?.toString() || ""}
        module="payroll"
        title={`Audit History: Payroll for ${historyRecord?.employeeName}`}
      />

      {/* Quick Deduct / Record Advance Dialog */}
      <Dialog open={!!advanceDeductEmp} onOpenChange={(open) => !open && setAdvanceDeductEmp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <MinusCircle className="w-5 h-5 text-destructive" />
              Deduct / Record Advance
            </DialogTitle>
            <DialogDescription>
              {advanceDeductEmp?.employeeName} ({advanceDeductEmp?.employeeId}) • {advanceDeductEmp?.department}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Employee Select Card */}
            <div className="bg-muted/40 border border-border p-3 rounded-xl flex justify-between items-center font-mono text-xs">
              <div>
                <span className="text-muted-foreground block font-sans text-xs">Select Employee:</span>
                <select
                  value={advanceDeductEmp?.id || ""}
                  onChange={(e) => {
                    const found = employees.find((emp: any) => emp.id === parseInt(e.target.value));
                    if (found) openAdvanceDeduct(found);
                  }}
                  className="bg-background text-foreground font-bold text-xs border border-input rounded px-2 py-1 mt-1 focus:outline-none"
                >
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.employeeName} ({emp.employeeId})</option>
                  ))}
                </select>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block font-sans text-xs">Gross Pay (Earned):</span>
                <span className="font-bold text-foreground text-xs font-mono">
                  ₹{(advanceDeductEmp?.totalSalary !== undefined ? advanceDeductEmp.totalSalary : ((advanceDeductEmp?.baseSalary || 0) + (advanceDeductEmp?.otAmount || 0) + (advanceDeductEmp?.sundayAmount || 0) + (advanceDeductEmp?.bonusAmount || 0))).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Amount Preset Chips */}
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-medium">Quick Amount Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {[500, 1000, 2000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAdvanceAmountInput(amt.toString())}
                    className={`text-xs px-2.5 py-1 rounded-md border font-mono font-medium transition-colors ${
                      advanceAmountInput === amt.toString()
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : "bg-muted/50 hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    +₹{amt.toLocaleString("en-IN")}
                  </button>
                ))}
                {advanceAmountInput && advanceAmountInput !== "0" && (
                  <button
                    type="button"
                    onClick={() => setAdvanceAmountInput("0")}
                    className="text-xs px-2.5 py-1 rounded-md border font-mono font-medium bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 transition-colors"
                  >
                    Clear (₹0)
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-sm">Advance / Deduction Amount (₹) *</Label>
                {advanceAmountInput && (
                  <span className="text-xs text-muted-foreground font-mono">
                    ₹{parseFloat(advanceAmountInput) || 0}
                  </span>
                )}
              </div>
              <Input 
                type="number"
                min="0"
                placeholder="Enter amount (e.g. 2000)"
                value={advanceAmountInput}
                onChange={(e) => setAdvanceAmountInput(e.target.value)}
                className="h-11 font-mono text-lg font-bold border-input"
                autoFocus
              />
              {!advanceAmountInput && (
                <p className="text-[11px] text-muted-foreground">
                  * Kripya amount type karein ya upar presets me se chunein.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-xs">Reason / Note</Label>
              <Input 
                placeholder="e.g. August Advance Deduction"
                value={advanceReasonInput}
                onChange={(e) => setAdvanceReasonInput(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Live Net Salary Preview Box */}
            {advanceDeductEmp && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Net Payable Salary:</span>
                <span className="text-lg font-black font-mono text-emerald-600">
                  ₹{Math.max(0, ((advanceDeductEmp?.totalSalary !== undefined ? advanceDeductEmp.totalSalary : ((advanceDeductEmp?.baseSalary || 0) + (advanceDeductEmp?.otAmount || 0) + (advanceDeductEmp?.sundayAmount || 0) + (advanceDeductEmp?.bonusAmount || 0))) - (parseFloat(advanceAmountInput) || 0))).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAdvanceDeductEmp(null)} disabled={isSavingAdvance}>
              Cancel
            </Button>
            <Button 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2 font-bold cursor-pointer"
              disabled={isSavingAdvance}
              onClick={async () => {
                if (!advanceDeductEmp) return;
                
                if (!advanceAmountInput || advanceAmountInput.trim() === "") {
                  toast.error("Please enter an amount (e.g. 2000) or choose a preset");
                  return;
                }

                const dedVal = parseFloat(advanceAmountInput);
                if (isNaN(dedVal) || dedVal < 0) {
                  toast.error("Please enter a valid amount (₹0 or more)");
                  return;
                }

                setIsSavingAdvance(true);
                try {
                  if (dedVal > 0) {
                    await api.post("/payroll/advances", {
                      worker_id: advanceDeductEmp.id,
                      amount: dedVal,
                      reason: advanceReasonInput || "Advance deduction",
                      status: "Approved",
                      deducted_in_payroll: true
                    }).catch((err) => {
                      console.warn("Advance request log note:", err);
                    });
                  }

                  await updatePayroll.mutateAsync({
                    id: advanceDeductEmp.id,
                    data: {
                      month: selectedMonth,
                      deductions: dedVal,
                      reason: advanceReasonInput || "Advance deduction"
                    }
                  });

                  toast.success(`Advance deduction of ₹${dedVal.toFixed(2)} saved for ${advanceDeductEmp.employeeName}`);
                  setAdvanceDeductEmp(null);
                } catch (err: any) {
                  toast.error(err?.response?.data?.detail || "Failed to update advance deduction");
                } finally {
                  setIsSavingAdvance(false);
                }
              }}
            >
              {isSavingAdvance ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                "Save Advance Deduction"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
}

function EditPayrollModal({
  record,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  record: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any, reason: string) => void;
  isSaving: boolean;
}) {
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [otAmount, setOtAmount] = useState<number>(0);
  const [sundayAmount, setSundayAmount] = useState<number>(0);
  const [bonusAmount, setBonusAmount] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [status, setStatus] = useState<string>("Draft");
  const [reason, setReason] = useState<string>("");
  const [isCustomOt, setIsCustomOt] = useState<boolean>(false);
  const [isCustomSunday, setIsCustomSunday] = useState<boolean>(false);

  const { data: attendanceSettings } = useQuery({
    queryKey: ["attendanceSettings"],
    queryFn: async () => {
      const res = await api.get("/settings/attendance");
      return res.data;
    }
  });

  const otMultiplier = attendanceSettings?.enableOt ? (attendanceSettings?.otRateMultiplier || 1.5) : 0.0;
  const sundayMultiplier = attendanceSettings?.enableSundayTracking ? (attendanceSettings?.sundayRateMultiplier || 2.0) : 1.0;

  React.useEffect(() => {
    if (record && open) {
      const b = record.baseSalary || 0;
      setBaseSalary(b);
      const rate = b > 0 ? (b / 30) / 8 : 0;
      const expectedOt = Number(((record.otHours || 0) * rate * otMultiplier).toFixed(2));
      const expectedSun = Number(((record.sundayHours || 0) * rate * sundayMultiplier).toFixed(2));

      setOtAmount(record.otAmount !== undefined ? record.otAmount : expectedOt);
      setSundayAmount(record.sundayAmount !== undefined ? record.sundayAmount : expectedSun);
      setBonusAmount(record.bonusAmount || 0);
      setDeductions(record.deductions || 0);
      setStatus(record.status || "Draft");
      setReason("");
      setIsCustomOt(false);
      setIsCustomSunday(false);
    }
  }, [record, open, otMultiplier, sundayMultiplier]);

  const otHours = record?.otHours || 0;
  const sundayHours = record?.sundayHours || 0;
  const hourlyRate = baseSalary > 0 ? (baseSalary / 30) / 8 : 0;
  const autoOt = Number((otHours * hourlyRate * otMultiplier).toFixed(2));
  const autoSunday = Number((sundayHours * hourlyRate * sundayMultiplier).toFixed(2));

  const handleBaseChange = (valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setBaseSalary(val);
    const newRate = val > 0 ? (val / 30) / 8 : 0;
    if (!isCustomOt) {
      setOtAmount(Number((otHours * newRate * otMultiplier).toFixed(2)));
    }
    if (!isCustomSunday) {
      setSundayAmount(Number((sundayHours * newRate * sundayMultiplier).toFixed(2)));
    }
  };

  const grossPay = Number((baseSalary + otAmount + sundayAmount + bonusAmount).toFixed(2));
  const netPay = Number((grossPay - deductions).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        base_salary: baseSalary,
        ot_amount: otAmount,
        sunday_amount: sundayAmount,
        bonus_amount: bonusAmount,
        deductions: deductions,
        status: status,
      },
      reason || "Base salary and pay components adjusted"
    );
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center justify-between">
            <span>Edit Payroll: {record.employeeName}</span>
            <Badge variant="outline" className="font-mono text-xs">{record.employeeId}</Badge>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {record.department} • Role: {record.role || "worker"} • Month: {record.month}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto px-6 py-4 space-y-4">
          {/* Attendance Stats Pill Bar */}
          <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-xl border border-border text-xs">
            <div className="text-center">
              <span className="text-muted-foreground block text-[11px]">Present Days</span>
              <span className="font-bold text-foreground font-mono">{record.presentDays} d</span>
            </div>
            <div className="text-center border-x border-border">
              <span className="text-muted-foreground block text-[11px]">OT Hours</span>
              <span className="font-bold text-orange-600 font-mono">{otHours} hrs</span>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground block text-[11px]">Sunday / Fest Hours</span>
              <span className="font-bold text-purple-600 font-mono">{sundayHours} hrs</span>
            </div>
          </div>

          {/* Base Salary Input */}
          <div className="space-y-1.5 p-3 rounded-xl border-2 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
              <Label htmlFor="base_salary" className="text-xs font-bold text-primary">
                Monthly Base Salary (₹)
              </Label>
              <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                Hourly Rate: <span className="text-primary font-bold">₹{hourlyRate.toFixed(2)}/h</span> (Base / 30 / 8)
              </span>
            </div>
            <Input
              id="base_salary"
              type="number"
              value={baseSalary || ""}
              onChange={(e) => handleBaseChange(e.target.value)}
              className="bg-background text-base font-bold font-mono h-10 border-input"
              placeholder="e.g. 23000"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              💡 Base Salary change karte hi OT aur Sunday / Festival pay automatically recalculate ho jayenge.
            </p>
          </div>

          {/* OT and Sunday Amount Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* OT Amount */}
            <div className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="ot_amount" className="text-xs font-semibold text-foreground">
                  OT Pay (₹)
                </Label>
                {isCustomOt && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomOt(false);
                      setOtAmount(autoOt);
                    }}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Reset Auto (₹{autoOt})
                  </button>
                )}
              </div>
              <Input
                id="ot_amount"
                type="number"
                step="0.01"
                value={otAmount}
                onChange={(e) => {
                  setIsCustomOt(true);
                  setOtAmount(parseFloat(e.target.value) || 0);
                }}
                className="bg-background font-mono font-semibold text-orange-600 h-9"
              />
              <span className="text-[10px] text-muted-foreground block font-mono">
                Auto: {otHours}h × ₹{hourlyRate.toFixed(2)} × {otMultiplier}x = ₹{autoOt}
              </span>
            </div>

            {/* Sunday Amount */}
            <div className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="sunday_amount" className="text-xs font-semibold text-foreground">
                  Sunday / Fest Pay (₹)
                </Label>
                {isCustomSunday && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSunday(false);
                      setSundayAmount(autoSunday);
                    }}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Reset Auto (₹{autoSunday})
                  </button>
                )}
              </div>
              <Input
                id="sunday_amount"
                type="number"
                step="0.01"
                value={sundayAmount}
                onChange={(e) => {
                  setIsCustomSunday(true);
                  setSundayAmount(parseFloat(e.target.value) || 0);
                }}
                className="bg-background font-mono font-semibold text-purple-600 h-9"
              />
              <span className="text-[10px] text-muted-foreground block font-mono">
                Auto: {sundayHours}h × ₹{hourlyRate.toFixed(2)} × {sundayMultiplier}x = ₹{autoSunday}
              </span>
            </div>
          </div>

          {/* Bonus and Deductions Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="bonus_amount" className="text-xs font-medium text-foreground">
                Bonus (₹)
              </Label>
              <Input
                id="bonus_amount"
                type="number"
                step="0.01"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(parseFloat(e.target.value) || 0)}
                className="bg-background font-mono text-emerald-600 h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="deductions" className="text-xs font-medium text-foreground">
                Deductions / Advances (₹)
              </Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                value={deductions}
                onChange={(e) => setDeductions(parseFloat(e.target.value) || 0)}
                className="bg-background font-mono text-destructive h-9"
              />
            </div>
          </div>

          {/* Status and Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs font-medium text-foreground">
                Payroll Status
              </Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value="Draft">Draft</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="reason" className="text-xs font-medium text-foreground">
                Reason for Edit (Optional)
              </Label>
              <Input
                id="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Salary hike / rate adjustment"
                className="bg-background text-xs h-9"
              />
            </div>
          </div>

          {/* Live Pay Summary Box */}
          <div className="bg-muted/50 border border-border rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center text-muted-foreground font-mono">
              <span>Base Pay</span>
              <span>₹{baseSalary.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-orange-600 dark:text-orange-400 font-mono">
              <span>+ Overtime (OT) Pay</span>
              <span>₹{otAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-purple-600 dark:text-purple-400 font-mono">
              <span>+ Sunday / Festival Pay</span>
              <span>₹{sundayAmount.toFixed(2)}</span>
            </div>
            {bonusAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-600 font-mono">
                <span>+ Bonus</span>
                <span>₹{bonusAmount.toFixed(2)}</span>
              </div>
            )}
            {deductions > 0 && (
              <div className="flex justify-between items-center text-destructive font-mono">
                <span>- Deductions / Advances</span>
                <span>₹{deductions.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-border flex justify-between items-center font-bold">
              <span className="text-foreground">Gross Pay: <span className="font-mono font-normal">₹{grossPay.toFixed(2)}</span></span>
              <span className="text-sm text-emerald-600 font-mono font-extrabold">Final Net: ₹{netPay.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Payroll Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
