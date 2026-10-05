"use client";

import React from "react";
import { Banknote, Users, BarChart3, Settings } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Components
import PayrollDashboardTab from "./components/PayrollDashboardTab";
import PayrollEmployeesTab from "./components/PayrollEmployeesTab";
import PayrollAnalyticsTab from "./components/PayrollAnalyticsTab";
import PayrollAdvancesTab from "./components/PayrollAdvancesTab";
import { HandCoins } from "lucide-react";

export default function PayrollPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage worker compensation, overtime calculation, and wage tracking
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <Tabs defaultValue="dashboard" className="w-full space-y-6">
          <div className="w-full overflow-x-auto pb-1 no-scrollbar">
            <TabsList className="inline-flex min-w-full sm:min-w-0 sm:w-auto p-1 bg-slate-200/70 dark:bg-zinc-800/80 border border-slate-300/70 dark:border-zinc-700/60 rounded-xl">
              <TabsTrigger value="dashboard" className="flex-1 whitespace-nowrap px-4 py-2 text-sm font-semibold">
                <Banknote size={16} />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="employees" className="flex-1 whitespace-nowrap px-4 py-2 text-sm font-semibold">
                <Users size={16} />
                Employees
              </TabsTrigger>
              <TabsTrigger value="advances" className="flex-1 whitespace-nowrap px-4 py-2 text-sm font-semibold">
                <HandCoins size={16} />
                Advances
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex-1 whitespace-nowrap px-4 py-2 text-sm font-semibold">
                <BarChart3 size={16} />
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
