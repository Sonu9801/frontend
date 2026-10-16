"use client";

import React from "react";
import { Banknote, Users, BarChart3, Settings, HandCoins } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";

// Components
import PayrollDashboardTab from "./components/PayrollDashboardTab";
import PayrollEmployeesTab from "./components/PayrollEmployeesTab";
import PayrollAnalyticsTab from "./components/PayrollAnalyticsTab";
import PayrollAdvancesTab from "./components/PayrollAdvancesTab";

export default function PayrollPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="flex-shrink-0 px-3 sm:px-6 pt-3 sm:pt-5 pb-3 border-b border-border bg-card">
        <PageHeader
          title="Payroll Command Center"
          description="Manage worker compensation, overtime calculation, advance disbursements, and wage tracking"
          icon={<Banknote className="w-5 h-5 text-emerald-600" />}
          className="mb-0 pb-0"
        />
      </div>
      <div className="flex-1 p-3 sm:p-6 overflow-y-auto pb-24 md:pb-6">
        <Tabs defaultValue="dashboard" className="w-full space-y-6">
          <div className="w-full">
            <TabsList className="w-full grid grid-cols-4 p-1 bg-muted/60 border border-border rounded-xl gap-1">
              <TabsTrigger value="dashboard" className="whitespace-nowrap px-1 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5">
                <Banknote size={14} className="shrink-0" />
                <span className="truncate">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="employees" className="whitespace-nowrap px-1 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5">
                <Users size={14} className="shrink-0" />
                <span className="truncate">Employees</span>
              </TabsTrigger>
              <TabsTrigger value="advances" className="whitespace-nowrap px-1 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5">
                <HandCoins size={14} className="shrink-0" />
                <span className="truncate">Advances</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="whitespace-nowrap px-1 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5">
                <BarChart3 size={14} className="shrink-0" />
                <span className="truncate">Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="outline-none mt-4">
            <PayrollDashboardTab />
          </TabsContent>
          <TabsContent value="employees" className="outline-none mt-4">
            <PayrollEmployeesTab />
          </TabsContent>
          <TabsContent value="advances" className="outline-none mt-4">
            <PayrollAdvancesTab />
          </TabsContent>
          <TabsContent value="analytics" className="outline-none mt-4">
            <PayrollAnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
