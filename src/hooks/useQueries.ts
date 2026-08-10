import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  vehiclesApi, 
  workersApi, 
  qualityApi, 
  dispatchApi, 
  invoicesApi, 
  revenueApi,
  activitiesApi,
  notificationsApi,
  attendanceApi,
  payrollApi,
  jobsApi,
  performanceApi
} from "@/lib/api";
import type { Vehicle, Worker, QCRecord, DispatchRecord, ActivityEvent } from "@/types";

export function useVehicles(params?: { page?: number; pageSize?: number; search?: string }) {
  return useQuery<any>({
    queryKey: ["vehicles", params?.page, params?.pageSize, params?.search],
    queryFn: () => vehiclesApi.getAll(params),
  });
}

export function useWorkers(params?: { page?: number; pageSize?: number; search?: string; department?: string; status?: string }) {
  return useQuery<any>({
    queryKey: ["workers", params?.page, params?.pageSize, params?.search, params?.department, params?.status],
    queryFn: () => workersApi.getAll(params),
  });
}

export function useWorkerPerformance(month?: string) {
  return useQuery({
    queryKey: ["workerPerformance", month],
    queryFn: () => workersApi.getPerformanceMonthly(month),
  });
}

export function usePerformanceDashboard(params?: { date?: string; month?: string; department?: string; supervisor_id?: number }) {
  return useQuery({
    queryKey: ["performanceDashboard", params?.date, params?.month, params?.department, params?.supervisor_id],
    queryFn: () => performanceApi.getDashboard(params),
  });
}

export function usePerformanceWorkers(params?: { date?: string; page?: number; page_size?: number; search?: string; sort_by?: string; sort_order?: string; department?: string }) {
  return useQuery({
    queryKey: ["performanceWorkers", params?.date, params?.page, params?.page_size, params?.search, params?.sort_by, params?.sort_order, params?.department],
    queryFn: () => performanceApi.getWorkers(params),
  });
}

export function usePerformanceWorker(workerId: string | number | null, params?: { date?: string; history_days?: number }) {
  return useQuery({
    queryKey: ["performanceWorker", workerId, params?.date, params?.history_days],
    queryFn: () => workerId ? performanceApi.getWorker(workerId, params) : null,
    enabled: !!workerId
  });
}

export function useAttendanceSettings() {
  return useQuery({
    queryKey: ["attendanceSettings"],
    queryFn: attendanceApi.getSettings,
  });
}

export function useQCRecords(params?: { page?: number; pageSize?: number; search?: string }) {
  return useQuery<any>({
    queryKey: ["qcRecords", params?.page, params?.pageSize, params?.search],
    queryFn: () => qualityApi.getAll(params),
  });
}

export function useDispatchRecords(params?: { page?: number; pageSize?: number; search?: string }) {
  return useQuery<any>({
    queryKey: ["dispatchRecords", params?.page, params?.pageSize, params?.search],
    queryFn: () => dispatchApi.getAll(params),
  });
}

export function useInvoices(params?: { page?: number; pageSize?: number; search?: string; approval_status?: string; payment_status?: string; vendor?: string; department?: string; category?: string; start_date?: string; end_date?: string; date_from?: string; date_to?: string }) {
  return useQuery<any>({
    queryKey: ["invoices", params?.page, params?.pageSize, params?.search, params?.approval_status, params?.payment_status, params?.vendor, params?.department, params?.category, params?.start_date, params?.end_date, params?.date_from, params?.date_to],
    queryFn: () => invoicesApi.getAll(params),
  });
}

export function useInvoiceDashboardStats(params?: { start_date?: string; end_date?: string }) {
  return useQuery<any>({
    queryKey: ["invoiceStats", params],
    queryFn: () => invoicesApi.getDashboardStats(params),
  });
}

export function useInvoiceAnalytics(params?: { start_date?: string; end_date?: string }) {
  return useQuery<any>({
    queryKey: ["invoiceAnalytics", params],
    queryFn: () => invoicesApi.getAnalytics(params),
  });
}

export function useActivities() {
  return useQuery<ActivityEvent[]>({
    queryKey: ["activities"],
    queryFn: activitiesApi.getAll,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getAll(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

export function useAttendanceAnalytics() {
  return useQuery({
    queryKey: ["attendanceAnalytics"],
    queryFn: () => attendanceApi.getAnalytics(),
  });
}

export function useAttendanceLogs(params?: { page?: number; pageSize?: number; search?: string; status?: string; department?: string; date_from?: string; date_to?: string }) {
  return useQuery<any>({
    queryKey: ["attendanceLogs", params?.page, params?.pageSize, params?.search, params?.status, params?.department, params?.date_from, params?.date_to],
    queryFn: () => attendanceApi.getLogs(params),
  });
}

export function useAttendanceExceptions() {
  return useQuery({
    queryKey: ["attendanceExceptions"],
    queryFn: () => attendanceApi.getExceptions(),
  });
}

export function useApproveException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) => attendanceApi.approveException(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceExceptions"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceLogs"] });
    }
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) => attendanceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceLogs"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceAnalytics"] });
    }
  });
}

// Mutations
export function useUpdateVehicleStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, progress, priority, reason }: { id: number | string; stage: string; progress?: number; priority?: string; reason?: string }) =>
      vehiclesApi.updateStage(id, stage, progress, priority, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["dispatchRecords"] });
    },
  });
}

