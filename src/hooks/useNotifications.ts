// sudo-reply-mobile/src/hooks/useNotifications.ts (do not remove this comment)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ENDPOINTS } from '../config/api';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export interface NotificationsData {
  notifications: Notification[];
  unreadCount: number;
}

export const useNotifications = () => {
  return useQuery<NotificationsData>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get(ENDPOINTS.notifications.getAll);
      const payload = data?.data ?? data;

      if (Array.isArray(payload)) {
        return {
          notifications: payload,
          unreadCount: payload.filter((n: any) => !n.isRead).length,
        };
      }

      return {
        notifications: payload?.notifications || [],
        unreadCount: payload?.unreadCount ?? 0,
      };
    },
    staleTime: 60_000, // Cache remains fresh for 60 seconds (instant load on open)
    refetchInterval: 60_000, // Poll in the background every 60 seconds
    refetchOnWindowFocus: false,
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(ENDPOINTS.notifications.markRead(id)),
    // Optimistic update: mark as read instantly in UI
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const previousData = qc.getQueryData<NotificationsData>(['notifications']);

      qc.setQueryData<NotificationsData>(['notifications'], (old) => {
        if (!old) return old;
        const updatedNotifs = old.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        const updatedUnread = Math.max(0, old.unreadCount - 1);
        return { notifications: updatedNotifs, unreadCount: updatedUnread };
      });

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        qc.setQueryData(['notifications'], context.previousData);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(ENDPOINTS.notifications.markAllRead),
    // Optimistic update: set all to read and count to 0 immediately
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const previousData = qc.getQueryData<NotificationsData>(['notifications']);

      qc.setQueryData<NotificationsData>(['notifications'], (old) => {
        if (!old) return old;
        const updatedNotifs = old.notifications.map((n) => ({ ...n, isRead: true }));
        return { notifications: updatedNotifs, unreadCount: 0 };
      });

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        qc.setQueryData(['notifications'], context.previousData);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(ENDPOINTS.notifications.delete(id)),
    // Optimistic update: remove item immediately from list
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const previousData = qc.getQueryData<NotificationsData>(['notifications']);

      qc.setQueryData<NotificationsData>(['notifications'], (old) => {
        if (!old) return old;
        const target = old.notifications.find((n) => n.id === id);
        const updatedNotifs = old.notifications.filter((n) => n.id !== id);
        const updatedUnread =
          target && !target.isRead ? Math.max(0, old.unreadCount - 1) : old.unreadCount;
        return { notifications: updatedNotifs, unreadCount: updatedUnread };
      });

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        qc.setQueryData(['notifications'], context.previousData);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useClearAllNotifications = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(ENDPOINTS.notifications.clearAll),
    // Optimistic update: clear list immediately
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const previousData = qc.getQueryData<NotificationsData>(['notifications']);

      qc.setQueryData<NotificationsData>(['notifications'], {
        notifications: [],
        unreadCount: 0,
      });

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        qc.setQueryData(['notifications'], context.previousData);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};