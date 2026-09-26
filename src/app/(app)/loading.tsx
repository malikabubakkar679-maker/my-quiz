import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );
}
