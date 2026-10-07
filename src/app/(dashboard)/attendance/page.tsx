"use client";

import React from "react";
import { Clock, Users, List, Settings as SettingsIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
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
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-3 border-b border-border bg-card">
        <PageHeader
          title="Attendance Command Center"
          description="Monitor workforce attendance, shifts, real-time activity and punch logs"
          icon={<Clock className="w-5 h-5 text-primary" />}
          className="mb-0 pb-0"
        />
      </div>
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <Tabs defaultValue="dashboard" className="w-full space-y-6">
          <div className="w-full overflow-x-auto pb-1 no-scrollbar">
            <TabsList className="inline-flex justify-start sm:justify-center min-w-full sm:min-w-0 sm:w-auto p-1 bg-muted/60 border border-border rounded-xl gap-1">
              <TabsTrigger value="dashboard" className="flex-1 sm:flex-none whitespace-nowrap px-4 py-2 text-xs font-semibold">
                <Clock className="mr-2" size={15} />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="employees" className="flex-1 sm:flex-none whitespace-nowrap px-4 py-2 text-xs font-semibold">
                <Users className="mr-2" size={15} />
                Employees
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex-1 sm:flex-none whitespace-nowrap px-4 py-2 text-xs font-semibold">
                <List className="mr-2" size={15} />
                Logs
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 sm:flex-none whitespace-nowrap px-4 py-2 text-xs font-semibold">
                <SettingsIcon className="mr-2" size={15} />
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
