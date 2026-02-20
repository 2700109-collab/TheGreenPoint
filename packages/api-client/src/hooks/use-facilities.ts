import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Facility, Zone, PaginatedResponse, CreateFacilityDto, UpdateFacilityDto } from '@ncts/shared-types';
import { apiClient } from '../client';

export const facilityKeys = {
  all: ['facilities'] as const,
  lists: () => [...facilityKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...facilityKeys.lists(), params] as const,
  details: () => [...facilityKeys.all, 'detail'] as const,
  detail: (id: string) => [...facilityKeys.details(), id] as const,
  zones: (facilityId: string) => [...facilityKeys.detail(facilityId), 'zones'] as const,
};

export function useFacilities(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: facilityKeys.list(params ?? {}),
    queryFn: () => apiClient.get<PaginatedResponse<Facility>>('/facilities', params),
  });
}

export function useFacility(id: string) {
  return useQuery({
    queryKey: facilityKeys.detail(id),
    queryFn: () => apiClient.get<Facility>(`/facilities/${id}`),
    enabled: !!id,
  });
}

export function useFacilityZones(facilityId: string) {
  return useQuery({
    queryKey: facilityKeys.zones(facilityId),
    queryFn: () => apiClient.get<Zone[]>(`/facilities/${facilityId}/zones`),
    enabled: !!facilityId,
  });
}

export function useCreateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFacilityDto) => apiClient.post<Facility>('/facilities', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: facilityKeys.lists() }); },
  });
}

export function useUpdateFacility(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateFacilityDto) => apiClient.patch<Facility>(`/facilities/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilityKeys.detail(id) });
      qc.invalidateQueries({ queryKey: facilityKeys.lists() });
    },
  });
}

export function useCreateZone(facilityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; capacity: number }) =>
      apiClient.post<Zone>(`/facilities/${facilityId}/zones`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: facilityKeys.zones(facilityId) }); },
  });
}
