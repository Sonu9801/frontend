"use client";

import React from "react";
import { Clock, Users, List, Settings as SettingsIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWorkers } from "@/hooks/useQueries";

// Components for tabs
import DashboardTab from "./components/DashboardTab";
import EmployeesTab from "./components/EmployeesTab";
import LogsTab from "./components/LogsTab";
import SettingsTab from "./components/SettingsTab";

export default function AttendancePage() {
  const { data: workersData, isLoading } = useWorkers({ pageSize: 1000 });
  const workers = workersData?.items ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track workforce check-ins and attendance logs
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <Tabs defaultValue="dashboard" className="w-full space-y-6">
          <div className="w-full overflow-x-auto pb-1 no-scrollbar">
            <TabsList className="inline-flex justify-start sm:justify-center min-w-full sm:min-w-0 sm:w-auto p-1 bg-slate-200/70 dark:bg-zinc-800/80 border border-slate-300/70 dark:border-zinc-700/60 rounded-xl gap-1">
              <TabsTrigger value="dashboard" className="flex-1 sm:flex-none whitespace-nowrap px-4 py-2 text-sm font-semibold">
                <Clock className="mr-2" size={16} />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="employees" className="flex-1 sm:flex-none whitespace-nowrap px-4 py-2 text-sm font-semibold">
                <Users className="mr-2" size={16} />
                Employees
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex-1 sm:flex-none whitespace-nowrap px-4 py-2 text-sm font-semibold">
                <List className="mr-2" size={16} />
                Logs
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 sm:flex-none whitespace-nowrap px-4 py-2 text-sm font-semibold">
                <SettingsIcon className="mr-2" size={16} />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="outline-none mt-4">
            <DashboardTab workers={workers} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="employees" className="outline-none mt-4">
            <EmployeesTab />
          </TabsContent>
          <TabsContent value="logs" className="outline-none mt-4">
            <LogsTab />
          </TabsContent>
          <TabsContent value="settings" className="outline-none mt-4">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
