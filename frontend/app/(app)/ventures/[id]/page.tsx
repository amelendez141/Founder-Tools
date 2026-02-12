"use client";

import { useState, useEffect } from "react";
import { useVenture, useUpdateVenture } from "@/lib/api/hooks/use-ventures";
import { useDashboard, useSuggestedActions } from "@/lib/api/hooks/use-dashboard";
import { useEnrichedPhases } from "@/lib/api/hooks/use-phases";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { CelebrationModal } from "@/components/ui/confetti";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const PHASE_NAMES = [
  "Discovery",
  "Planning",
  "Formation",
  "Launch",
  "Scale",
];

const PHASE_ICONS = ["🔍", "📋", "🏗️", "🚀", "📈"];

export default function VenturePage({
  params,
}: {
  params: { id: string };
}) {
  const { id: ventureId } = params;
  const { data: ventureData, isLoading: ventureLoading } = useVenture(ventureId);
  const venture = ventureData?.venture;
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard(ventureId);
  const { data: phases } = useEnrichedPhases(ventureId);
  const { data: suggestedActions } = useSuggestedActions(ventureId);
  const { mutate: updateVenture } = useUpdateVenture(ventureId);

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState({ title: "", message: "" });
  const [isEditingName, setIsEditingName] = useState(false);
  const [ventureName, setVentureName] = useState("");

  // Initialize venture name
  useEffect(() => {
    if (venture?.name) {
      setVentureName(venture.name);
    }
  }, [venture?.name]);

  // Check for milestones
  useEffect(() => {
    if (dashboard) {
      const progress = dashboard.overall_progress.percentage;
      if (progress === 20 && !localStorage.getItem(`celebrated-20-${ventureId}`)) {
        setCelebrationMessage({
          title: "Phase 1 Complete!",
          message: "You've finished Discovery. You're making great progress!"
        });
        setShowCelebration(true);
        localStorage.setItem(`celebrated-20-${ventureId}`, "true");
      }
    }
  }, [dashboard, ventureId]);

  const handleSaveName = () => {
    if (ventureName.trim()) {
      updateVenture({ name: ventureName.trim() });
    }
    setIsEditingName(false);
  };

  if (ventureLoading || dashboardLoading) {
    return <DashboardSkeleton />;
  }

  if (!venture || !dashboard) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900">Venture not found</h1>
        <p className="text-gray-600 mt-2">This venture may have been deleted or doesn't exist.</p>
        <Link href="/ventures">
          <Button className="mt-4">View All Ventures</Button>
        </Link>
      </div>
    );
  }

  const phasesArray = Array.isArray(phases) ? phases : [];
  const completedPhasesCount = phasesArray.filter(p => p.status === "COMPLETE").length;
  const phase5Active = phasesArray.find(p => p.phase_number === 5)?.status === "ACTIVE";
  const isJourneyComplete = completedPhasesCount >= 4 || phase5Active || dashboard.current_phase === 5;
  const displayProgress = isJourneyComplete ? 100 : dashboard.overall_progress.percentage;

  return (
    <>
      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        title={celebrationMessage.title}
        message={celebrationMessage.message}
      />

      <div className="space-y-8">
        {/* Completion Banner - Shows when journey is complete */}
        {isJourneyComplete && (
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-2xl p-8 shadow-2xl animate-fade-in border border-emerald-400/30">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-5">
                <div className="text-6xl animate-bounce">🎉</div>
                <div>
                  <h2 className="text-3xl font-bold">Journey Complete!</h2>
                  <p className="text-emerald-100 text-lg mt-1">Your business plan is ready for investors and mentors.</p>
                </div>
              </div>
              <Link href={`/ventures/${ventureId}/summary`}>
                <Button className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all">
                  📄 View Business Plan & Export PDF
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="animate-fade-in-down">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center text-2xl shadow-lg">
              {PHASE_ICONS[dashboard.current_phase - 1] || "🎯"}
            </div>
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ventureName}
                    onChange={(e) => setVentureName(e.target.value)}
                    placeholder="Enter venture name"
                    className="text-2xl font-bold text-gray-900 border-b-2 border-primary-500 bg-transparent focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setIsEditingName(false);
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    className="text-green-600 hover:text-green-700"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <h1
                  className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-primary-600 transition-colors group"
                  onClick={() => setIsEditingName(true)}
                  title="Click to edit name"
                >
                  {venture.name || "Unnamed Venture"}
                  <span className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 text-sm">✏️</span>
                </h1>
              )}
              <p className="text-gray-600">
                Phase {dashboard.current_phase}: {dashboard.current_phase_name}
              </p>
            </div>
          </div>
        </div>

        {/* Phase Timeline */}
        <Card className="animate-fade-in-up card-hover overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Your Journey</span>
              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {displayProgress}% complete
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              {PHASE_NAMES.map((name, index) => {
                const phaseNum = index + 1;
                const phase = phasesArray.find((p) => p.phase_number === phaseNum);
                const isComplete = phase?.status === "COMPLETE";
                const isActive = phase?.status === "ACTIVE";
                const isLocked = !isComplete && !isActive;

                return (
                  <div
                    key={phaseNum}
                    className={cn(
                      "flex flex-col items-center flex-1 relative",
                      "animate-fade-in-up",
                      `stagger-${index + 1}`
                    )}
                  >
                    {/* Line connector */}
                    {index < PHASE_NAMES.length - 1 && (
                      <div
                        className={cn(
                          "absolute top-5 left-[60%] w-[80%] h-1 rounded-full transition-all duration-500",
                          isComplete ? "bg-gradient-to-r from-green-500 to-green-400" : "bg-gray-200"
                        )}
                      />
                    )}
                    {/* Phase dot */}
                    <div
                      className={cn(
                        "relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-all duration-300",
                        isComplete && "bg-gradient-success text-white shadow-lg shadow-green-500/30",
                        isActive && "bg-gradient-primary text-white shadow-lg shadow-primary-500/30 animate-pulse-soft",
                        isLocked && "bg-gray-100 text-gray-400 border-2 border-gray-200"
                      )}
                    >
                      {isComplete ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span>{PHASE_ICONS[index]}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-xs text-center font-medium transition-colors",
                        isComplete && "text-green-600",
                        isActive && "text-primary-600",
                        isLocked && "text-gray-400"
                      )}
                    >
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="relative">
              <Progress value={displayProgress} className="h-3" />
              <div
                className="absolute top-0 left-0 h-3 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              value: `${dashboard.overall_progress.phases_completed}/${dashboard.overall_progress.total_phases}`,
              label: "Phases Complete",
              icon: "🏆",
              color: "from-amber-400 to-orange-500",
            },
            {
              value: `${dashboard.current_phase_progress.gates_satisfied}/${dashboard.current_phase_progress.total_gates}`,
              label: "Current Gates",
              icon: "🚪",
              color: "from-blue-400 to-indigo-500",
            },
            {
              value: dashboard.artifacts_generated,
              label: "Artifacts",
              icon: "📄",
              color: "from-emerald-400 to-teal-500",
            },
            {
              value: `${dashboard.streak.current_days}`,
              label: "Day Streak",
              icon: "🔥",
              color: "from-red-400 to-pink-500",
            },
          ].map((stat, index) => (
            <Card
              key={stat.label}
              className={cn(
                "card-hover animate-fade-in-up overflow-hidden",
                `stagger-${index + 1}`
              )}
            >
              <div className={cn("h-1 bg-gradient-to-r", stat.color)} />
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{stat.icon}</span>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Next Action & Rate Limit */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="animate-fade-in-up stagger-1 card-hover border-l-4 border-l-primary-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                Next Step
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{dashboard.next_action.message}</p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/ventures/${ventureId}/phase/${dashboard.current_phase}`}>
                  <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
                    View Phase Details
                  </Button>
                </Link>
                <Link href={`/ventures/${ventureId}/chat`}>
                  <Button variant="outline" className="hover-lift">
                    💬 Chat with AI
                  </Button>
                </Link>
                <Link href={`/ventures/${ventureId}/summary`}>
                  <Button variant="outline" className="hover-lift">
                    📄 View Summary
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in-up stagger-2 card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                AI Usage Today
              </CardTitle>
              <CardDescription>
                {dashboard.rate_limit.remaining_today} of {dashboard.rate_limit.messages_limit} messages remaining
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Progress
                  value={
                    ((dashboard.rate_limit.messages_limit - dashboard.rate_limit.remaining_today) /
                      dashboard.rate_limit.messages_limit) *
                    100
                  }
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Resets at {new Date(dashboard.rate_limit.resets_at).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Suggested Actions */}
        {suggestedActions?.actions && suggestedActions.actions.length > 0 && (
          <Card className="animate-fade-in-up stagger-3 card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                Suggested Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {suggestedActions.actions.map((action, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all cursor-pointer",
                      "animate-fade-in-up",
                      `stagger-${index + 1}`
                    )}
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
                      <svg
                        className="h-5 w-5 text-white"
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
                    <span className="text-sm text-gray-700 font-medium">{action.message}</span>
                    <svg
                      className="h-5 w-5 text-gray-400 ml-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
