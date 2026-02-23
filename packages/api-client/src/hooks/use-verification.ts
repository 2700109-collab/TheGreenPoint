import { useQuery } from '@tanstack/react-query';
import type { ProductVerificationDto } from '@ncts/shared-types';
import { apiClient } from '../client';

export const verifyKeys = {
  all: ['verify'] as const,
  byTracking: (trackingId: string) => [...verifyKeys.all, trackingId] as const,
};

export function useVerifyProduct(trackingId: string) {
  return useQuery({
    queryKey: verifyKeys.byTracking(trackingId),
    queryFn: () => apiClient.get<ProductVerificationDto>(`/verify/${trackingId}`),
    enabled: !!trackingId,
    retry: false,
    staleTime: 600_000,
  });
}
