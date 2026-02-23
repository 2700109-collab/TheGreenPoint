import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Plant,
  PaginatedResponse,
  CreatePlantDto,
  BatchCreatePlantsDto,
  UpdatePlantStateDto,
  PlantFilterDto,
} from '@ncts/shared-types';
import { apiClient } from '../client';

export const plantKeys = {
  all: ['plants'] as const,
  lists: () => [...plantKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...plantKeys.lists(), params] as const,
  details: () => [...plantKeys.all, 'detail'] as const,
  detail: (id: string) => [...plantKeys.details(), id] as const,
};

export function usePlants(params?: Partial<PlantFilterDto>) {
  return useQuery({
    queryKey: plantKeys.list(params ?? {}),
    queryFn: () =>
      apiClient.get<PaginatedResponse<Plant>>('/plants', params),
    staleTime: 60_000,
  });
}

export function usePlant(id: string) {
  return useQuery({
    queryKey: plantKeys.detail(id),
    queryFn: () => apiClient.get<Plant>(`/plants/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreatePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlantDto) => apiClient.post<Plant>('/plants', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: plantKeys.lists() }); },
  });
}

export function useBatchRegisterPlants() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BatchCreatePlantsDto) => apiClient.post<Plant[]>('/plants/batch-register', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: plantKeys.lists() }); },
  });
}

export function useUpdatePlantState(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePlantStateDto) => apiClient.patch<Plant>(`/plants/${id}/state`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: plantKeys.detail(id) });
      qc.invalidateQueries({ queryKey: plantKeys.lists() });
    },
  });
}
