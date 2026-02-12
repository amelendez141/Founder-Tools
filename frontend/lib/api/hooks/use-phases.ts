"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export function useEnrichedPhases(ventureId: string) {
  return useQuery({
    queryKey: ["phases", ventureId],
    queryFn: () => api.getEnrichedPhases(ventureId),
    enabled: !!ventureId,
  });
}

export function useEvaluateGate(ventureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (phaseNum: number) => api.evaluateGate(ventureId, phaseNum),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phases", ventureId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", ventureId] });
    },
  });
}

export function useUpdateGate(ventureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      phaseNum,
      key,
      satisfied,
    }: {
      phaseNum: number;
      key: string;
      satisfied: boolean;
    }) => api.updateGate(ventureId, phaseNum, key, satisfied),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phases", ventureId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", ventureId] });
    },
  });
}
