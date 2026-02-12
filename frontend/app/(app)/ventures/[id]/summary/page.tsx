"use client";

import { useVenture } from "@/lib/api/hooks/use-ventures";
import { useEnrichedPhases } from "@/lib/api/hooks/use-phases";
import { useDashboard } from "@/lib/api/hooks/use-dashboard";
import { api } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ArtifactContent {
  problem?: string;
  solution?: string;
  target_customer?: string;
  competitors?: Array<{ name: string; notes?: string }>;
  goal?: string;
  strategy?: string;
  milestones?: string[];
  timeframe?: string;
  customers?: string[];
  feedback?: string;
  [key: string]: unknown;
}

export default function VentureSummaryPage({
  params,
}: {
  params: { id: string };
}) {
  const { id: ventureId } = params;
  const { data: ventureData, isLoading: ventureLoading } = useVenture(ventureId);
  const { data: phases } = useEnrichedPhases(ventureId);
  const { data: dashboard } = useDashboard(ventureId);
  const { data: artifacts } = useQuery({
    queryKey: ["artifacts", ventureId],
    queryFn: () => api.getArtifacts(ventureId),
    enabled: !!ventureId,
  });

  const venture = ventureData?.venture;

  if (ventureLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!venture) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Venture not found</h1>
      </div>
    );
  }

  const completedPhases = phases?.filter(p => p.status === "COMPLETE").length || 0;
  const phase5Active = phases?.find(p => p.phase_number === 5)?.status === "ACTIVE";
  const isComplete = completedPhases >= 4 || phase5Active;

  // Get specific artifacts
  const problemSolutionArtifact = artifacts?.find(a => a.type === "PROBLEM_SOLUTION_FIT");
  const competitorArtifact = artifacts?.find(a => a.type === "COMPETITOR_ANALYSIS");
  const customerListArtifact = artifacts?.find(a => a.type === "CUSTOMER_LIST");
  const growthPlanArtifact = artifacts?.find(a => a.type === "GROWTH_PLAN");

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Web-only navigation */}
      <div className="mb-6 print:hidden">
        <Link href={`/ventures/${ventureId}`} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Web-only celebration banner */}
      {isComplete && (
        <div className="mb-8 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-6 shadow-lg print:hidden">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🎉</div>
            <div>
              <h2 className="text-2xl font-bold">Congratulations!</h2>
              <p className="text-emerald-100">You've completed your entrepreneurship journey. Your business plan is ready below.</p>
            </div>
          </div>
        </div>
      )}

      {/* Professional Business Plan Document */}
      <div className="bg-white rounded-xl shadow-lg print:shadow-none print:rounded-none">

        {/* Document Header */}
        <div className="border-b-4 border-slate-800 p-8 pb-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
              {venture.name || "Business Venture"}
            </h1>
            <div className="mt-2 text-lg text-slate-600 font-medium">
              Business Plan & Strategy Document
            </div>
            <div className="mt-4 text-sm text-slate-500">
              Prepared: {currentDate}
            </div>
          </div>
        </div>

        {/* Executive Summary Section */}
        <section className="p-8 border-b border-slate-200 page-break-inside-avoid">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            Executive Summary
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">The Problem</h3>
              <p className="text-slate-700 leading-relaxed text-lg">
                {venture.problem_statement || (problemSolutionArtifact?.content as ArtifactContent)?.problem || "Not yet defined"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Our Solution</h3>
              <p className="text-slate-700 leading-relaxed text-lg">
                {venture.solution_statement || (problemSolutionArtifact?.content as ArtifactContent)?.solution || "Not yet defined"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Target Customer</h3>
              <p className="text-slate-700 leading-relaxed text-lg">
                {venture.target_customer || (problemSolutionArtifact?.content as ArtifactContent)?.target_customer || "Not yet defined"}
              </p>
            </div>
          </div>
        </section>

        {/* Value Proposition Section */}
        <section className="p-8 border-b border-slate-200 page-break-inside-avoid">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            Value Proposition
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Product/Service Offering</h3>
              <p className="text-slate-700 leading-relaxed">
                {venture.offer_description || "Not yet defined"}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Competitive Advantage</h3>
              <p className="text-slate-700 leading-relaxed">
                {venture.advantage || "Not yet defined"}
              </p>
            </div>
          </div>
        </section>

        {/* Business Model Section */}
        <section className="p-8 border-b border-slate-200 page-break-inside-avoid">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            Business Model
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Revenue Model</h3>
              <p className="text-slate-700 leading-relaxed">
                {venture.revenue_model || "Not yet defined"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Distribution Channel</h3>
              <p className="text-slate-700 leading-relaxed">
                {venture.distribution_channel || "Not yet defined"}
              </p>
            </div>
          </div>

          {venture.estimated_costs && (venture.estimated_costs.startup || venture.estimated_costs.monthly) && (
            <div className="mt-6 bg-emerald-50 rounded-lg p-5 border border-emerald-200">
              <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">Financial Projections</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-slate-600">Initial Investment Required</span>
                  <div className="text-2xl font-bold text-slate-800">
                    ${venture.estimated_costs.startup?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Monthly Operating Costs</span>
                  <div className="text-2xl font-bold text-slate-800">
                    ${venture.estimated_costs.monthly?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Competitive Analysis Section */}
        {competitorArtifact && (
          <section className="p-8 border-b border-slate-200 page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
              Competitive Landscape
            </h2>

            <div className="space-y-4">
              {((competitorArtifact.content as ArtifactContent)?.competitors || []).map((competitor, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{competitor.name}</h4>
                    {competitor.notes && (
                      <p className="text-sm text-slate-600 mt-1">{competitor.notes}</p>
                    )}
                  </div>
                </div>
              ))}
              {!((competitorArtifact.content as ArtifactContent)?.competitors?.length) && (
                <p className="text-slate-600">Competitor analysis in progress.</p>
              )}
            </div>
          </section>
        )}

        {/* Customer Validation Section */}
        {customerListArtifact && (
          <section className="p-8 border-b border-slate-200 page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
              Customer Validation
            </h2>

            <div className="space-y-4">
              {((customerListArtifact.content as ArtifactContent)?.customers || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Initial Customer Contacts</h3>
                  <ul className="space-y-2">
                    {((customerListArtifact.content as ArtifactContent)?.customers || []).map((customer, index) => (
                      <li key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-slate-700">{customer}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(customerListArtifact.content as ArtifactContent)?.feedback && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Customer Feedback Summary</h3>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg">
                    {(customerListArtifact.content as ArtifactContent).feedback}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Growth Strategy Section */}
        {growthPlanArtifact && (
          <section className="p-8 border-b border-slate-200 page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
              Growth Strategy
            </h2>

            <div className="space-y-6">
              {(growthPlanArtifact.content as ArtifactContent)?.goal && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">90-Day Goal</h3>
                  <p className="text-slate-700 leading-relaxed text-lg font-medium">
                    {(growthPlanArtifact.content as ArtifactContent).goal}
                  </p>
                </div>
              )}

              {(growthPlanArtifact.content as ArtifactContent)?.strategy && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Strategy</h3>
                  <p className="text-slate-700 leading-relaxed">
                    {(growthPlanArtifact.content as ArtifactContent).strategy}
                  </p>
                </div>
              )}

              {((growthPlanArtifact.content as ArtifactContent)?.milestones || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Key Milestones</h3>
                  <div className="space-y-3">
                    {((growthPlanArtifact.content as ArtifactContent)?.milestones || []).map((milestone, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-slate-700">{milestone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Legal Structure Section */}
        <section className="p-8 border-b border-slate-200 page-break-inside-avoid">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-bold">7</span>
            Legal Structure
          </h2>

          <div className="bg-slate-50 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Business Entity Type</h3>
            <p className="text-slate-700 text-lg font-medium">
              {venture.entity_type && venture.entity_type !== "NONE"
                ? venture.entity_type.replace(/_/g, " ")
                : "To be determined"}
            </p>
          </div>
        </section>

        {/* Progress Summary Section */}
        <section className="p-8 page-break-inside-avoid">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-bold">8</span>
            Development Progress
          </h2>

          <div className="grid grid-cols-5 gap-4">
            {phases?.map((phase) => (
              <div key={phase.phase_number} className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center font-bold text-lg ${
                  phase.status === "COMPLETE"
                    ? "bg-emerald-500 text-white"
                    : phase.status === "ACTIVE"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}>
                  {phase.status === "COMPLETE" ? "✓" : phase.phase_number}
                </div>
                <div className="mt-2 text-xs font-medium text-slate-600">{phase.name}</div>
                <div className={`text-xs mt-1 ${
                  phase.status === "COMPLETE"
                    ? "text-emerald-600"
                    : phase.status === "ACTIVE"
                    ? "text-blue-600"
                    : "text-slate-400"
                }`}>
                  {phase.status === "COMPLETE" ? "Complete" : phase.status === "ACTIVE" ? "In Progress" : "Pending"}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2">
              <span className="text-sm text-slate-600">Overall Progress:</span>
              <span className="font-bold text-slate-800">
                {isComplete ? "100" : dashboard?.overall_progress?.percentage || 0}%
              </span>
            </div>
          </div>
        </section>

      </div>

      {/* Action Buttons - Web only */}
      <div className="mt-8 flex justify-center gap-4 print:hidden">
        <Button onClick={handlePrint} variant="outline" className="px-6">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save as PDF
        </Button>
        <Link href={`/ventures/${ventureId}`}>
          <Button className="bg-slate-800 hover:bg-slate-700 px-6">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
