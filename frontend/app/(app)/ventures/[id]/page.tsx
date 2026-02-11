"use client";

import { use } from "react";
import { useVenture } from "@/lib/api/hooks/use-ventures";
import { useDashboard, useSuggestedActions } from "@/lib/api/hooks/use-dashboard";
import { useEnrichedPhases } from "@/lib/api/hooks/use-phases";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const PHASE_NAMES = [
  "Discovery",
  "Planning",
  "Formation",
  "Launch",
  "Scale",
];

export default function VenturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ventureId } = use(params);
  const { data: venture, isLoading: ventureLoading } = useVenture(ventureId);
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard(ventureId);
  const { data: phases } = useEnrichedPhases(ventureId);
  const { data: suggestedActions } = useSuggestedActions(ventureId);

  if (ventureLoading || dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!venture || !dashboard) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Venture not found</h1>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {venture.name ?? "Your Venture"}
        </h1>
        <p className="text-gray-600 mt-1">
          Phase {dashboard.current_phase}: {dashboard.current_phase_name}
        </p>
      </div>

      {/* Phase Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Your Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            {PHASE_NAMES.map((name, index) => {
              const phaseNum = index + 1;
              const phase = phases?.find((p) => p.phase_number === phaseNum);
              const isComplete = phase?.status === "COMPLETE";
              const isActive = phase?.status === "ACTIVE";
              const isLocked = phase?.status === "LOCKED";

              return (
                <div key={phaseNum} className="flex flex-col items-center flex-1">
                  <div className="relative">
                    {/* Line connector */}
                    {index < PHASE_NAMES.length - 1 && (
                      <div
                        className={cn(
                          "absolute top-4 left-8 w-full h-0.5",
                          isComplete ? "bg-green-500" : "bg-gray-200"
                        )}
                      />
                    )}
                    {/* Phase dot */}
                    <div
                      className={cn(
                        "relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                        isComplete && "bg-green-500 text-white",
                        isActive && "bg-primary-600 text-white",
                        isLocked && "bg-gray-200 text-gray-500"
                      )}
                    >
                      {isComplete ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        phaseNum
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs text-center",
                      isActive ? "text-primary-600 font-medium" : "text-gray-500"
                    )}
                  >
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Overall Progress</span>
              <span>{dashboard.overall_progress.percentage}%</span>
            </div>
            <Progress value={dashboard.overall_progress.percentage} />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {dashboard.overall_progress.phases_completed}/{dashboard.overall_progress.total_phases}
            </div>
            <p className="text-sm text-gray-500">Phases Complete</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {dashboard.current_phase_progress.gates_satisfied}/{dashboard.current_phase_progress.total_gates}
            </div>
            <p className="text-sm text-gray-500">Current Phase Gates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {dashboard.artifacts_generated}
            </div>
            <p className="text-sm text-gray-500">Artifacts Generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary-600">
              {dashboard.streak.current_days} days
            </div>
            <p className="text-sm text-gray-500">Current Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Action & Rate Limit */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Next Step</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{dashboard.next_action.message}</p>
            <div className="mt-4 flex gap-3">
              <Link href={`/ventures/${ventureId}/phase/${dashboard.current_phase}`}>
                <Button>View Phase Details</Button>
              </Link>
              <Link href={`/ventures/${ventureId}/chat`}>
                <Button variant="outline">Chat with AI</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Usage Today</CardTitle>
            <CardDescription>
              {dashboard.rate_limit.remaining_today} messages remaining
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={
                ((dashboard.rate_limit.messages_limit - dashboard.rate_limit.remaining_today) /
                  dashboard.rate_limit.messages_limit) *
                100
              }
            />
            <p className="text-xs text-gray-500 mt-2">
              Resets at {new Date(dashboard.rate_limit.resets_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Suggested Actions */}
      {suggestedActions?.actions && suggestedActions.actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestedActions.actions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <svg
                      className="h-4 w-4 text-primary-600"
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
                  <span className="text-sm text-gray-700">{action.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
