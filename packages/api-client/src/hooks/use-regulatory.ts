import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RegulatoryDashboardDto, PaginatedResponse, Tenant, Permit } from '@ncts/shared-types';
import { apiClient } from '../client';

export const regulatoryKeys = {
  all: ['regulatory'] as const,
  dashboard: () => [...regulatoryKeys.all, 'dashboard'] as const,
  trends: () => [...regulatoryKeys.all, 'trends'] as const,
  geo: () => [...regulatoryKeys.all, 'geo'] as const,
  operators: (params: Record<string, unknown>) => [...regulatoryKeys.all, 'operators', params] as const,
  permits: (params: Record<string, unknown>) => [...regulatoryKeys.all, 'permits', params] as const,
  complianceAlerts: (params: Record<string, unknown>) => [...regulatoryKeys.all, 'compliance', params] as const,
};

export function useRegulatoryDashboard() {
  return useQuery({
    queryKey: regulatoryKeys.dashboard(),
    queryFn: () => apiClient.get<RegulatoryDashboardDto>('/regulatory/dashboard'),
    staleTime: 120_000,
  });
}

export interface TrendDataPoint {
  date: string;
  plants: number;
  harvests: number;
  transfers: number;
  sales: number;
}

export function useRegulatoryTrends() {
  return useQuery({
    queryKey: regulatoryKeys.trends(),
    queryFn: () => apiClient.get<TrendDataPoint[]>('/regulatory/dashboard/trends'),
    staleTime: 120_000,
  });
}

export interface FacilityGeoPoint {
  id: string;
  name: string;
  facilityType: string;
  latitude: number;
  longitude: number;
  operatorName: string;
  province: string;
  plantCount: number;
}

export function useFacilitiesGeo() {
  return useQuery({
    queryKey: regulatoryKeys.geo(),
    queryFn: () => apiClient.get<FacilityGeoPoint[]>('/regulatory/facilities/geo'),
    staleTime: 300_000,
  });
}

export function useOperators(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: regulatoryKeys.operators(params ?? {}),
    queryFn: () =>
      apiClient.get<PaginatedResponse<Tenant & { complianceScore?: number }>>('/regulatory/operators', params),
    staleTime: 120_000,
  });
}

export function usePermits(params?: { page?: number; limit?: number; status?: string; permitType?: string }) {
  return useQuery({
    queryKey: regulatoryKeys.permits(params ?? {}),
    queryFn: () =>
      apiClient.get<PaginatedResponse<Permit & { tenant?: { name: string }; facility?: { name: string; province: string } }>>('/regulatory/permits', params),
    staleTime: 120_000,
  });
}

export function useUpdatePermitStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: string; notes?: string }) =>
      apiClient.patch<Permit>(`/regulatory/permits/${vars.id}/status`, { status: vars.status, notes: vars.notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: regulatoryKeys.all }),
  });
}

export interface ComplianceAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  description: string;
  operatorName: string;
  facilityName: string;
  createdAt: string;
}

export function useComplianceAlerts(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: regulatoryKeys.complianceAlerts(params ?? {}),
    queryFn: () =>
      apiClient.get<PaginatedResponse<ComplianceAlert>>('/regulatory/compliance/alerts', params),
    staleTime: 60_000,
  });
}
