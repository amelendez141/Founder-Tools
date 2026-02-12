import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-gray-200",
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Phase timeline skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="flex justify-between mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3 w-16 mt-2" />
            </div>
          ))}
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
          <Skeleton className={`h-16 ${i % 2 === 0 ? "w-2/3" : "w-3/4"} rounded-lg`} />
        </div>
      ))}
    </div>
  );
}