export function useVerifyVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) => vehiclesApi.verify(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useRejectVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) => vehiclesApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useUpdateWorkerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: number | string; status: string; reason: string }) =>
      workersApi.updateStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useArchiveWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) =>
      workersApi.archive(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useResetWorkerPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) =>
      workersApi.resetPassword(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useCreateQCRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => qualityApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qcRecords"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useUpdateQCRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) => qualityApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qcRecords"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useUploadQCPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number | string; file: File }) => qualityApi.uploadPhoto(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qcRecords"] });
    },
  });
}

export function useCreateDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => qualityApi.createDefect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qcRecords"] });
    },
  });
}

export function useCreateWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useUpdateWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => workersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useUpdateDefectStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number | string; status: string }) => qualityApi.updateDefectStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qcRecords"] });
    },
  });
}

export function useCreateDispatchRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => dispatchApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatchRecords"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useUpdateDispatchRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) => dispatchApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatchRecords"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useUploadInvoice() {
  return useMutation({
    mutationFn: (file: File) => invoicesApi.upload(file),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => invoicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoiceStats"] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) =>
      invoicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoiceStats"] });
    },
  });
}

// Revenue Hooks
export function useRevenue(params?: { page?: number; pageSize?: number; search?: string; approval_status?: string; payment_status?: string; customer?: string; oem?: string; work_type?: string; start_date?: string; end_date?: string }) {
  return useQuery<any>({
    queryKey: ["revenue", params?.page, params?.pageSize, params?.search, params?.approval_status, params?.payment_status, params?.customer, params?.oem, params?.work_type, params?.start_date, params?.end_date],
    queryFn: () => revenueApi.getAll(params),
  });
}

export function useRevenueDashboardStats(params?: { start_date?: string; end_date?: string }) {
  return useQuery<any>({
    queryKey: ["revenueStats", params],
    queryFn: () => revenueApi.getDashboardStats(params),
  });
}

export function useRevenueAnalytics(params?: { start_date?: string; end_date?: string }) {
  return useQuery<any>({
    queryKey: ["revenueAnalytics", params],
    queryFn: () => revenueApi.getAnalytics(params),
  });
}

export function useUploadSalesInvoice() {
  return useMutation({
    mutationFn: (file: File) => revenueApi.upload(file),
  });
}

export function useCreateSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => revenueApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      queryClient.invalidateQueries({ queryKey: ["revenueStats"] });
    },
  });
}

export function useUpdateSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) =>
      revenueApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      queryClient.invalidateQueries({ queryKey: ["revenueStats"] });
    },
  });
}

export function useDeleteSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => revenueApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      queryClient.invalidateQueries({ queryKey: ["revenueStats"] });
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => vehiclesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useOemSubmitVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => vehiclesApi.oemSubmit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkNotificationClicked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => notificationsApi.markAsClicked(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function usePayrollSummary(month?: string) {
  return useQuery({
    queryKey: ["payrollSummary", month],
    queryFn: () => payrollApi.getSummary(month),
  });
}

export function useEmployeePayroll(month?: string) {
  return useQuery({
    queryKey: ["employeePayroll", month],
    queryFn: () => payrollApi.getEmployeePayroll(month),
  });
}

export function useUpdateEmployeePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) => payrollApi.updateEmployeePayroll(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeePayroll"] });
    }
  });
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month?: string) => payrollApi.generate(month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeePayroll"] });
    }
  });
}

export function useWorkerSummary(workerId: string | number) {
  return useQuery({
    queryKey: ["workerSummary", workerId],
    queryFn: () => attendanceApi.getWorkerSummary(workerId),
    enabled: !!workerId,
  });
}

export function useWorkerHistory(workerId: string | number) {
  return useQuery({
    queryKey: ["workerHistory", workerId],
    queryFn: () => attendanceApi.getWorkerHistory(workerId),
    enabled: !!workerId,
  });
}

export function useWorkerMonthlySummary(workerId: string | number, month?: string) {
  return useQuery({
    queryKey: ["workerMonthlySummary", workerId, month],
    queryFn: () => attendanceApi.getWorkerMonthlySummary(workerId, month),
    enabled: !!workerId,
  });
}

export const useWorkerJobs = (workerId: string | number | undefined) => {
  return useQuery({
    queryKey: ["workerJobs", workerId],
    queryFn: () => jobsApi.getWorkerJobs(workerId!),
    enabled: !!workerId,
  });
};

export const useLeaveHistory = (workerId: string | number | undefined) => {
  return useQuery({
    queryKey: ["leaveHistory", workerId],
    queryFn: () => attendanceApi.getLeaveHistory(workerId!),
    enabled: !!workerId,
  });
};

export function useSubmitPunch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => attendanceApi.update(data.worker_id, data), // This should actually be whatever the punch API is, or offline queue logic
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workerSummary", variables.worker_id] });
      queryClient.invalidateQueries({ queryKey: ["workerHistory", variables.worker_id] });
      queryClient.invalidateQueries({ queryKey: ["workerMonthlySummary", variables.worker_id] });
    }
  });
}

export function useDeleteWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => workersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useDeleteAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => attendanceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceLogs"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceAnalytics"] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => invoicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoiceStats"] });
    },
  });
}

export function useDeletePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, month }: { id: number | string, month: string }) => payrollApi.deleteEmployeePayroll(id, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeePayroll"] });
      queryClient.invalidateQueries({ queryKey: ["payrollSummary"] });
    },
  });
}
