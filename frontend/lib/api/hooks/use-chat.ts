"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ArtifactType } from "../client";
import { toast } from "sonner";

export function useChatHistory(ventureId: string, phaseNumber?: number) {
  return useQuery({
    queryKey: ["chat", ventureId, phaseNumber],
    queryFn: () => api.getChatHistory(ventureId, phaseNumber),
    enabled: !!ventureId,
  });
}

export function useSendMessage(ventureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      message,
      phaseNumber,
    }: {
      message: string;
      phaseNumber: number;
    }) => api.chat(ventureId, message, phaseNumber),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chat", ventureId, variables.phaseNumber],
      });
      queryClient.invalidateQueries({ queryKey: ["rateLimit", ventureId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useGenerateArtifact(ventureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      type,
      phaseNumber,
    }: {
      type: ArtifactType;
      phaseNumber: number;
    }) => api.generateArtifact(ventureId, type, phaseNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artifacts", ventureId] });
      queryClient.invalidateQueries({ queryKey: ["rateLimit", ventureId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", ventureId] });
      toast.success("Artifact generated!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useRateLimit(ventureId: string) {
  return useQuery({
    queryKey: ["rateLimit", ventureId],
    queryFn: () => api.getRateLimit(ventureId),
    enabled: !!ventureId,
    refetchInterval: 60000, // Refetch every minute
  });
}
