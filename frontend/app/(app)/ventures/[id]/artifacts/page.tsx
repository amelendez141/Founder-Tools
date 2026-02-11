"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Artifact } from "@/lib/api/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

const ARTIFACT_LABELS: Record<string, string> = {
  BUSINESS_PLAN: "Business Plan",
  OFFER_STATEMENT: "Offer Statement",
  GTM_PLAN: "Go-to-Market Plan",
  GROWTH_PLAN: "Growth Plan",
  BRAND_BRIEF: "Brand Brief",
  FINANCIAL_SHEET: "Financial Sheet",
  CUSTOMER_LIST: "Customer List",
  CUSTOM: "Custom Artifact",
};

export default function ArtifactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ventureId } = use(params);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const queryClient = useQueryClient();

  const { data: artifacts, isLoading } = useQuery({
    queryKey: ["artifacts", ventureId],
    queryFn: () => api.getArtifacts(ventureId),
  });

  const { mutate: shareArtifact, isPending: isSharing } = useMutation({
    mutationFn: (artifactId: string) => api.shareArtifact(ventureId, artifactId),
    onSuccess: (data) => {
      const url = `${window.location.origin}/shared/${data.slug}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
      queryClient.invalidateQueries({ queryKey: ["artifacts", ventureId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Artifacts</h1>
          <p className="text-gray-600">
            AI-generated documents for your venture
          </p>
        </div>
        <Link href={`/ventures/${ventureId}/chat`}>
          <Button>Generate New Artifact</Button>
        </Link>
      </div>

      {artifacts?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No artifacts yet</h3>
            <p className="text-gray-500 mt-1">
              Use the AI Copilot to generate your first artifact
            </p>
            <Link href={`/ventures/${ventureId}/chat`}>
              <Button className="mt-4">Go to AI Chat</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {artifacts?.map((artifact) => (
            <Card
              key={artifact.id}
              className={cn(
                "cursor-pointer transition-shadow hover:shadow-md",
                selectedArtifact?.id === artifact.id && "ring-2 ring-primary-500"
              )}
              onClick={() => setSelectedArtifact(artifact)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {ARTIFACT_LABELS[artifact.type] ?? artifact.type}
                    </CardTitle>
                    <CardDescription>
                      Phase {artifact.phase_number} - v{artifact.version}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      shareArtifact(artifact.id);
                    }}
                    disabled={isSharing}
                  >
                    Share
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Created {new Date(artifact.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Artifact Detail Modal */}
      {selectedArtifact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-3xl w-full max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>
                    {ARTIFACT_LABELS[selectedArtifact.type] ?? selectedArtifact.type}
                  </CardTitle>
                  <CardDescription>Version {selectedArtifact.version}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedArtifact(null)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {Object.entries(selectedArtifact.content).map(([key, value]) => (
                  <div key={key} className="mb-4">
                    <h4 className="font-medium text-gray-900 capitalize">
                      {key.replace(/_/g, " ")}
                    </h4>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
