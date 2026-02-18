"use client";

import { useState, useEffect } from "react";
import { useVenture, useUpdateVenture } from "@/lib/api/hooks/use-ventures";
import { useDashboard, useSuggestedActions } from "@/lib/api/hooks/use-dashboard";
import { useEnrichedPhases } from "@/lib/api/hooks/use-phases";
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
          <Button className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
            View All Ventures
          </Button>
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

      <div className="space-y-8 animate-fade-in-up">
        {/* Completion Banner - Shows when journey is complete */}
        {isJourneyComplete && (
          <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
            <div className="relative p-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-5">
                  <div className="text-6xl animate-bounce">🎉</div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">Journey Complete!</h2>
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
          </div>
        )}

        {/* Header */}
        <div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur-lg opacity-50" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30">
                {PHASE_ICONS[dashboard.current_phase - 1] || "🎯"}
              </div>
            </div>
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ventureName}
                    onChange={(e) => setVentureName(e.target.value)}
                    placeholder="Enter venture name"
                    className="text-2xl font-bold text-gray-900 border-b-2 border-indigo-500 bg-transparent focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setIsEditingName(false);
                    }}
                  />
                  <button onClick={handleSaveName} className="text-green-600 hover:text-green-500 text-xl">✓</button>
                  <button onClick={() => setIsEditingName(false)} className="text-gray-500 hover:text-gray-400 text-xl">✕</button>
                </div>
              ) : (
                <h1
                  className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors group"
                  onClick={() => setIsEditingName(true)}
                  title="Click to edit name"
                >
                  {venture.name || "Unnamed Venture"}
                  <span className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 text-sm">✏️</span>
                </h1>
              )}
              <p className="text-gray-600">
                Phase {dashboard.current_phase}: <span className="text-indigo-600">{dashboard.current_phase_name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Phase Timeline */}
        <div className="relative">
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Your Journey
                </h3>
                <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                  {displayProgress}% complete
                </span>
              </div>

              <div className="flex items-center justify-between my-8">
                {PHASE_NAMES.map((name, index) => {
                  const phaseNum = index + 1;
                  const phase = phasesArray.find((p) => p.phase_number === phaseNum);
                  const isComplete = phase?.status === "COMPLETE";
                  const isActive = phase?.status === "ACTIVE";
                  const isLocked = !isComplete && !isActive;

                  return (
                    <div key={phaseNum} className="flex flex-col items-center flex-1 relative">
                      {/* Line connector */}
                      {index < PHASE_NAMES.length - 1 && (
                        <div
                          className={cn(
                            "absolute top-5 left-[60%] w-[80%] h-1 rounded-full transition-all duration-500",
                            isComplete ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-white/10"
                          )}
                        />
                      )}
                      {/* Phase dot */}
                      <div
                        className={cn(
                          "relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-all duration-300",
                          isComplete && "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30",
                          isActive && "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 animate-pulse",
                          isLocked && "bg-gray-100 text-gray-400 border border-gray-200"
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
                          isComplete && "text-emerald-400",
                          isActive && "text-indigo-400",
                          isLocked && "text-gray-500"
                        )}
                      >
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              value: `${dashboard.overall_progress.phases_completed}/${dashboard.overall_progress.total_phases}`,
              label: "Phases Complete",
              icon: "🏆",
              gradient: "from-amber-500 to-orange-500",
            },
            {
              value: `${dashboard.current_phase_progress.gates_satisfied}/${dashboard.current_phase_progress.total_gates}`,
              label: "Current Gates",
              icon: "🚪",
              gradient: "from-blue-500 to-indigo-500",
            },
            {
              value: dashboard.artifacts_generated,
              label: "Artifacts",
              icon: "📄",
              gradient: "from-emerald-500 to-teal-500",
            },
            {
              value: `${dashboard.streak.current_days}`,
              label: "Day Streak",
              icon: "🔥",
              gradient: "from-red-500 to-pink-500",
            },
          ].map((stat, index) => (
            <div key={stat.label} className="relative group">
              <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className={cn("h-1 bg-gradient-to-r", stat.gradient)} />
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{stat.icon}</span>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Next Action & Rate Limit */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative">
            <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-indigo-500 p-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <span className="text-xl">💡</span>
                Next Step
              </h3>
              <p className="text-gray-600 mb-4">{dashboard.next_action.message}</p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/ventures/${ventureId}/phase/${dashboard.current_phase}`}>
                  <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25">
                    View Phase Details
                  </Button>
                </Link>
                <Link href={`/ventures/${ventureId}/chat`}>
                  <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl">
                    💬 Chat with AI
                  </Button>
                </Link>
                <Link href={`/ventures/${ventureId}/summary`}>
                  <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl">
                    📄 View Summary
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1">
                <span className="text-xl">⚡</span>
                AI Usage Today
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {dashboard.rate_limit.remaining_today} of {dashboard.rate_limit.messages_limit} messages remaining
              </p>
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  style={{
                    width: `${((dashboard.rate_limit.messages_limit - dashboard.rate_limit.remaining_today) / dashboard.rate_limit.messages_limit) * 100}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Resets at {new Date(dashboard.rate_limit.resets_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Suggested Actions */}
        {suggestedActions?.actions && suggestedActions.actions.length > 0 && (
          <div className="relative">
            <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <span className="text-xl">🎯</span>
                Suggested Actions
              </h3>
              <div className="space-y-3">
                {suggestedActions.actions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group"
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700 font-medium flex-1">{action.message}</span>
                    <svg
                      className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
