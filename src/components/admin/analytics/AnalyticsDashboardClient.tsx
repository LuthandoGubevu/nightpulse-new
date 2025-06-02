
"use client";

import { useEffect, useState } from "react";
import { firestore } from "@/lib/firebase";
import { collection, onSnapshot, query, where, getDocs, Timestamp } from "firebase/firestore";
import type { ClubWithId, Visit } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { HourlyVisitorsChart } from "./HourlyVisitorsChart";
import { BusiestDayChart } from "./BusiestDayChart";
import { VisitMetricsWidget } from "./VisitMetricsWidget";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data processing functions (replace with actual logic)
async function processHourlyData(visits: Visit[]): Promise<any[]> {
    // Placeholder: Group visits by hour
    console.log("Processing hourly data for", visits.length, "visits");
    await new Promise(res => setTimeout(res, 500)); // Simulate processing
    // Example structure: { hour: "00:00", visitors: 10 }
    const hourlyCounts: { [key: string]: number } = {};
    for (let i = 0; i < 24; i++) {
        hourlyCounts[i.toString().padStart(2, '0') + ":00"] = 0;
    }
    visits.forEach(visit => {
        if (visit.entryTimestamp) {
            const entryDate = visit.entryTimestamp instanceof Timestamp ? visit.entryTimestamp.toDate() : new Date(visit.entryTimestamp);
            const hour = entryDate.getHours().toString().padStart(2, '0') + ":00";
            hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
        }
    });
    return Object.entries(hourlyCounts).map(([hour, visitors]) => ({ name: hour, visitors })).sort((a,b) => a.name.localeCompare(b.name));
}

async function processBusiestDayData(visits: Visit[]): Promise<any[]> {
    // Placeholder: Group visits by day of the week
    console.log("Processing busiest day data for", visits.length, "visits");
    await new Promise(res => setTimeout(res, 500));
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyCounts: { [key: string]: number } = {};
    days.forEach(day => dailyCounts[day] = 0);

    visits.forEach(visit => {
         if (visit.entryTimestamp) {
            const entryDate = visit.entryTimestamp instanceof Timestamp ? visit.entryTimestamp.toDate() : new Date(visit.entryTimestamp);
            const dayName = days[entryDate.getDay()];
            if(dayName) dailyCounts[dayName] = (dailyCounts[dayName] || 0) + 1;
        }
    });
    return Object.entries(dailyCounts).map(([name, visitors]) => ({ name, visitors }));
}

async function processVisitMetrics(visits: Visit[]): Promise<{ avgDuration: string; newVsReturning: { new: number; returning: number } }> {
    console.log("Processing visit metrics for", visits.length, "visits");
    await new Promise(res => setTimeout(res, 500));
    // Placeholder calculations
    let totalDuration = 0;
    let completedVisits = 0;
    const deviceVisits: { [key: string]: number } = {};

    visits.forEach(visit => {
        if (visit.entryTimestamp && visit.exitTimestamp) {
            const entry = visit.entryTimestamp instanceof Timestamp ? visit.entryTimestamp.toDate() : new Date(visit.entryTimestamp);
            const exit = visit.exitTimestamp instanceof Timestamp ? visit.exitTimestamp.toDate() : new Date(visit.exitTimestamp);
            const duration = (exit.getTime() - entry.getTime()) / (1000 * 60); // in minutes
            if (duration > 0) {
                totalDuration += duration;
                completedVisits++;
            }
        }
        if(visit.deviceId) {
            deviceVisits[visit.deviceId] = (deviceVisits[visit.deviceId] || 0) + 1;
        }
    });

    const avgDurationMinutes = completedVisits > 0 ? totalDuration / completedVisits : 0;
    
    let newVisitors = 0;
    let returningVisitors = 0;
    Object.values(deviceVisits).forEach(count => {
        if (count === 1) newVisitors++;
        else returningVisitors++;
    });

    return {
        avgDuration: `${avgDurationMinutes.toFixed(0)} min`,
        newVsReturning: { new: newVisitors, returning: returningVisitors }
    };
}


export function AnalyticsDashboardClient() {
  const [activeClubs, setActiveClubs] = useState(0);
  const [totalClubs, setTotalClubs] = useState(0);
  const [loadingActiveClubs, setLoadingActiveClubs] = useState(true);

  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [busiestDayData, setBusiestDayData] = useState<any[]>([]);
  const [visitMetrics, setVisitMetrics] = useState<{ avgDuration: string; newVsReturning: { new: number; returning: number } } | null>(null);
  const [loadingHistorical, setLoadingHistorical] = useState(true);

  // Real-time active clubs
  useEffect(() => {
    if (!firestore) return;
    const clubsRef = collection(firestore, "clubs");
    const unsubscribe = onSnapshot(query(clubsRef), (snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        if ((doc.data().currentCount || 0) > 0) {
          count++;
        }
      });
      setActiveClubs(count);
      setTotalClubs(snapshot.docs.length);
      setLoadingActiveClubs(false);
    }, (error) => {
        console.error("Error fetching active clubs:", error);
        setLoadingActiveClubs(false);
    });
    return () => unsubscribe();
  }, []);

  // Historical data (fetch once on mount)
  useEffect(() => {
    async function fetchHistoricalData() {
      if (!firestore) return;
      setLoadingHistorical(true);
      try {
        const visitsRef = collection(firestore, "visits");
        // Consider adding a date range filter for visits (e.g., last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const visitsQuery = query(visitsRef, where("entryTimestamp", ">=", Timestamp.fromDate(thirtyDaysAgo)));

        const snapshot = await getDocs(visitsQuery);
        const visits = snapshot.docs.map(doc => doc.data() as Visit);

        setHourlyData(await processHourlyData(visits));
        setBusiestDayData(await processBusiestDayData(visits));
        setVisitMetrics(await processVisitMetrics(visits));

      } catch (error) {
        console.error("Error fetching historical visit data:", error);
      } finally {
        setLoadingHistorical(false);
      }
    }
    fetchHistoricalData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Real-time Metrics Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clubs</CardTitle>
            <Icons.activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingActiveClubs ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{activeClubs}</div> }
            {!loadingActiveClubs && <p className="text-xs text-muted-foreground">out of {totalClubs} total clubs</p>}
          </CardContent>
        </Card>
        {/* Placeholder for other real-time metrics if any */}
      </div>

      {/* Historical Analytics Section */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Hourly Visitors Trend (Last 30 Days)</CardTitle>
            <CardDescription>Number of new entries per hour.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {loadingHistorical ? <Skeleton className="h-72 w-full" /> : <HourlyVisitorsChart data={hourlyData} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Busiest Night of the Week (Last 30 Days)</CardTitle>
            <CardDescription>Total entries per day of the week.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             {loadingHistorical ? <Skeleton className="h-72 w-full" /> : <BusiestDayChart data={busiestDayData} />}
          </CardContent>
        </Card>
        <VisitMetricsWidget metrics={visitMetrics} loading={loadingHistorical} />
      </div>
    </div>
  );
}
