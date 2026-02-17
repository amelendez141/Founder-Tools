"use client";

import { useRouter } from "next/navigation";
import { useAuthStore, useHasHydrated } from "@/lib/stores/auth-store";
import { useUserVentures, useCreateVenture } from "@/lib/api/hooks/use-ventures";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

export default function VenturesPage() {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading } = useUserVentures(user?.id ?? "");
  const { mutate: createVenture, isPending: isCreating } = useCreateVenture();

  // Wait for hydration before checking auth
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const ventures = data?.ventures ?? [];
  const limit = data?.limit ?? 10;
  const canCreateMore = ventures.length < limit;

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Ventures</h1>
          <p className="text-gray-400 mt-1">
            <span className="text-indigo-400 font-medium">{ventures.length}</span> of{" "}
            <span className="text-indigo-400 font-medium">{limit}</span> ventures
          </p>
        </div>
        {canCreateMore && (
          <Button
            onClick={() => createVenture()}
            isLoading={isCreating}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 border-0"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Venture
          </Button>
        )}
      </div>

      {ventures.length === 0 ? (
        /* Empty State */
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl" />
          <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-xl opacity-30" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mx-auto">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Start your first venture
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create a venture to begin your entrepreneurial journey with AI-powered guidance
            </p>
            <Button
              onClick={() => createVenture()}
              isLoading={isCreating}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 border-0 text-lg"
            >
              Create Your First Venture
            </Button>
          </div>
        </div>
      ) : (
        /* Ventures Grid */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ventures.map((venture, index) => (
            <Link key={venture.id} href={`/ventures/${venture.id}`}>
              <div className="relative group h-full">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative h-full bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 hover:border-indigo-500/50 transition-all duration-300 overflow-hidden">
                  {/* Gradient accent bar */}
                  <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                        {venture.name ?? "Unnamed Venture"}
                      </h3>
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-4">
                      Created {new Date(venture.created_at).toLocaleDateString()}
                    </p>

                    {venture.problem_statement ? (
                      <p className="text-sm text-gray-400 line-clamp-3 mb-4">
                        {venture.problem_statement}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 italic mb-4">
                        No problem statement yet
                      </p>
                    )}

                    <div className="mt-auto">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>Progress</span>
                        <span className="text-indigo-400">In progress</span>
                      </div>
                      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="absolute inset-0 h-full w-1/5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Usage indicator */}
      {ventures.length > 0 && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.03] rounded-full border border-white/10">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-sm text-gray-400">
              {limit - ventures.length} venture{limit - ventures.length !== 1 ? 's' : ''} remaining
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
