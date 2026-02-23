import { useQuery } from '@tanstack/react-query';
import type { ProductVerificationDto } from '@ncts/shared-types';
import { apiClient } from '../client';

export const verifyKeys = {
  all: ['verify'] as const,
  byTracking: (trackingId: string) => [...verifyKeys.all, trackingId] as const,
};

export function useVerifyProduct(trackingId: string) {
  console.log('[VERIFY-HOOK-DEBUG] useVerifyProduct called', { trackingId, enabled: !!trackingId });
  return useQuery({
    queryKey: verifyKeys.byTracking(trackingId),
    queryFn: async () => {
      console.log('[VERIFY-HOOK-DEBUG] queryFn executing for', trackingId);
      try {
        const result = await apiClient.get<ProductVerificationDto>(`/verify/${trackingId}`);
        console.log('[VERIFY-HOOK-DEBUG] queryFn SUCCESS', result);
        return result;
      } catch (err) {
        console.error('[VERIFY-HOOK-DEBUG] queryFn ERROR', err);
        throw err;
      }
    },
    enabled: !!trackingId,
    retry: false,
  });
}
