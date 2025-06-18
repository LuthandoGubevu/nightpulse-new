
"use client";

import { useEffect, useState } from "react";
import { firestore } from "@/lib/firebase";
import { collection, onSnapshot, query, where, getDocs, Timestamp } from "firebase/firestore";
import type { ClubWithId, HeartbeatEntry } from "@/types"; // Changed Visit to HeartbeatEntry
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { HourlyVisitorsChart } from "./HourlyVisitorsChart";
import { BusiestDayChart } from "./BusiestDayChart";
import { VisitMetricsWidget } from "./VisitMetricsWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// Process hourly data based on heartbeat timestamps
async function processHourlyData(heartbeats: HeartbeatEntry[]): Promise<any[]> {
    const hourlyCounts: { [key: string]: number } = {};
    for (let i = 0; i < 24; i++) {
        hourlyCounts[i.toString().padStart(2, '0') + ":00"] = 0;
    }
    heartbeats.forEach(hb => {
        if (hb.lastSeen) {
            const entryDate = hb.lastSeen instanceof Timestamp ? hb.lastSeen.toDate() : new Date(hb.lastSeen as string);
            const hour = entryDate.getHours().toString().padStart(2, '0') + ":00";
            hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1; // Count each heartbeat
        }
    });
    return Object.entries(hourlyCounts).map(([hour, visitors]) => ({ name: hour, visitors })).sort((a,b) => a.name.localeCompare(b.name));
}

// Process busiest day based on heartbeat timestamps
async function processBusiestDayData(heartbeats: HeartbeatEntry[]): Promise<any[]> {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyCounts: { [key: string]: number } = {};
    days.forEach(day => dailyCounts[day] = 0);

    heartbeats.forEach(hb => {
         if (hb.lastSeen) {
            const entryDate = hb.lastSeen instanceof Timestamp ? hb.lastSeen.toDate() : new Date(hb.lastSeen as string);
            const dayName = days[entryDate.getDay()];
            if(dayName) dailyCounts[dayName] = (dailyCounts[dayName] || 0) + 1; // Count each heartbeat
        }
    });
    return Object.entries(dailyCounts).map(([name, visitors]) => ({ name, visitors }));
}

// Process visit metrics might be less meaningful with only heartbeats (no explicit exit times)
// For now, focusing on new vs returning based on unique device IDs seen. Avg duration is N/A.
async function processVisitMetrics(heartbeats: HeartbeatEntryWithDeviceId[]): Promise<{ avgDuration: string; newVsReturning: { new: number; returning: number } }> {
    const deviceVisits: { [key: string]: number } = {}; // deviceId -> count of heartbeats

    heartbeats.forEach(hb => {
        if(hb.deviceId) {
            deviceVisits[hb.deviceId] = (deviceVisits[hb.deviceId] || 0) + 1;
        }
    });
    
    let newVisitors = 0;
    let returningVisitors = 0; // A device is "returning" if it has sent multiple heartbeats over time.
                               // This definition might need refinement based on desired analytics.
                               // For simplicity, count devices that sent > N heartbeats as returning.
    const heartbeatThresholdForReturning = 3; // Arbitrary: if device sent >3 heartbeats, consider it a 'longer' presence

    Object.values(deviceVisits).forEach(count => {
        if (count <= heartbeatThresholdForReturning) newVisitors++; // Or "short stay"
        else returningVisitors++; // Or "longer stay"
    });

    return {
        avgDuration: `N/A (Heartbeats)`,
        newVsReturning: { new: newVisitors, returning: returningVisitors }
    };
}

// Add deviceId to HeartbeatEntry for processingVisitMetrics
interface HeartbeatEntryWithDeviceId extends HeartbeatEntry {
  deviceId: string;
}

