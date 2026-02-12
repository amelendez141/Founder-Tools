"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
          <h2>Something went wrong</h2>
          <p style={{ color: "#666" }}>
            {error.message || "An unexpected error occurred"}
          </p>
          <pre style={{
            background: "#f5f5f5",
            padding: "10px",
            borderRadius: "4px",
            fontSize: "12px",
            overflow: "auto",
            maxWidth: "100%"
          }}>
            {error.stack || String(error)}
          </pre>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              background: "#0066ff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
