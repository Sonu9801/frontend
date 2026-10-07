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
      <div className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-3 border-b border-border bg-card">
        <PageHeader
          title="Payroll Command Center"
          description="Manage worker compensation, overtime calculation, advance disbursements, and wage tracking"
          icon={<Banknote className="w-5 h-5 text-emerald-600" />}
          className="mb-0 pb-0"
        />
      </div>
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <Tabs defaultValue="dashboard" className="w-full space-y-6">
          <div className="w-full overflow-x-auto pb-1 no-scrollbar">
            <TabsList className="inline-flex min-w-full sm:min-w-0 sm:w-auto p-1 bg-muted/60 border border-border rounded-xl gap-1">
              <TabsTrigger value="dashboard" className="flex-1 whitespace-nowrap px-4 py-2 text-xs font-semibold">
                <Banknote size={15} className="mr-1.5" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="employees" className="flex-1 whitespace-nowrap px-4 py-2 text-xs font-semibold">
                <Users size={15} className="mr-1.5" />
                Employees
              </TabsTrigger>
              <TabsTrigger value="advances" className="flex-1 whitespace-nowrap px-4 py-2 text-xs font-semibold">
                <HandCoins size={15} className="mr-1.5" />
                Advances
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex-1 whitespace-nowrap px-4 py-2 text-xs font-semibold">
                <BarChart3 size={15} className="mr-1.5" />
                Analytics
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
