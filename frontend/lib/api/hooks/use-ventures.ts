"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Venture, type ArtifactType } from "../client";

export function useVenture(ventureId: string) {
  return useQuery({
    queryKey: ["venture", ventureId],
    queryFn: () => api.getVenture(ventureId),
    enabled: !!ventureId,
  });
}

export function useUserVentures(userId: string) {
  return useQuery({
    queryKey: ["ventures", userId],
    queryFn: () => api.getUserVentures(userId),
    enabled: !!userId,
  });
}

export function useCreateVenture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.createVenture(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventures"] });
    },
  });
}

export function useUpdateVenture(ventureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fields: Partial<Venture>) =>
      api.updateVenture(ventureId, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venture", ventureId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", ventureId] });
    },
  });
}

export function useCreateArtifact(ventureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      phaseNumber,
      type,
      content,
    }: {
      phaseNumber: number;
      type: ArtifactType;
      content: Record<string, unknown>;
    }) => api.createArtifact(ventureId, phaseNumber, type, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artifacts", ventureId] });
      queryClient.invalidateQueries({ queryKey: ["phases", ventureId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", ventureId] });
    },
  });
}
