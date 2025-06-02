
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";

interface VisitMetricsWidgetProps {
  metrics: {
    avgDuration: string;
    newVsReturning: { new: number; returning: number };
  } | null;
  loading: boolean;
}

export function VisitMetricsWidget({ metrics, loading }: VisitMetricsWidgetProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-8 w-1/4" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visit Summary (Last 30 Days)</CardTitle>
           <CardDescription>Average session length and visitor types.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No visit data to calculate metrics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit Summary (Last 30 Days)</CardTitle>
        <CardDescription>Average session length and visitor types.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground flex items-center">
            <Icons.clock className="h-4 w-4 mr-2" />
            Average Session Duration
          </p>
          <p className="text-2xl font-bold">{metrics.avgDuration}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground flex items-center">
            <Icons.usersRound className="h-4 w-4 mr-2" />
            Visitor Types
          </p>
          <p className="text-lg">New: <span className="font-semibold">{metrics.newVsReturning.new}</span></p>
          <p className="text-lg">Returning: <span className="font-semibold">{metrics.newVsReturning.returning}</span></p>
        </div>
      </CardContent>
    </Card>
  );
}
