"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "../client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useRouter } from "next/navigation";

export function useRegister() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.register(email, password),
    onSuccess: (data) => {
      api.setToken(data.jwt);
      setUser(data.user);
      // Small delay to ensure state is persisted before navigation
      setTimeout(() => {
        router.push("/dashboard");
      }, 100);
    },
  });
}

export function useLogin() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (data) => {
      api.setToken(data.jwt);
      setUser(data.user);
      // Small delay to ensure state is persisted before navigation
      setTimeout(() => {
        router.push("/dashboard");
      }, 100);
    },
  });
}

// Legacy hooks (kept for backward compatibility with verify page)
export function useCreateUser() {
  return useMutation({
    mutationFn: (email: string) => api.createUser(email),
  });
}

export function useSendMagicLink() {
  return useMutation({
    mutationFn: (email: string) => api.sendMagicLink(email),
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
      // Small delay to ensure state is persisted before navigation
      setTimeout(() => {
        router.push("/dashboard");
      }, 100);
    },
    onError: () => {
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
  };
}
