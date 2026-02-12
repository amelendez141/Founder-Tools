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

  // Show loading during SSR
  if (!isClient || !storeReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Please log in
        </h1>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    );
  }

  // Logged in - show simple welcome
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Welcome to Founder Toolkit!
      </h1>
      <p className="text-gray-600 mb-4">
        Logged in as: {String(user.email)}
      </p>
      <Button onClick={() => router.push("/intake")}>Get Started</Button>
    </div>
  );
}
