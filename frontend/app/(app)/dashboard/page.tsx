"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [storeReady, setStoreReady] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      useAuthStore.persist.rehydrate();
      setStoreReady(true);
    }
  }, [isClient]);

  const user = useAuthStore((state) => state.user);

  if (!isClient || !storeReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h1>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-6">
        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Welcome to Founder Toolkit!
      </h1>
      <p className="text-gray-600 mb-6">
        Logged in as: <span className="font-medium text-indigo-600">{String(user.email)}</span>
      </p>
      <div className="flex gap-4 justify-center">
        <Button onClick={() => router.push("/ventures")}>
          View Your Ventures
        </Button>
        <Button variant="outline" onClick={() => router.push("/intake")}>
          Get Started
        </Button>
      </div>
    </div>
  );
}
