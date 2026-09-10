"use client";

import React, { useState, useMemo } from "react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Search, ChevronRight, Calculator, CalendarDays, Edit, History, CheckCircle, Trash2, MinusCircle, Plus, FileSpreadsheet } from "lucide-react";
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
import { EditRecordDialog } from "@/components/shared/EditRecordDialog";
import { ReasonPromptDialog } from "@/components/shared/ReasonPromptDialog";
import { AuditHistoryDrawer } from "@/components/shared/AuditHistoryDrawer";
import { useEmployeePayroll, useUpdateEmployeePayroll, useGeneratePayroll, useDeletePayroll } from "@/hooks/useQueries";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function PayrollEmployeesTab() {
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
      accessor: (row) => <span className="font-mono text-muted-foreground">₹{row.baseSalary}</span>,
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
                    deletePayroll.mutate({ id: row.id, month: row.month || "2026-06" }, {
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
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
      
      {/* TOOLBAR */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/10 gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search employees..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-background rounded-xl border-input w-full"
            />
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-background border border-input rounded-xl px-3 h-10 shrink-0 w-full sm:w-auto">
            <CalendarDays size={16} className="text-emerald-500 shrink-0" />
            <span className="text-xs font-bold text-muted-foreground shrink-0">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer w-full sm:w-auto"
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

          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none justify-center rounded-xl h-10 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20"
              onClick={() => {
                generatePayroll.mutate(selectedMonth, {
                  onSuccess: () => toast.success(`Payroll generated for ${selectedMonth}`)
                });
              }}
            >
              <Calculator size={16} className="mr-2"/> Generate Payroll
            </Button>

            {canEdit && (
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none justify-center rounded-xl h-10 border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 font-semibold gap-1.5"
                onClick={() => {
                  if (filteredEmployees.length > 0) {
                    openAdvanceDeduct(filteredEmployees[0]);
                  } else {
                    toast.error("No employee found in current view");
                  }
                }}
              >
                <MinusCircle size={16} /> Deduct Advance
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="rounded-xl h-10 gap-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold text-xs sm:text-sm"
            onClick={exportToExcel}
            title="Download full payroll summary in Excel (.xlsx) format"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" /> Export Excel
          </Button>

          <Button 
            variant="outline" 
            className="rounded-xl h-10 gap-2 border-red-500/30 text-red-700 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 font-bold text-xs sm:text-sm"
            onClick={exportToPDFReport}
            title="Download landscape PDF payroll report with totals"
          >
            <FileText size={16} className="text-red-600" /> Download PDF
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl h-10 px-3 border-border" title="More Export Options">
                <Download size={16} />
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

      {/* TABLE */}
      <div className="flex-1 overflow-auto">
        <DataTable 
          columns={columns} 
          data={filteredEmployees} 
          searchKey={(row) => row.employeeName} 
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
      <EditRecordDialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        title={`Edit Payroll: ${editRecord?.employeeName}`}
        fields={editRecord ? [
          { name: "base_salary", label: "Base Salary", type: "number", defaultValue: editRecord.baseSalary },
          { name: "ot_amount", label: "OT Amount", type: "number", defaultValue: editRecord.otAmount },
          { name: "sunday_amount", label: "Sunday Amount", type: "number", defaultValue: editRecord.sundayAmount },
          { name: "bonus_amount", label: "Bonus", type: "number", defaultValue: editRecord.bonusAmount },
          { name: "deductions", label: "Deductions", type: "number", defaultValue: editRecord.deductions },
          { name: "status", label: "Status", type: "select", defaultValue: editRecord.status, options: ["Draft", "Approved", "Paid"] },
        ] : []}
        onSubmit={(data) => {
          if (!editRecord) return;
          updatePayroll.mutate({ id: editRecord.id, data: { ...data, month: editRecord.month || "2026-06" } }, {
            onSuccess: () => {
              toast.success("Payroll updated successfully");
              setEditRecord(null);
            }
          });
        }}
        isSubmitting={updatePayroll.isPending}
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
            data: { month: markPaidRecord.month || "2026-06", status: "Paid", reason } 
          }, {
            onSuccess: () => {
              toast.success("Payroll marked as paid");
              setMarkPaidRecord(null);
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

            <div className="space-y-2">
              <Label className="font-bold text-sm">Advance / Deduction Amount (₹) *</Label>
              <Input 
                type="number"
                min="0"
                placeholder="e.g. 2000"
                value={advanceAmountInput}
                onChange={(e) => setAdvanceAmountInput(e.target.value)}
                className="h-11 font-mono text-lg font-bold border-input"
                autoFocus
              />
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2 font-bold"
              disabled={isSavingAdvance || !advanceAmountInput}
              onClick={async () => {
                if (!advanceDeductEmp) return;
                setIsSavingAdvance(true);
                const dedVal = parseFloat(advanceAmountInput) || 0.0;
                try {
                  await api.post("/payroll/advances", {
                    worker_id: advanceDeductEmp.id,
                    amount: dedVal,
                    reason: advanceReasonInput || "Advance deduction"
                  }).catch(() => {});

                  updatePayroll.mutate({
                    id: advanceDeductEmp.id,
                    data: {
                      month: selectedMonth,
                      deductions: dedVal,
                      reason: advanceReasonInput || "Advance deduction"
                    }
                  }, {
                    onSuccess: () => {
                      toast.success(`Advance deduction of ₹${dedVal} saved for ${advanceDeductEmp.employeeName}`);
                      setAdvanceDeductEmp(null);
                      setIsSavingAdvance(false);
                    },
                    onError: (err: any) => {
                      toast.error(err.response?.data?.detail || "Failed to update advance");
                      setIsSavingAdvance(false);
                    }
                  });
                } catch (e) {
                  setIsSavingAdvance(false);
                }
              }}
            >
              {isSavingAdvance ? "Saving..." : "Save Advance Deduction"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
