import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface SkeletonListProps {
  count?: number;
  variant?: "card" | "row";
}

export function SkeletonList({ count = 5, variant = "card" }: SkeletonListProps) {
  if (variant === "row") {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
            <Skeleton className="h-5 w-24 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
