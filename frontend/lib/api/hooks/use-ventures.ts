"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Venture } from "../client";
import { toast } from "sonner";

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
      toast.success("Venture created!");
    },
    onError: (error) => {
      toast.error(error.message);
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
      toast.success("Venture updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
