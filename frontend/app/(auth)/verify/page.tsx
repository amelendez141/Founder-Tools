"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useVerifyToken } from "@/lib/api/hooks/use-auth";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { mutate: verifyToken, isPending, isError, error } = useVerifyToken();

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token, verifyToken]);

  if (!token) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>
            This magic link is invalid or has expired. Please request a new one.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Verification failed</CardTitle>
          <CardDescription>
            {error?.message ?? "This link may have expired. Please request a new magic link."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <svg
            className="h-8 w-8 animate-spin text-primary-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <CardTitle>Verifying...</CardTitle>
        <CardDescription>
          Please wait while we verify your magic link.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
