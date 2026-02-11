"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUserVentures, useCreateVenture } from "@/lib/api/hooks/use-ventures";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

export default function VenturesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading } = useUserVentures(user?.id ?? "");
  const { mutate: createVenture, isPending: isCreating } = useCreateVenture();

  if (!user) {
    router.push("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const ventures = data?.ventures ?? [];
  const limit = data?.limit ?? 3;
  const canCreateMore = ventures.length < limit;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Ventures</h1>
          <p className="text-gray-600">
            {ventures.length} of {limit} ventures
          </p>
        </div>
        {canCreateMore && (
          <Button
            onClick={() => createVenture()}
            isLoading={isCreating}
          >
            Create New Venture
          </Button>
        )}
      </div>

      {ventures.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              Start your first venture
            </h3>
            <p className="text-gray-500 mt-1">
              Create a venture to begin your entrepreneurial journey
            </p>
            <Button
              className="mt-4"
              onClick={() => createVenture()}
              isLoading={isCreating}
            >
              Create Venture
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ventures.map((venture) => (
            <Link key={venture.id} href={`/ventures/${venture.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>{venture.name ?? "Unnamed Venture"}</CardTitle>
                  <CardDescription>
                    Created{" "}
                    {new Date(venture.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {venture.problem_statement ? (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {venture.problem_statement}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No problem statement yet
                    </p>
                  )}
                  <div className="mt-4">
                    <Progress value={20} />
                    <p className="text-xs text-gray-500 mt-1">In progress</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
