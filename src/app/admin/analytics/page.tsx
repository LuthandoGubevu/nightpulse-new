
import { PageHeader } from "@/components/common/PageHeader";
import { AnalyticsDashboardClient } from "@/components/admin/analytics/AnalyticsDashboardClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/components/icons";

function AnalyticsSkeleton() {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow p-6 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6 space-y-4">
                <Skeleton className="h-6 w-1/2 mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>
             <div className="rounded-xl border bg-card text-card-foreground shadow p-6 space-y-4">
                <Skeleton className="h-6 w-1/2 mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
      </div>
    );
  }

export default async function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nightclub Analytics"
        description="Insights into club performance and visitor trends."
      >
        {/* Add any header actions if needed, e.g., date range picker */}
      </PageHeader>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsDashboardClient />
      </Suspense>
    </div>
  );
}

export const revalidate = 0; // Ensure fresh data for analytics, or use specific revalidation times
