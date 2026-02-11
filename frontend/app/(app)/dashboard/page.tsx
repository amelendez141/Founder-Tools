"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUserVentures } from "@/lib/api/hooks/use-ventures";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading } = useUserVentures(user?.id ?? "");

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const ventures = data?.ventures ?? [];

  if (ventures.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to Founder Toolkit!
        </h1>
        <p className="text-gray-600 mb-8">
          Let&apos;s start by setting up your first venture.
        </p>
        <Button onClick={() => router.push("/intake")}>Get Started</Button>
      </div>
    );
  }

  // For now, redirect to first venture if there's only one
  if (ventures.length === 1) {
    router.push(`/ventures/${ventures[0].id}`);
    return null;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Ventures</h1>
        {ventures.length < (data?.limit ?? 3) && (
          <Button onClick={() => router.push("/intake")}>
            Create New Venture
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ventures.map((venture) => (
          <Link key={venture.id} href={`/ventures/${venture.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>{venture.name ?? "Unnamed Venture"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {venture.problem_statement ?? "No problem statement yet"}
                </p>
                <div className="mt-4">
                  <Progress value={20} />
                  <p className="text-xs text-gray-500 mt-1">Phase 1 of 5</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