export function AnalyticsDashboardClient() {
  const [activeClubs, setActiveClubs] = useState(0);
  const [totalClubs, setTotalClubs] = useState(0);
  const [loadingActiveClubs, setLoadingActiveClubs] = useState(true);

  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [busiestDayData, setBusiestDayData] = useState<any[]>([]);
  const [visitMetrics, setVisitMetrics] = useState<{ avgDuration: string; newVsReturning: { new: number; returning: number } } | null>(null);
  const [loadingHistorical, setLoadingHistorical] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [totalHeartbeats, setTotalHeartbeats] = useState(0);


  useEffect(() => {
    if (!firestore) {
        setActiveClubs(0);
        setTotalClubs(0);
        setLoadingActiveClubs(false);
        setFirestoreError("Firebase Firestore is not available for club data. Please check configuration.");
        return;
    }
    setFirestoreError(null);
    const clubsRef = collection(firestore, "clubs");
    const unsubscribeClubs = onSnapshot(query(clubsRef), (snapshot) => {
      let liveClubCounts: Record<string, number> = {}; // Temp var to get live counts for active clubs display

      // Fetch live counts to determine "active" clubs based on heartbeats
      getLiveClubCounts().then(counts => {
        liveClubCounts = counts;
        let activeCount = 0;
        snapshot.docs.forEach(doc => {
          if ((liveClubCounts[doc.id] || 0) > 0) {
            activeCount++;
          }
        });
        setActiveClubs(activeCount);
      }).catch(err => console.error("Error fetching live counts for active clubs metric:", err));
      
      setTotalClubs(snapshot.docs.length);
      setLoadingActiveClubs(false);
    }, (error) => {
        console.error("Error fetching active clubs:", error);
        setActiveClubs(0); 
        setTotalClubs(0); 
        setLoadingActiveClubs(false);
        setFirestoreError("Failed to load club data from Firestore.");
    });
    return () => unsubscribeClubs();
  }, []);

  useEffect(() => {
    async function fetchHistoricalData() {
      setLoadingHistorical(true);
      let heartbeatsToProcess: HeartbeatEntryWithDeviceId[] = [];

      if (!firestore) {
        console.warn("Firestore unavailable for analytics. Analytics will be empty.");
        setHourlyData([]);
        setBusiestDayData([]);
        setVisitMetrics({ avgDuration: "N/A", newVsReturning: { new: 0, returning: 0 }});
        setTotalHeartbeats(0);
        setLoadingHistorical(false);
        setFirestoreError("Firebase Firestore is not available for analytics data. Please check configuration.");
        return;
      }
      setFirestoreError(null);
      try {
        const visitsRef = collection(firestore, "visits"); // 'visits' now holds heartbeats
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Querying by lastSeen which should be a Timestamp
        const heartbeatsQuery = query(visitsRef, where("lastSeen", ">=", Timestamp.fromDate(thirtyDaysAgo)));

        const snapshot = await getDocs(heartbeatsQuery);
        if (snapshot.empty) {
          console.log("No heartbeat data found in Firestore for analytics.");
          // Set to empty rather than mock
        } else {
          heartbeatsToProcess = snapshot.docs.map(doc => ({
             ...(doc.data() as HeartbeatEntry), 
             deviceId: doc.id 
            }));
        }
      } catch (error) {
        console.error("Error fetching historical heartbeat data for analytics:", error);
        setFirestoreError("Failed to load analytics data from Firestore.");
      }

      setHourlyData(await processHourlyData(heartbeatsToProcess));
      setBusiestDayData(await processBusiestDayData(heartbeatsToProcess));
      setVisitMetrics(await processVisitMetrics(heartbeatsToProcess));
      setTotalHeartbeats(heartbeatsToProcess.length);
      setLoadingHistorical(false);
    }
    fetchHistoricalData();
  }, []);

  return (
    <div className="space-y-6">
      {firestoreError && (
        <Alert variant="destructive" className="my-4">
          <Icons.warning className="h-4 w-4" />
          <AlertTitle>Application Error</AlertTitle>
          <AlertDescription>
            {firestoreError} Some analytics may be unavailable.
          </AlertDescription>
        </Alert>
      )}
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
            <CardTitle className="text-sm font-medium">Total Heartbeats (Last 30 Days)</CardTitle>
            <Icons.users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingHistorical ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{totalHeartbeats}</div> }
            {!loadingHistorical && <p className="text-xs text-muted-foreground">Across all clubs</p>}
          </CardContent>
        </Card>
        <VisitMetricsWidget metrics={visitMetrics} loading={loadingHistorical} />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Hourly Heartbeats Trend (Last 30 Days)</CardTitle>
            <CardDescription>Average heartbeats recorded per hour.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {loadingHistorical ? <Skeleton className="h-72 w-full" /> : <HourlyVisitorsChart data={hourlyData} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Busiest Night of the Week (Heartbeats, Last 30 Days)</CardTitle>
            <CardDescription>Total heartbeats per day of the week.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             {loadingHistorical ? <Skeleton className="h-72 w-full" /> : <BusiestDayChart data={busiestDayData} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
