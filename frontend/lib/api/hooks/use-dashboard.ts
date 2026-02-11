"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../client";

export function useDashboard(ventureId: string) {
  return useQuery({
    queryKey: ["dashboard", ventureId],
    queryFn: () => api.getDashboard(ventureId),
    enabled: !!ventureId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useSuggestedActions(ventureId: string) {
  return useQuery({
    queryKey: ["suggestedActions", ventureId],
    queryFn: () => api.getSuggestedActions(ventureId),
    enabled: !!ventureId,
  });
}
