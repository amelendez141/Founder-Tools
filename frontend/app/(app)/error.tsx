"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4 max-w-md text-center">
        {error.message || "An unexpected error occurred"}
      </p>
      <pre className="bg-gray-100 p-4 rounded text-xs max-w-lg overflow-auto mb-4">
        {error.stack || String(error)}
      </pre>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
