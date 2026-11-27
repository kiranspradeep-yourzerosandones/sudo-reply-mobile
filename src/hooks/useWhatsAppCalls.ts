import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { ENDPOINTS } from '../config/api';

export const useCheckCallPermission = (contactId: string) => {
  return useQuery({
    queryKey: ['call-permission', contactId],
    queryFn: async () => {
      const { data } = await api.get(ENDPOINTS.calls.checkPermission(contactId));
      return Boolean(data?.hasPermission ?? data?.data?.hasPermission ?? data?.permission);
    },
    enabled: !!contactId,
    staleTime: 30_000,
  });
};

export const useRequestCallPermission = () => {
  return useMutation({
    mutationFn: async ({ contactId }: { contactId: string }) => {
      const { data } = await api.post(ENDPOINTS.calls.requestPermission, { contactId });
      return data;
    },
  });
};

export const useInitiateWhatsAppCall = () => {
  return useMutation({
    mutationFn: async ({
      contactId,
      conversationId,
      sdpOffer,
    }: {
      contactId: string;
      conversationId: string | null;
      sdpOffer?: string;
    }) => {
      const { data } = await api.post(ENDPOINTS.calls.initiate, {
        contactId,
        conversationId,
        ...(sdpOffer && { sdpOffer }),
      });
      return data;
    },
  });
};

export const useTerminateWhatsAppCall = () => {
  return useMutation({
    mutationFn: async ({ wacid }: { wacid: string }) => {
      const { data } = await api.post(ENDPOINTS.calls.terminate, { wacid });
      return data;
    },
  });
};