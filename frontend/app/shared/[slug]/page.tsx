"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import Link from "next/link";

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

export default function SharedArtifactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["shared", slug],
    queryFn: () => api.getPublicArtifact(slug),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-bold text-gray-900">
              Artifact Not Found
            </h2>
            <p className="text-gray-600 mt-2">
              This artifact may have been removed or the link is invalid.
            </p>
            <Link
              href="/"
              className="text-primary-600 hover:underline mt-4 inline-block"
            >
              Go to Founder Toolkit
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
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
            <span className="font-semibold text-gray-900">Founder Toolkit</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span>{data.venture_name ?? "Unnamed Venture"}</span>
              <span>/</span>
              <span>{data.phase_name}</span>
            </div>
            <CardTitle className="text-2xl">
              {ARTIFACT_LABELS[data.artifact.type] ?? data.artifact.type}
            </CardTitle>
            <CardDescription>
              Version {data.artifact.version} - Created{" "}
              {new Date(data.artifact.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-gray max-w-none">
              {Object.entries(data.artifact.content).map(([key, value]) => (
                <div key={key} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 capitalize mb-2">
                    {key.replace(/_/g, " ")}
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {String(value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="mt-8">
          <CardContent className="py-8 text-center">
            <h3 className="text-xl font-bold text-gray-900">
              Build Your Own Business Plan
            </h3>
            <p className="text-gray-600 mt-2">
              Create AI-powered artifacts for your venture with Founder Toolkit
            </p>
            <Link href="/signup">
              <button className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                Get Started Free
              </button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
