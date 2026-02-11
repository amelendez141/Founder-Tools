"use client";

import { use } from "react";
import { useEnrichedPhases, useUpdateGate, useEvaluateGate } from "@/lib/api/hooks/use-phases";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export default function PhaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; num: string }>;
}) {
  const { id: ventureId, num } = use(params);
  const phaseNumber = parseInt(num, 10);

  const { data: phases, isLoading } = useEnrichedPhases(ventureId);
  const { mutate: updateGate, isPending: isUpdating } = useUpdateGate(ventureId);
  const { mutate: evaluateGate, isPending: isEvaluating } = useEvaluateGate(ventureId);

  const phase = phases?.find((p) => p.phase_number === phaseNumber);

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
    if (gateType === "auto") return; // Can't toggle auto gates
    updateGate({ phaseNum: phaseNumber, key, satisfied: !currentValue });
  };

  const handleEvaluate = () => {
    evaluateGate(phaseNumber);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link
              href={`/ventures/${ventureId}`}
              className="hover:text-gray-700"
            >
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
                  gate.satisfied
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <button
                  onClick={() =>
                    handleToggleGate(gate.key, gate.satisfied, gate.gate_type)
                  }
                  disabled={
                    gate.gate_type === "auto" ||
                    isUpdating ||
                    phase.status === "LOCKED"
                  }
                  className={cn(
                    "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
                    gate.satisfied
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300 hover:border-gray-400",
                    gate.gate_type === "auto" && "cursor-not-allowed opacity-60"
                  )}
                >
                  {gate.satisfied && (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <p
                    className={cn(
                      "font-medium",
                      gate.satisfied ? "text-green-700" : "text-gray-700"
                    )}
                  >
                    {gate.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {gate.gate_type === "auto"
                      ? "Auto-evaluated"
                      : "Self-reported"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {phase.status === "ACTIVE" && (
            <div className="mt-6 flex gap-3">
              <Button
                onClick={handleEvaluate}
                isLoading={isEvaluating}
                disabled={isEvaluating}
              >
                Re-evaluate Gates
              </Button>
              <Link href={`/ventures/${ventureId}/chat`}>
                <Button variant="outline">Get AI Help</Button>
              </Link>
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
              <p className="whitespace-pre-wrap text-gray-700">
                {phase.guide_content}
              </p>
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
                <li
                  key={index}
                  className="flex items-center gap-2 text-gray-700"
                >
                  <svg
                    className="w-4 h-4 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
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
