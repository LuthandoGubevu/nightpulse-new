
"use client";

import { useEffect, useMemo, useState } from "react";
import { firestore, auth } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icons } from "@/components/icons";
import { ClubRatingIndicator } from "@/components/clubs/ClubRatingIndicator";
import { HourlyVisitorsChart } from "./HourlyVisitorsChart";
import { BusiestDayChart } from "./BusiestDayChart";
import { VisitMetricsWidget } from "./VisitMetricsWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { getLiveClubCounts, getRecentHeartbeats, type HeartbeatRecord } from "@/actions/clubActions";

interface ClubOption {
  id: string;
  name: string;
  safetyRatingSum: number;
  safetyRatingCount: number;
}

// These are pure computations over an already-fetched (and possibly club-filtered)
// heartbeat array — no I/O, so they run synchronously inside a useMemo rather than
// re-fetching from the network every time the selected club changes.
function processHourlyData(heartbeats: HeartbeatRecord[]) {
  const hourlyCounts: { [key: string]: number } = {};
  for (let i = 0; i < 24; i++) {
    hourlyCounts[i.toString().padStart(2, "0") + ":00"] = 0;
  }
  heartbeats.forEach((hb) => {
    if (hb.lastSeen) {
      const entryDate = new Date(hb.lastSeen);
      const hour = entryDate.getHours().toString().padStart(2, "0") + ":00";
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    }
  });
  return Object.entries(hourlyCounts)
    .map(([hour, visitors]) => ({ name: hour, visitors }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function processBusiestDayData(heartbeats: HeartbeatRecord[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyCounts: { [key: string]: number } = {};
  days.forEach((day) => (dailyCounts[day] = 0));
  heartbeats.forEach((hb) => {
    if (hb.lastSeen) {
      const entryDate = new Date(hb.lastSeen);
      const dayName = days[entryDate.getDay()];
      if (dayName) dailyCounts[dayName] = (dailyCounts[dayName] || 0) + 1;
    }
  });
  return Object.entries(dailyCounts).map(([name, visitors]) => ({ name, visitors }));
}

// Visit metrics might be less meaningful with only heartbeats (no explicit exit times).
// For now, focusing on new vs returning based on unique device IDs seen. Avg duration is N/A.
function processVisitMetrics(heartbeats: HeartbeatRecord[]) {
  const deviceVisits: { [key: string]: number } = {}; // deviceId -> count of heartbeats

  heartbeats.forEach((hb) => {
    if (hb.deviceId) {
      deviceVisits[hb.deviceId] = (deviceVisits[hb.deviceId] || 0) + 1;
    }
  });

  let newVisitors = 0;
  let returningVisitors = 0; // A device is "returning" if it has sent multiple heartbeats over time.
  const heartbeatThresholdForReturning = 3; // Arbitrary: >3 heartbeats counts as a 'longer' presence

  Object.values(deviceVisits).forEach((count) => {
    if (count <= heartbeatThresholdForReturning) newVisitors++;
    else returningVisitors++;
  });

  return {
    avgDuration: `N/A (Heartbeats)`,
    newVsReturning: { new: newVisitors, returning: returningVisitors },
  };
}

export function AnalyticsDashboardClient() {
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [selectedClubId, setSelectedClubId] = useState<string>("all");

  const [allHeartbeats, setAllHeartbeats] = useState<HeartbeatRecord[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore) {
      setClubs([]);
      setLoadingClubs(false);
      setFirestoreError("Firebase Firestore is not available for club data. Please check configuration.");
      return;
    }
    setFirestoreError(null);
    const clubsRef = collection(firestore, "clubs");
    const q = query(clubsRef, orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setClubs(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "Unnamed Club",
              safetyRatingSum: data.safetyRatingSum ?? 0,
              safetyRatingCount: data.safetyRatingCount ?? 0,
            };
          })
        );
        setLoadingClubs(false);
      },
      (error) => {
        console.error("Error fetching clubs:", error);
        setClubs([]);
        setLoadingClubs(false);
        setFirestoreError("Failed to load club data from Firestore.");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getLiveClubCounts()
      .then(setLiveCounts)
      .catch((err) => {
        console.error("Error fetching live club counts:", err);
      });
  }, []);

  useEffect(() => {
    async function fetchHeartbeats() {
      setLoadingHistorical(true);
      try {
        const idToken = await auth?.currentUser?.getIdToken();
        if (!idToken) {
          setFirestoreError("You must be signed in as an admin to view analytics.");
          setAllHeartbeats([]);
        } else {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          setAllHeartbeats(await getRecentHeartbeats(idToken, thirtyDaysAgo.getTime()));
        }
      } catch (error) {
        console.error("Error fetching historical heartbeat data for analytics:", error);
        setFirestoreError("Failed to load analytics data from Firestore.");
        setAllHeartbeats([]);
      } finally {
        setLoadingHistorical(false);
      }
    }
    fetchHeartbeats();
  }, []);

  const filteredHeartbeats = useMemo(
    () => (selectedClubId === "all" ? allHeartbeats : allHeartbeats.filter((hb) => hb.clubId === selectedClubId)),
    [allHeartbeats, selectedClubId]
  );

  const hourlyData = useMemo(() => processHourlyData(filteredHeartbeats), [filteredHeartbeats]);
  const busiestDayData = useMemo(() => processBusiestDayData(filteredHeartbeats), [filteredHeartbeats]);
  const visitMetrics = useMemo(() => processVisitMetrics(filteredHeartbeats), [filteredHeartbeats]);

  const selectedClub = selectedClubId === "all" ? null : clubs.find((c) => c.id === selectedClubId) ?? null;

  const activeClubsCount = useMemo(
    () => clubs.filter((club) => (liveCounts[club.id] ?? 0) > 0).length,
    [clubs, liveCounts]
  );

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

      <div className="flex items-center gap-3">
        <Label htmlFor="analytics-club-select" className="text-sm text-muted-foreground whitespace-nowrap">
          Viewing
        </Label>
        <Select value={selectedClubId} onValueChange={setSelectedClubId}>
          <SelectTrigger id="analytics-club-select" className="w-full sm:w-64">
            <SelectValue placeholder="Select a club" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clubs</SelectItem>
            {clubs.map((club) => (
              <SelectItem key={club.id} value={club.id}>
                {club.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("grid gap-6 md:grid-cols-2", selectedClub ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        {selectedClub ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Count Right Now</CardTitle>
              <Icons.activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{liveCounts[selectedClub.id] ?? 0}</div>
              <p className="text-xs text-muted-foreground">people checked in right now</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clubs Now</CardTitle>
              <Icons.activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingClubs ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{activeClubsCount}</div>}
              {!loadingClubs && <p className="text-xs text-muted-foreground">out of {clubs.length} total clubs</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Heartbeats (Last 30 Days)</CardTitle>
            <Icons.users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingHistorical ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="text-2xl font-bold">{filteredHeartbeats.length}</div>
            )}
            {!loadingHistorical && (
              <p className="text-xs text-muted-foreground">{selectedClub ? selectedClub.name : "Across all clubs"}</p>
            )}
          </CardContent>
        </Card>

        <VisitMetricsWidget metrics={visitMetrics} loading={loadingHistorical} />

        {selectedClub && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Safety Rating</CardTitle>
              <Icons.shieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <ClubRatingIndicator sum={selectedClub.safetyRatingSum} count={selectedClub.safetyRatingCount} size="md" />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Hourly Heartbeats Trend (Last 30 Days)</CardTitle>
            <CardDescription>
              Average heartbeats recorded per hour{selectedClub ? ` at ${selectedClub.name}` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {loadingHistorical ? <Skeleton className="h-72 w-full" /> : <HourlyVisitorsChart data={hourlyData} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Busiest Night of the Week (Heartbeats, Last 30 Days)</CardTitle>
            <CardDescription>
              Total heartbeats per day of the week{selectedClub ? ` at ${selectedClub.name}` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {loadingHistorical ? <Skeleton className="h-72 w-full" /> : <BusiestDayChart data={busiestDayData} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
