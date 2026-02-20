import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LabResult, PaginatedResponse, CreateLabResultDto } from '@ncts/shared-types';
import { apiClient } from '../client';

export const labResultKeys = {
  all: ['labResults'] as const,
  lists: () => [...labResultKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...labResultKeys.lists(), params] as const,
  details: () => [...labResultKeys.all, 'detail'] as const,
  detail: (id: string) => [...labResultKeys.details(), id] as const,
  byBatch: (batchId: string) => [...labResultKeys.all, 'batch', batchId] as const,
};

export function useLabResults(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: labResultKeys.list(params ?? {}),
    queryFn: () => apiClient.get<PaginatedResponse<LabResult>>('/lab-results', params),
  });
}

export function useLabResult(id: string) {
  return useQuery({
    queryKey: labResultKeys.detail(id),
    queryFn: () => apiClient.get<LabResult>(`/lab-results/${id}`),
    enabled: !!id,
  });
}

export function useLabResultsByBatch(batchId: string) {
  return useQuery({
    queryKey: labResultKeys.byBatch(batchId),
    queryFn: () => apiClient.get<LabResult[]>(`/lab-results/batch/${batchId}`),
    enabled: !!batchId,
  });
}

export function useSubmitLabResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLabResultDto) => apiClient.post<LabResult>('/lab-results', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: labResultKeys.lists() }); },
  });
}
