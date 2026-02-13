"use client";

import { useState, useEffect } from "react";
import { useVenture, useUpdateVenture } from "@/lib/api/hooks/use-ventures";
import { useDashboard, useSuggestedActions } from "@/lib/api/hooks/use-dashboard";
import { useEnrichedPhases } from "@/lib/api/hooks/use-phases";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { CelebrationModal } from "@/components/ui/confetti";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const PHASE_NAMES = ["Discovery", "Planning", "Formation", "Launch", "Scale"];
const PHASE_ICONS = ["🔍", "📋", "🏗️", "🚀", "📈"];
const PHASE_DESCRIPTIONS = [
  "Define your problem & solution",
  "Build your business model",
  "Set up your legal structure",
  "Get your first customers",
  "Grow and optimize"
];

export default function VenturePage({ params }: { params: { id: string } }) {
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

  useEffect(() => {
    if (venture?.name) setVentureName(venture.name);
  }, [venture?.name]);

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
    if (ventureName.trim()) updateVenture({ name: ventureName.trim() });
    setIsEditingName(false);
  };

  if (ventureLoading || dashboardLoading) return <DashboardSkeleton />;

  if (!venture || !dashboard) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center text-4xl">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Venture not found</h1>
        <p className="text-gray-500 mb-6">This venture may have been deleted.</p>
        <Link href="/ventures"><Button>View All Ventures</Button></Link>
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
        {/* Journey Complete Banner */}
        {isJourneyComplete && (
          <div className="relative overflow-hidden rounded-3xl animate-fade-in">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 animate-gradient" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"30\" height=\"30\" viewBox=\"0 0 30 30\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z\" fill=\"rgba(255,255,255,0.07)\"%2F%3E%3C%2Fsvg%3E')] opacity-50" />
            <div className="relative p-8 md:p-10">
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl animate-bounce-subtle">
                    🎉
                  </div>
                  <div className="text-white">
                    <h2 className="text-2xl md:text-3xl font-bold">Journey Complete!</h2>
                    <p className="text-emerald-100 mt-1">Your business plan is ready for investors.</p>
                  </div>
                </div>
                <Link href={`/ventures/${ventureId}/summary`}>
                  <Button className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold px-6 py-3 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                    View Business Plan →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="animate-fade-in-up">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30">
              {PHASE_ICONS[dashboard.current_phase - 1] || "🎯"}
            </div>
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={ventureName}
                    onChange={(e) => setVentureName(e.target.value)}
                    placeholder="Enter venture name"
                    className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-indigo-500 focus:outline-none w-full max-w-md"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setIsEditingName(false);
                    }}
                  />
                  <button onClick={handleSaveName} className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors">✓</button>
                  <button onClick={() => setIsEditingName(false)} className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">✕</button>
                </div>
              ) : (
                <h1
                  className="text-2xl md:text-3xl font-bold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors group truncate"
                  onClick={() => setIsEditingName(true)}
                >
                  {venture.name || "Unnamed Venture"}
                  <span className="ml-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                </h1>
              )}
              <p className="text-gray-500 mt-1">
                Phase {dashboard.current_phase} · {dashboard.current_phase_name}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Ring + Stats */}
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in-up stagger-1">
          {/* Main Progress Card */}
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Your Journey</h3>
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium">
                  {displayProgress}% Complete
                </span>
              </div>

              {/* Phase Timeline */}
              <div className="flex items-center justify-between mb-8">
                {PHASE_NAMES.map((name, index) => {
                  const phaseNum = index + 1;
                  const phase = phasesArray.find((p) => p.phase_number === phaseNum);
                  const isComplete = phase?.status === "COMPLETE";
                  const isActive = phase?.status === "ACTIVE";

                  return (
                    <div key={phaseNum} className="flex flex-col items-center flex-1 relative">
                      {index < PHASE_NAMES.length - 1 && (
                        <div className={cn(
                          "absolute top-5 left-[60%] w-[80%] h-0.5 rounded-full transition-all duration-500",
                          isComplete ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gray-200"
                        )} />
                      )}
                      <Link href={`/ventures/${ventureId}/phase/${phaseNum}`} className="relative z-10 group">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-lg font-medium transition-all duration-300 group-hover:scale-110",
                          isComplete && "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30",
                          isActive && "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-500/20",
                          !isComplete && !isActive && "bg-gray-100 text-gray-400"
                        )}>
                          {isComplete ? "✓" : PHASE_ICONS[index]}
                        </div>
                      </Link>
                      <span className={cn(
                        "mt-2 text-xs font-medium text-center",
                        isComplete && "text-emerald-600",
                        isActive && "text-indigo-600",
                        !isComplete && !isActive && "text-gray-400"
                      )}>
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${displayProgress}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-sm opacity-50"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
              <div className="text-3xl font-bold">{dashboard.current_phase_progress.gates_satisfied}/{dashboard.current_phase_progress.total_gates}</div>
              <div className="text-indigo-100 text-sm mt-1">Gates Completed</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🔥</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{dashboard.streak.current_days}</div>
                  <div className="text-gray-500 text-sm">Day Streak</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up stagger-2">
          {/* Next Step Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-violet-600" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">💡</div>
                <h3 className="text-lg font-semibold text-gray-900">Next Step</h3>
              </div>
              <p className="text-gray-600 mb-5">{dashboard.next_action.message}</p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/ventures/${ventureId}/phase/${dashboard.current_phase}`}>
                  <Button className="group-hover:shadow-lg transition-shadow">
                    Continue Phase
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </Link>
                <Link href={`/ventures/${ventureId}/chat`}>
                  <Button variant="outline">💬 AI Coach</Button>
                </Link>
              </div>
            </div>
          </div>

          {/* AI Usage Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">⚡</div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Credits</h3>
                </div>
                <span className="text-2xl font-bold text-gray-900">{dashboard.rate_limit.remaining_today}</span>
              </div>
              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                  style={{ width: `${(dashboard.rate_limit.remaining_today / dashboard.rate_limit.messages_limit) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">
                {dashboard.rate_limit.remaining_today} of {dashboard.rate_limit.messages_limit} messages remaining today
              </p>
            </div>
          </div>
        </div>

        {/* Suggested Actions */}
        {suggestedActions?.actions && suggestedActions.actions.length > 0 && (
          <div className="animate-fade-in-up stagger-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">🎯</span> Suggested Actions
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedActions.actions.slice(0, 3).map((action, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white border border-gray-200/80 hover:border-indigo-300 hover:shadow-md transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{action.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="flex flex-wrap justify-center gap-4 pt-4 animate-fade-in-up stagger-4">
          <Link href={`/ventures/${ventureId}/summary`} className="text-gray-500 hover:text-indigo-600 text-sm font-medium transition-colors flex items-center gap-1">
            📄 View Summary
          </Link>
          <span className="text-gray-300">•</span>
          <Link href={`/ventures/${ventureId}/artifacts`} className="text-gray-500 hover:text-indigo-600 text-sm font-medium transition-colors flex items-center gap-1">
            📁 All Artifacts
          </Link>
          <span className="text-gray-300">•</span>
          <Link href="/ventures" className="text-gray-500 hover:text-indigo-600 text-sm font-medium transition-colors flex items-center gap-1">
            ← All Ventures
          </Link>
        </div>
      </div>
    </>
  );
}
