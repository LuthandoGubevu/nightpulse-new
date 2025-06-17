
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

// Helper to generate mock visits
function generateMockVisits(numberOfVisits: number, clubIds: string[]): Visit[] {
  const visits: Visit[] = [];
  const now = Date.now();
  const daysInMonth = 30;

  for (let i = 0; i < numberOfVisits; i++) {
    const clubId = clubIds[Math.floor(Math.random() * clubIds.length)];
    const randomDayAgo = Math.floor(Math.random() * daysInMonth);
    const randomHour = Math.floor(Math.random() * 24);
    const randomMinute = Math.floor(Math.random() * 60);
    
    const entryTime = new Date(now - randomDayAgo * 24 * 60 * 60 * 1000);
    entryTime.setHours(randomHour, randomMinute, 0, 0);

    const durationMinutes = Math.floor(Math.random() * 180) + 30; // 30 min to 3.5 hours
    const exitTime = new Date(entryTime.getTime() + durationMinutes * 60 * 1000);

    visits.push({
      userId: `mock-user-${Math.floor(Math.random() * 1000)}`,
      deviceId: `mock-device-${Math.floor(Math.random() * 1000)}`,
      clubId: clubId,
      entryTimestamp: entryTime.toISOString(),
      exitTimestamp: exitTime.toISOString(),
    });
  }
  return visits;
}

const mockClubIdsForAnalytics = ['mock-club-1', 'mock-club-2', 'mock-club-3', 'mock-club-4'];
const fallbackMockVisits = generateMockVisits(250, mockClubIdsForAnalytics); // Generate 250 mock visits for analytics


async function processHourlyData(visits: Visit[]): Promise<any[]> {
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
    let totalDuration = 0;
    let completedVisitsCount = 0;
    const deviceVisits: { [key: string]: number } = {};

    visits.forEach(visit => {
        if (visit.entryTimestamp && visit.exitTimestamp) {
            const entry = visit.entryTimestamp instanceof Timestamp ? visit.entryTimestamp.toDate() : new Date(visit.entryTimestamp);
            const exit = visit.exitTimestamp instanceof Timestamp ? visit.exitTimestamp.toDate() : new Date(visit.exitTimestamp);
            const duration = (exit.getTime() - entry.getTime()) / (1000 * 60); 
            if (duration > 0 && duration < 12 * 60) { // Filter out very long/short durations
                totalDuration += duration;
                completedVisitsCount++;
            }
        }
        if(visit.deviceId) { // Ensure deviceId is present
            deviceVisits[visit.deviceId] = (deviceVisits[visit.deviceId] || 0) + 1;
        }
    });

    const avgDurationMinutes = completedVisitsCount > 0 ? totalDuration / completedVisitsCount : 0;
    
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

  useEffect(() => {
    if (!firestore) {
        // For mock active clubs, could use mockClubData length if available
        // For simplicity, showing 0 or a fixed mock number.
        setActiveClubs(2); // Example: 2 mock active clubs
        setTotalClubs(4);  // Example: 4 total mock clubs
        setLoadingActiveClubs(false);
        return;
    }
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

      // If no clubs, analytics will also likely show mock visit data
      if (snapshot.docs.length === 0) {
        console.log("No live clubs found, analytics will use mock visit data.");
      }

    }, (error) => {
        console.error("Error fetching active clubs:", error);
        setActiveClubs(2); 
        setTotalClubs(4); 
        setLoadingActiveClubs(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchHistoricalData() {
      setLoadingHistorical(true);
      let visitsToProcess: Visit[] = [];

      if (!firestore) {
        console.warn("Firestore unavailable for analytics. Using mock visit data.");
        visitsToProcess = fallbackMockVisits;
      } else {
        try {
          const visitsRef = collection(firestore, "visits");
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const visitsQuery = query(visitsRef, where("entryTimestamp", ">=", Timestamp.fromDate(thirtyDaysAgo)));

          const snapshot = await getDocs(visitsQuery);
          if (snapshot.empty) {
            console.log("No real visit data found in Firestore for analytics. Using mock data.");
            visitsToProcess = fallbackMockVisits;
          } else {
            visitsToProcess = snapshot.docs.map(doc => doc.data() as Visit);
          }
        } catch (error) {
          console.error("Error fetching historical visit data for analytics:", error);
          console.log("Using mock visit data for analytics due to error.");
          visitsToProcess = fallbackMockVisits;
        }
      }

      setHourlyData(await processHourlyData(visitsToProcess));
      setBusiestDayData(await processBusiestDayData(visitsToProcess));
      setVisitMetrics(await processVisitMetrics(visitsToProcess));
      setLoadingHistorical(false);
    }
    fetchHistoricalData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clubs Now</CardTitle>
            <Icons.activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingActiveClubs ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{activeClubs}</div> }
            {!loadingActiveClubs && <p className="text-xs text-muted-foreground">out of {totalClubs} total clubs</p>}
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits (Last 30 Days)</CardTitle>
            <Icons.users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingHistorical ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{ hourlyData.reduce((acc, curr) => acc + curr.visitors, 0) || fallbackMockVisits.length }</div> }
            {!loadingHistorical && <p className="text-xs text-muted-foreground">Across all clubs (real or sample)</p>}
          </CardContent>
        </Card>
        <VisitMetricsWidget metrics={visitMetrics} loading={loadingHistorical} />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Hourly Visitors Trend (Last 30 Days)</CardTitle>
            <CardDescription>Average new entries per hour (real or sample data).</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {loadingHistorical ? <Skeleton className="h-72 w-full" /> : <HourlyVisitorsChart data={hourlyData} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Busiest Night of the Week (Last 30 Days)</CardTitle>
            <CardDescription>Total entries per day of the week (real or sample data).</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             {loadingHistorical ? <Skeleton className="h-72 w-full" /> : <BusiestDayChart data={busiestDayData} />}
          </CardContent>
        </Card>
        {/* Removed the extra VisitMetricsWidget that was here to avoid duplication, as one is in the top row */}
      </div>
    </div>
  );
}
