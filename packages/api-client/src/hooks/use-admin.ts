import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';

export const adminKeys = {
  all: ['admin'] as const,
  inspections: (filters?: Record<string, unknown>) => [...adminKeys.all, 'inspections', filters] as const,
  inspection: (id: string) => [...adminKeys.all, 'inspection', id] as const,
  inspectionAnalytics: () => [...adminKeys.all, 'inspection-analytics'] as const,
  auditLog: (filters?: Record<string, unknown>) => [...adminKeys.all, 'audit-log', filters] as const,
  systemSettings: () => [...adminKeys.all, 'system-settings'] as const,
  adminUsers: () => [...adminKeys.all, 'users'] as const,
  salesAggregate: (period: string) => [...adminKeys.all, 'sales-aggregate', period] as const,
  complianceAverage: () => [...adminKeys.all, 'compliance-average'] as const,
};

// Types
interface Inspection {
  id: string;
  facilityId: string;
  type: string;
  status: string;
  scheduledDate: string;
  inspectorId: string;
}

interface InspectionAnalytics {
  inspectionsPerMonth: { month: string; count: number }[];
  passRate: number;
  avgRemediationDays: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  details: Record<string, unknown>;
}

interface SystemSettings {
  id: string;
  key: string;
  value: unknown;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}

export function useInspections(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: adminKeys.inspections(filters),
    queryFn: () => apiClient.get<Inspection[]>('/inspections', filters as Record<string, string | number | boolean | undefined>),
    staleTime: 60_000,
  });
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: adminKeys.inspection(id),
    queryFn: () => apiClient.get<Inspection>(`/inspections/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateInspection() {
  return useMutation({
    mutationFn: (data: Partial<Inspection>) =>
      apiClient.post<Inspection>('/inspections', data),
  });
}

export function useUpdateInspection() {
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Inspection> & { id: string }) =>
      apiClient.patch<Inspection>(`/inspections/${id}`, data),
  });
}

export function useInspectionAnalytics() {
  return useQuery({
    queryKey: adminKeys.inspectionAnalytics(),
    queryFn: () => apiClient.get<InspectionAnalytics>('/inspections/analytics'),
    staleTime: 120_000,
  });
}

export function useAuditLog(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: adminKeys.auditLog(filters),
    queryFn: () => apiClient.get<AuditLogEntry[]>('/audit', filters as Record<string, string | number | boolean | undefined>),
    staleTime: 30_000,
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: adminKeys.systemSettings(),
    queryFn: () => apiClient.get<SystemSettings[]>('/settings'),
  });
}

export function useUpdateSystemSettings() {
  return useMutation({
    mutationFn: (data: Partial<SystemSettings>) =>
      apiClient.patch<SystemSettings>('/settings', data),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.adminUsers(),
    queryFn: () => apiClient.get<AdminUser[]>('/admin/users'),
  });
}

export function useSalesAggregate(period: string) {
  return useQuery({
    queryKey: adminKeys.salesAggregate(period),
    queryFn: () => apiClient.get<{ period: string; total: number; count: number }[]>(
      '/regulatory/sales-aggregate',
      { period },
    ),
    staleTime: 120_000,
  });
}

export function useComplianceAverage() {
  return useQuery({
    queryKey: adminKeys.complianceAverage(),
    queryFn: () => apiClient.get<{ average: number; trend: number }>('/regulatory/compliance-average'),
    staleTime: 120_000,
  });
}
