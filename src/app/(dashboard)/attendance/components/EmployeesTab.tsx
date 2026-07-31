import React, { useState } from "react";
import { Worker } from "@/types";
import { Plus, Users, UserCheck, Briefcase } from "lucide-react";
import EmployeeFormDrawer from "./EmployeeFormDrawer";
import EmployeeProfileDrawer from "./EmployeeProfileDrawer";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useWorkers } from "@/hooks/useQueries";
import { Pagination } from "@/components/ui/Pagination";

interface EmployeesTabProps {
  // no longer passing workers down, fetching inside component
}

const KNOWN_DEPARTMENTS = [
  "Fabrication", "Paint", "Assembly", "Quality", "Dispatch", "Management", 
  "CNC Machine", "Laser Cutting Machine", "Helper", "Welder", "Driver"
];

export default function EmployeesTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [customDeptFilter, setCustomDeptFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const { data: workersData, isLoading } = useWorkers({
    page,
    pageSize,
    department: departmentFilter !== "All" && departmentFilter !== "Other" ? departmentFilter : undefined,
  });

  const workers = workersData?.items ?? [];
  const totalWorkers = workersData?.total ?? 0;
  const totalPages = workersData?.total_pages ?? 1;

  const activeEmployees = workers.filter((w: any) => w.employmentStatus === "Active").length;
  const supervisors = workers.filter((w: any) => w.role === "Supervisor").length;

  const uniqueDepartments = KNOWN_DEPARTMENTS;


  const columns: ColumnDef<Worker>[] = [
    {
      id: "employeeId",
      header: "Employee ID",
      accessor: (row) => <span className="font-medium">{row.employeeId}</span>,
      sortable: true,
    },
    {
      id: "name",
      header: "Full Name",
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {row.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.mobileNumber || "No number"}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: "department",
      header: "Department",
      accessor: (row) => row.department,
      sortable: true,
    },
    {
      id: "role",
      header: "Role",
      accessor: (row) => row.role,
      sortable: true,
    },
    {
      id: "shift",
      header: "Shift",
      accessor: (row) => (
        <div>
          <p className="font-medium text-xs">{row.shiftType || "General"}</p>
          <p className="text-xs text-muted-foreground">{row.shiftStart} - {row.shiftEnd}</p>
        </div>
      ),
      sortable: true,
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => {
        const isActive = row.employmentStatus === "Active";
        return (
          <Badge variant="outline" className={isActive ? "border-emerald-500 text-emerald-500 bg-emerald-500/10" : "border-red-500 text-red-500 bg-red-500/10"}>
            {row.employmentStatus || "Active"}
          </Badge>
        );
      },
      sortable: true,
    },
  ];

  if (isLoading) return <div>Loading employees...</div>;

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      {/* OWNER KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary"><Users size={20} /></div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Employees</p>
            <h3 className="text-2xl font-bold">{totalWorkers}</h3>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500"><UserCheck size={20} /></div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Employees</p>
            <h3 className="text-2xl font-bold">{activeEmployees} (this page)</h3>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500"><Briefcase size={20} /></div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Workers / Supervisors</p>
            <h3 className="text-2xl font-bold">{workers.length - supervisors} / {supervisors} (this page)</h3>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 bg-card rounded-xl border border-border shadow-sm p-5 overflow-hidden">
        <div className="flex justify-between items-start sm:items-center mb-4 flex-col sm:flex-row gap-4">
          <div>
            <h2 className="text-lg font-semibold">Employee Directory</h2>
            <p className="text-sm text-muted-foreground">Manage your workforce, profiles, and attendance settings.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
             <select 
               value={departmentFilter} 
               onChange={(e) => {
                 setDepartmentFilter(e.target.value);
                 if (e.target.value !== "Other") setCustomDeptFilter("");
               }}
               className="flex-1 sm:flex-none bg-muted/50 border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
             >
               <option value="All">All Departments</option>
               {uniqueDepartments.map(dept => (
                 <option key={dept} value={dept}>{dept}</option>
               ))}
               <option value="Other">Other (Custom)</option>
             </select>
             {departmentFilter === "Other" && (
                <input 
                  type="text"
                  placeholder="Type department..."
                  value={customDeptFilter}
                  onChange={(e) => setCustomDeptFilter(e.target.value)}
                  className="flex-1 sm:flex-none w-32 bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
             )}
             <select 
               value={roleFilter} 
               onChange={(e) => setRoleFilter(e.target.value)}
               className="flex-1 sm:flex-none bg-muted/50 border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
             >
               <option value="All">All Roles</option>
               <option value="Worker">Worker</option>
               <option value="Supervisor">Supervisor</option>
             </select>
            <Button
              onClick={() => {
                setSelectedWorker(null);
                setIsFormOpen(true);
              }}
              className="flex-1 sm:flex-none justify-center gap-2"
            >
              <Plus size={16} /> Add Employee
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={workers}
          searchKey={(row) => `${row.name} ${row.employeeId} ${row.department} ${row.mobileNumber}`}
          onRowClick={(row) => {
            setSelectedWorker(row);
            setIsProfileOpen(true);
          }}
          rowId={(row) => row.id}
          hidePagination={true}
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalWorkers}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          isLoading={isLoading}
        />
      </div>

      <EmployeeFormDrawer
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        worker={selectedWorker}
      />
      
      <EmployeeProfileDrawer
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        worker={selectedWorker}
        onEditClick={(worker) => {
          setSelectedWorker(worker);
          setIsFormOpen(true);
        }}
      />
    </div>
  );
}
