import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Harvest, PaginatedResponse, CreateHarvestDto } from '@ncts/shared-types';
import { apiClient } from '../client';

export const harvestKeys = {
  all: ['harvests'] as const,
  lists: () => [...harvestKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...harvestKeys.lists(), params] as const,
  details: () => [...harvestKeys.all, 'detail'] as const,
  detail: (id: string) => [...harvestKeys.details(), id] as const,
};

export function useHarvests(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: harvestKeys.list(params ?? {}),
    queryFn: () => apiClient.get<PaginatedResponse<Harvest>>('/harvests', params),
    staleTime: 60_000,
  });
}

export function useHarvest(id: string) {
  return useQuery({
    queryKey: harvestKeys.detail(id),
    queryFn: () => apiClient.get<Harvest>(`/harvests/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateHarvest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHarvestDto) => apiClient.post<Harvest>('/harvests', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: harvestKeys.lists() }); },
  });
}

export function useUpdateHarvest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateHarvestDto>) => apiClient.patch<Harvest>(`/harvests/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: harvestKeys.detail(id) });
      qc.invalidateQueries({ queryKey: harvestKeys.lists() });
    },
  });
}
