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
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-30" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mx-auto">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Please log in</h1>
        <p className="text-gray-400 mb-6">Sign in to access your dashboard</p>
        <Button
          onClick={() => router.push("/login")}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 border-0"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  // Logged in - show welcome
  return (
    <div className="animate-fade-in-up">
      {/* Welcome Section */}
      <div className="text-center py-12">
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur-2xl opacity-30" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto">
            <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Founder Toolkit</span>!
        </h1>
        <p className="text-xl text-gray-400 mb-2">
          Logged in as: <span className="text-indigo-400 font-medium">{String(user.email)}</span>
        </p>
        <p className="text-gray-500 mb-8">
          Your AI-powered entrepreneurial journey starts here
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => router.push("/ventures")}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 border-0 text-lg"
          >
            View Your Ventures
          </Button>
          <Button
            onClick={() => router.push("/intake")}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-xl transition-all duration-300 text-lg"
          >
            Get Started
          </Button>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        {[
          {
            icon: "🚀",
            title: "5-Phase Journey",
            description: "A structured path from idea to scale with AI guidance at every step"
          },
          {
            icon: "🤖",
            title: "AI-Powered Coach",
            description: "24/7 AI assistant to answer questions and help you progress"
          },
          {
            icon: "📄",
            title: "Business Artifacts",
            description: "Auto-generated business plans, pitch decks, and more"
          }
        ].map((feature, index) => (
          <div
            key={feature.title}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all duration-300">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
