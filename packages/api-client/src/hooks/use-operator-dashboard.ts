import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export const operatorDashboardKeys = {
  all: ['operator-dashboard'] as const,
  dashboard: (operatorId: string) => [...operatorDashboardKeys.all, operatorId] as const,
  activity: (operatorId: string) => [...operatorDashboardKeys.all, 'activity', operatorId] as const,
  search: (query: string) => [...operatorDashboardKeys.all, 'search', query] as const,
  notifications: () => [...operatorDashboardKeys.all, 'notifications'] as const,
};

interface DashboardData {
  activePlants: number;
  pendingTransfers: number;
  monthlySales: number;
  complianceScore: number;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  entityId: string;
}

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function useOperatorDashboard(operatorId: string) {
  return useQuery({
    queryKey: operatorDashboardKeys.dashboard(operatorId),
    queryFn: () => apiClient.get<DashboardData>(`/operators/${operatorId}/dashboard`),
    enabled: !!operatorId,
  });
}

export function useActivityFeed(operatorId: string) {
  return useQuery({
    queryKey: operatorDashboardKeys.activity(operatorId),
    queryFn: () => apiClient.get<ActivityItem[]>(`/operators/${operatorId}/activity`),
    enabled: !!operatorId,
  });
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: operatorDashboardKeys.search(query),
    queryFn: () => apiClient.get<SearchResult[]>('/search', { q: query }),
    enabled: query.length >= 2,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: operatorDashboardKeys.notifications(),
    queryFn: () => apiClient.get<Notification[]>('/notifications'),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<void>(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operatorDashboardKeys.notifications() });
    },
  });
}
