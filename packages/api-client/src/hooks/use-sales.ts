import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Sale, PaginatedResponse, CreateSaleDto } from '@ncts/shared-types';
import { apiClient } from '../client';

export const saleKeys = {
  all: ['sales'] as const,
  lists: () => [...saleKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...saleKeys.lists(), params] as const,
  details: () => [...saleKeys.all, 'detail'] as const,
  detail: (id: string) => [...saleKeys.details(), id] as const,
};

export function useSales(params?: {
  page?: number;
  limit?: number;
  facilityId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: saleKeys.list(params ?? {}),
    queryFn: () => apiClient.get<PaginatedResponse<Sale>>('/sales', params),
    staleTime: 30_000,
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: () => apiClient.get<Sale>(`/sales/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useRecordSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSaleDto) => apiClient.post<Sale>('/sales', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: saleKeys.lists() }); },
  });
}
