"use client";

import { useState, useEffect } from "react";
import { useEnrichedPhases, useUpdateGate, useEvaluateGate } from "@/lib/api/hooks/use-phases";
import { useVenture, useUpdateVenture, useCreateArtifact } from "@/lib/api/hooks/use-ventures";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export default function PhaseDetailPage({
  params,
}: {
  params: { id: string; num: string };
}) {
  const { id: ventureId, num } = params;
  const phaseNumber = parseInt(num, 10);

  const { data: phases, isLoading } = useEnrichedPhases(ventureId);
  const { data: ventureData } = useVenture(ventureId);
  const { mutate: updateGate, isPending: isUpdating } = useUpdateGate(ventureId);
  const { mutate: evaluateGate, isPending: isEvaluating } = useEvaluateGate(ventureId);
  const { mutate: updateVenture, isPending: isUpdatingVenture } = useUpdateVenture(ventureId);
  const { mutate: createArtifact, isPending: isCreatingArtifact } = useCreateArtifact(ventureId);

  // Phase 1 Discovery form state
  const [problemStatement, setProblemStatement] = useState("");
  const [competitors, setCompetitors] = useState(["", "", ""]);

  // Phase 2 Planning form state
  const [solutionStatement, setSolutionStatement] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [revenueModel, setRevenueModel] = useState("");
  const [distributionChannel, setDistributionChannel] = useState("");
  const [startupCosts, setStartupCosts] = useState("");
  const [monthlyCosts, setMonthlyCosts] = useState("");
  const [advantage, setAdvantage] = useState("");
  const [offerStatement, setOfferStatement] = useState("");

  // Phase 3 Formation form state
  const [entityType, setEntityType] = useState("NONE");

  // Phase 5 Scale form state
  const [growthGoal, setGrowthGoal] = useState("");
  const [growthStrategy, setGrowthStrategy] = useState("");
  const [keyMilestones, setKeyMilestones] = useState("");

  const [formSaved, setFormSaved] = useState(false);

  const phase = phases?.find((p) => p.phase_number === phaseNumber);
  const venture = ventureData?.venture;

  // Initialize forms from existing venture data
  useEffect(() => {
    if (venture) {
      if (venture.problem_statement) setProblemStatement(venture.problem_statement);
      if (venture.solution_statement) setSolutionStatement(venture.solution_statement);
      if (venture.target_customer) setTargetCustomer(venture.target_customer);
      if (venture.offer_description) setOfferDescription(venture.offer_description);
      if (venture.revenue_model) setRevenueModel(venture.revenue_model);
      if (venture.distribution_channel) setDistributionChannel(venture.distribution_channel);
      if (venture.estimated_costs) {
        setStartupCosts(String(venture.estimated_costs.startup || ""));
        setMonthlyCosts(String(venture.estimated_costs.monthly || ""));
      }
      if (venture.advantage) setAdvantage(venture.advantage);
      if (venture.entity_type) setEntityType(venture.entity_type);
    }
  }, [venture]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Phase not found</h1>
      </div>
    );
  }

  const satisfiedGates = phase.gate_criteria.filter((g) => g.satisfied).length;
  const totalGates = phase.gate_criteria.length;
  const progressPercent = totalGates > 0 ? (satisfiedGates / totalGates) * 100 : 0;

  const handleToggleGate = (key: string, currentValue: boolean, gateType?: string) => {
    if (gateType === "auto") return;
    updateGate({ phaseNum: phaseNumber, key, satisfied: !currentValue });
  };

  const handleEvaluate = () => {
    evaluateGate(phaseNumber);
  };

  // Phase 1 handlers
  const handleCompetitorChange = (index: number, value: string) => {
    const newCompetitors = [...competitors];
    newCompetitors[index] = value;
    setCompetitors(newCompetitors);
  };

  const addCompetitor = () => {
    setCompetitors([...competitors, ""]);
  };

  const removeCompetitor = (index: number) => {
    if (competitors.length > 3) {
      setCompetitors(competitors.filter((_, i) => i !== index));
    }
  };

  const handleSaveDiscovery = async () => {
    if (problemStatement.length >= 20) {
      updateVenture({ problem_statement: problemStatement });
    }

    const validCompetitors = competitors.filter((c) => c.trim().length > 0);
    if (validCompetitors.length >= 3) {
      createArtifact({
        phaseNumber: 1,
        type: "CUSTOMER_LIST",
        content: {
          competitors: validCompetitors.map((name) => ({ name, notes: "" })),
        },
      });
    }

    setFormSaved(true);
    setTimeout(() => evaluateGate(1), 500);
  };

  const canSaveDiscovery =
    problemStatement.length >= 20 &&
    competitors.filter((c) => c.trim().length > 0).length >= 3;

  // Phase 2 handlers
  const handleSavePlanning = async () => {
    // Save all business plan fields
    updateVenture({
      solution_statement: solutionStatement,
      target_customer: targetCustomer,
      offer_description: offerDescription,
      revenue_model: revenueModel,
      distribution_channel: distributionChannel,
      estimated_costs: {
        startup: parseInt(startupCosts) || 0,
        monthly: parseInt(monthlyCosts) || 0,
      },
      advantage: advantage,
    });

    // Create offer statement artifact if provided
    if (offerStatement.trim().length > 0) {
      createArtifact({
        phaseNumber: 2,
        type: "OFFER_STATEMENT",
        content: {
          statement: offerStatement,
          target_customer: targetCustomer,
          value_proposition: solutionStatement,
        },
      });
    }

    setFormSaved(true);
    setTimeout(() => evaluateGate(2), 500);
  };

  const canSavePlanning =
    solutionStatement.trim().length > 0 &&
    targetCustomer.trim().length > 0 &&
    offerDescription.trim().length > 0 &&
    revenueModel.trim().length > 0 &&
    distributionChannel.trim().length > 0 &&
    advantage.trim().length > 0 &&
    offerStatement.trim().length > 0;

  // Phase 3 handlers
  const handleSaveFormation = async () => {
    updateVenture({ entity_type: entityType as "NONE" | "SOLE_PROP" | "LLC" | "CORP" });
    setFormSaved(true);
    setTimeout(() => evaluateGate(3), 500);
  };

  // Phase 5 handlers
  const handleSaveScale = async () => {
    createArtifact({
      phaseNumber: 5,
      type: "GROWTH_PLAN",
      content: {
        goal: growthGoal,
        strategy: growthStrategy,
        milestones: keyMilestones.split("\n").filter(m => m.trim()),
        timeframe: "90 days",
      },
    });
    setFormSaved(true);
    setTimeout(() => evaluateGate(5), 500);
  };

  const canSaveScale = growthGoal.trim().length > 0 && growthStrategy.trim().length > 0;

  const isSaving = isUpdatingVenture || isCreatingArtifact;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href={`/ventures/${ventureId}`} className="hover:text-gray-700">
              Venture
            </Link>
            <span>/</span>
            <span>Phase {phaseNumber}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{phase.name}</h1>
          <p className="text-gray-600 mt-1">{phase.description}</p>
        </div>
        <div
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            phase.status === "COMPLETE" && "bg-green-100 text-green-700",
            phase.status === "ACTIVE" && "bg-primary-100 text-primary-700",
            phase.status === "LOCKED" && "bg-gray-100 text-gray-500"
          )}
        >
          {phase.status}
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>
            {satisfiedGates} of {totalGates} gates completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} />
        </CardContent>
      </Card>

      {/* Phase 1 Discovery Form */}
      {phaseNumber === 1 && phase.status === "ACTIVE" && (
        <Card className="border-primary-200 bg-primary-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🔍</span>
              Complete Your Discovery
            </CardTitle>
            <CardDescription>
              Fill out this form to complete the auto-evaluated gates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Problem Statement
                <span className="text-gray-400 font-normal ml-2">(minimum 20 characters)</span>
              </label>
              <textarea
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="What problem are you solving? Describe the pain point..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[100px]"
              />
              <p className={cn("text-xs mt-1", problemStatement.length >= 20 ? "text-green-600" : "text-gray-500")}>
                {problemStatement.length}/20 characters {problemStatement.length >= 20 && "✓"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Competitors / Existing Solutions
                <span className="text-gray-400 font-normal ml-2">(minimum 3 required)</span>
              </label>
              <div className="space-y-2">
                {competitors.map((competitor, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={competitor}
                      onChange={(e) => handleCompetitorChange(index, e.target.value)}
                      placeholder={`Competitor ${index + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {competitors.length > 3 && (
                      <button onClick={() => removeCompetitor(index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addCompetitor} className="mt-2 text-sm text-primary-600 hover:text-primary-700">
                + Add another competitor
              </button>
              <p className={cn("text-xs mt-1", competitors.filter((c) => c.trim()).length >= 3 ? "text-green-600" : "text-gray-500")}>
                {competitors.filter((c) => c.trim()).length}/3 competitors {competitors.filter((c) => c.trim()).length >= 3 && "✓"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button onClick={handleSaveDiscovery} disabled={!canSaveDiscovery || isSaving} className="bg-gradient-primary">
                {isSaving ? "Saving..." : "Save & Evaluate"}
              </Button>
              {formSaved && <span className="text-green-600 text-sm">✓ Saved!</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2 Planning Form */}
      {phaseNumber === 2 && phase.status === "ACTIVE" && (
        <Card className="border-primary-200 bg-primary-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              Complete Your Business Plan
            </CardTitle>
            <CardDescription>
              Fill out all fields to complete Phase 2
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Solution Statement</label>
                <textarea
                  value={solutionStatement}
                  onChange={(e) => setSolutionStatement(e.target.value)}
                  placeholder="How does your product/service solve the problem?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Customer</label>
                <textarea
                  value={targetCustomer}
                  onChange={(e) => setTargetCustomer(e.target.value)}
                  placeholder="Who is your ideal customer? Be specific."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Offer Description</label>
                <textarea
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  placeholder="What exactly are you offering?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Revenue Model</label>
                <textarea
                  value={revenueModel}
                  onChange={(e) => setRevenueModel(e.target.value)}
                  placeholder="How will you make money? (subscription, one-time, etc.)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Distribution Channel</label>
                <textarea
                  value={distributionChannel}
                  onChange={(e) => setDistributionChannel(e.target.value)}
                  placeholder="How will customers find and buy from you?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Competitive Advantage</label>
                <textarea
                  value={advantage}
                  onChange={(e) => setAdvantage(e.target.value)}
                  placeholder="What makes you different from competitors?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Startup Costs ($)</label>
                <input
                  type="number"
                  value={startupCosts}
                  onChange={(e) => setStartupCosts(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Costs ($)</label>
                <input
                  type="number"
                  value={monthlyCosts}
                  onChange={(e) => setMonthlyCosts(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Offer Statement
                <span className="text-gray-400 font-normal ml-2">(Your pitch in one sentence)</span>
              </label>
              <textarea
                value={offerStatement}
                onChange={(e) => setOfferStatement(e.target.value)}
                placeholder="We help [target customer] solve [problem] by [solution] so they can [benefit]."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]"
              />
            </div>

            <div className="flex items-center gap-4">
              <Button onClick={handleSavePlanning} disabled={!canSavePlanning || isSaving} className="bg-gradient-primary">
                {isSaving ? "Saving..." : "Save & Evaluate"}
              </Button>
              {formSaved && <span className="text-green-600 text-sm">✓ Saved!</span>}
              {!canSavePlanning && (
                <span className="text-gray-500 text-sm">Fill all fields to continue</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 3 Formation Form */}
      {phaseNumber === 3 && phase.status === "ACTIVE" && (
        <Card className="border-primary-200 bg-primary-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🏗️</span>
              Business Formation
            </CardTitle>
            <CardDescription>
              Choose your business entity type (or skip for now)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Entity Type
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { value: "SOLE_PROP", label: "Sole Proprietorship", desc: "Simplest structure, no formal registration needed" },
                  { value: "LLC", label: "LLC", desc: "Limited liability protection, flexible taxation" },
                  { value: "CORP", label: "Corporation", desc: "Best for raising investment, more complex" },
                  { value: "NONE", label: "Skip for now", desc: "Decide later, continue with other tasks" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setEntityType(option.value)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      entityType === option.value
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-500 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleSaveFormation}
                disabled={isSaving}
                className="bg-gradient-primary"
              >
                {isSaving ? "Saving..." : "Save & Evaluate"}
              </Button>
              {formSaved && <span className="text-green-600 text-sm">✓ Saved!</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 5 Scale Form */}
      {phaseNumber === 5 && phase.status === "ACTIVE" && (
        <Card className="border-primary-200 bg-primary-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              Create Your 90-Day Growth Plan
            </CardTitle>
            <CardDescription>
              Define your growth strategy for the next 90 days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Growth Goal
              </label>
              <textarea
                value={growthGoal}
                onChange={(e) => setGrowthGoal(e.target.value)}
                placeholder="What's your main growth goal for the next 90 days? (e.g., Reach $10k MRR, Get 100 customers)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Growth Strategy
              </label>
              <textarea
                value={growthStrategy}
                onChange={(e) => setGrowthStrategy(e.target.value)}
                placeholder="How will you achieve this goal? What channels and tactics will you use?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[100px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Milestones
                <span className="text-gray-400 font-normal ml-2">(one per line)</span>
              </label>
              <textarea
                value={keyMilestones}
                onChange={(e) => setKeyMilestones(e.target.value)}
                placeholder="Week 1-2: Launch marketing campaign&#10;Week 3-4: Reach 25 customers&#10;Week 5-8: Hit $5k revenue&#10;Week 9-12: Scale to $10k"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[120px]"
              />
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleSaveScale}
                disabled={!canSaveScale || isSaving}
                className="bg-gradient-primary"
              >
                {isSaving ? "Saving..." : "Generate Growth Plan"}
              </Button>
              {formSaved && <span className="text-green-600 text-sm">✓ Saved!</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gate Criteria */}
      <Card>
        <CardHeader>
          <CardTitle>Gate Criteria</CardTitle>
          <CardDescription>
            Complete all gates to advance to the next phase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {phase.gate_criteria.map((gate) => (
              <div
                key={gate.key}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  gate.satisfied ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}
              >
                <button
                  onClick={() => handleToggleGate(gate.key, gate.satisfied, gate.gate_type)}
                  disabled={gate.gate_type === "auto" || isUpdating || phase.status === "LOCKED"}
                  className={cn(
                    "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
                    gate.satisfied ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-gray-400",
                    gate.gate_type === "auto" && !gate.satisfied && "cursor-not-allowed opacity-60"
                  )}
                >
                  {gate.satisfied && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <p className={cn("font-medium", gate.satisfied ? "text-green-700" : "text-gray-700")}>
                    {gate.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {gate.gate_type === "auto"
                      ? (phaseNumber === 1 || phaseNumber === 2 || phaseNumber === 3 || phaseNumber === 5) ? "Fill the form above" : "Auto-evaluated"
                      : "Click to mark complete"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {phase.status === "ACTIVE" && (
            <div className="mt-6 flex gap-3">
              <Button onClick={handleEvaluate} disabled={isEvaluating} variant="outline">
                {isEvaluating ? "Evaluating..." : "Re-evaluate Gates"}
              </Button>
              <Link href={`/ventures/${ventureId}/chat`}>
                <Button variant="outline">Get AI Help</Button>
              </Link>
            </div>
          )}

          {phase.status === "COMPLETE" && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p className="font-medium text-green-800">Phase Complete!</p>
                    <p className="text-sm text-green-600">Great job! You've completed all the gates.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {phaseNumber < 5 ? (
                    <Link href={`/ventures/${ventureId}/phase/${phaseNumber + 1}`}>
                      <Button className="bg-gradient-primary">
                        Continue to Phase {phaseNumber + 1} →
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/ventures/${ventureId}`}>
                      <Button className="bg-gradient-primary">
                        Back to Dashboard
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guide Content */}
      {phase.guide_content && (
        <Card>
          <CardHeader>
            <CardTitle>Phase Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-gray-700">{phase.guide_content}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tool Recommendations */}
      {phase.tool_recommendations && phase.tool_recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {phase.tool_recommendations.map((tool, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-700">
                  <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {tool}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
