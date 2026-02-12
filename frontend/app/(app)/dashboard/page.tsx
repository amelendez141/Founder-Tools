"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useVentures } from "@/lib/api/hooks/use-ventures";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
  const { data: ventures, isLoading: venturesLoading } = useVentures();

  // Show loading during SSR
  if (!isClient || !storeReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="text-center py-12 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Please log in
        </h1>
        <p className="text-gray-500 mb-6">Sign in to access your ventures</p>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    );
  }

  // Loading ventures
  if (venturesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Has existing ventures - show quick access
  if (ventures && ventures.length > 0) {
    const latestVenture = ventures[0]; // Most recent venture

    return (
      <div className="animate-fade-in-up">
        {/* Welcome header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 flex items-center justify-center shadow-xl shadow-indigo-500/25">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back!
          </h1>
          <p className="text-gray-500">
            Continue building your ventures
          </p>
        </div>

        {/* Quick access to latest venture */}
        <div className="max-w-lg mx-auto mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Continue where you left off</p>
                <h3 className="text-lg font-semibold text-gray-900">
                  {latestVenture.name || "Your Venture"}
                </h3>
              </div>
              <Link href={`/ventures/${latestVenture.id}`}>
                <Button>
                  Open
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* All ventures link */}
        <div className="text-center">
          <Link
            href="/ventures"
            className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-2"
          >
            View all {ventures.length} venture{ventures.length !== 1 ? "s" : ""}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  // No ventures yet - show get started
  return (
    <div className="text-center py-12 animate-fade-in-up">
      <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 flex items-center justify-center shadow-xl shadow-indigo-500/25">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Welcome to Founder Toolkit!
      </h1>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Your AI-powered guide to building a successful business. Let&apos;s start your entrepreneurial journey.
      </p>
      <Button onClick={() => router.push("/intake")} size="lg">
        Get Started
        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Button>
    </div>
  );
}
