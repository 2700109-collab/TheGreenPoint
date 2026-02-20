import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Harvest, CreateHarvestDto } from '@ncts/shared-types';
import { apiClient } from '../client';

export const harvestKeys = {
  all: ['harvests'] as const,
  lists: () => [...harvestKeys.all, 'list'] as const,
  details: () => [...harvestKeys.all, 'detail'] as const,
  detail: (id: string) => [...harvestKeys.details(), id] as const,
};

export function useHarvest(id: string) {
  return useQuery({
    queryKey: harvestKeys.detail(id),
    queryFn: () => apiClient.get<Harvest>(`/harvests/${id}`),
    enabled: !!id,
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
