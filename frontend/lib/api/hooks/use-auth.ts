"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "../client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useCreateUser() {
  return useMutation({
    mutationFn: (email: string) => api.createUser(email),
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useSendMagicLink() {
  return useMutation({
    mutationFn: (email: string) => api.sendMagicLink(email),
    onSuccess: () => {
      toast.success("Magic link sent! Check your email.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useVerifyToken() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (token: string) => api.verifyToken(token),
    onSuccess: (data) => {
      api.setToken(data.jwt);
      setUser(data.user);
      toast.success("Welcome back!");
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message);
      router.push("/login");
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  return () => {
    api.clearToken();
    logout();
    router.push("/");
    toast.success("Logged out successfully");
  };
}
