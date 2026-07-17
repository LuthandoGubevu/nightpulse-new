
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
import { AgeDistributionChart } from "./AgeDistributionChart";
import { VisitMetricsWidget } from "./VisitMetricsWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { getLiveClubCounts, getRecentHeartbeats, getRecentVisitSessions, type HeartbeatRecord, type VisitSessionRecord } from "@/actions/clubActions";
import { getAgesForUids } from "@/actions/profileActions";

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

function formatDuration(totalMinutes: number): string {
  if (!isFinite(totalMinutes) || totalMinutes < 1) return "< 1 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${minutes}m`;
}

// Built from visitSessions (one doc per continuous, gap-separated stay — see
// /api/heartbeat) rather than raw heartbeats, since average dwell time and a
// real new-vs-returning split both need per-visit history, not just each
// device's single always-overwritten `visits/{deviceId}` row.
function processVisitMetrics(sessions: VisitSessionRecord[]) {
  if (sessions.length === 0) {
    return { avgDuration: "N/A", newVsReturning: { new: 0, returning: 0 } };
  }

  const totalMinutes = sessions.reduce((sum, session) => {
    const durationMs = new Date(session.lastSeen).getTime() - new Date(session.firstSeen).getTime();
    return sum + Math.max(0, durationMs) / 60000;
  }, 0);

  const sessionsByDevice: { [key: string]: number } = {};
  sessions.forEach((session) => {
    if (session.deviceId) {
      sessionsByDevice[session.deviceId] = (sessionsByDevice[session.deviceId] || 0) + 1;
    }
  });

  let newVisitors = 0;
  let returningVisitors = 0; // A device is "returning" if it had more than one distinct visit in the window.
  Object.values(sessionsByDevice).forEach((count) => {
    if (count <= 1) newVisitors++;
    else returningVisitors++;
  });

  return {
    avgDuration: formatDuration(totalMinutes / sessions.length),
    newVsReturning: { new: newVisitors, returning: returningVisitors },
  };
}

const AGE_BUCKETS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

function bucketForAge(age: number): string {
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  if (age <= 64) return "55-64";
  return "65+";
}

// Buckets by distinct visitor (uid), not by session, so a patron who visited
// three times in the window counts once toward the age split, not three times.
function processAgeDistribution(sessions: VisitSessionRecord[], agesByUid: Record<string, number>) {
  const counts: { [key: string]: number } = {};
  AGE_BUCKETS.forEach((bucket) => (counts[bucket] = 0));

  const seenUids = new Set<string>();
  let withAge = 0;

  sessions.forEach((session) => {
    if (!session.uid || seenUids.has(session.uid)) return;
    seenUids.add(session.uid);
    const age = agesByUid[session.uid];
    if (typeof age === "number") {
      withAge++;
      counts[bucketForAge(age)]++;
    }
  });

  const data = AGE_BUCKETS.map((name) => ({
    name,
    percent: withAge > 0 ? Math.round((counts[name] / withAge) * 1000) / 10 : 0,
  }));

  return { data, withAge, totalDistinctVisitors: seenUids.size };
}

export function AnalyticsDashboardClient() {
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [selectedClubId, setSelectedClubId] = useState<string>("all");

  const [allHeartbeats, setAllHeartbeats] = useState<HeartbeatRecord[]>([]);
  const [allSessions, setAllSessions] = useState<VisitSessionRecord[]>([]);
  const [agesByUid, setAgesByUid] = useState<Record<string, number>>({});
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
    async function fetchHistoricalData() {
      setLoadingHistorical(true);
      try {
        const idToken = await auth?.currentUser?.getIdToken();
        if (!idToken) {
          setFirestoreError("You must be signed in as an admin to view analytics.");
          setAllHeartbeats([]);
          setAllSessions([]);
          setAgesByUid({});
        } else {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const sinceMillis = thirtyDaysAgo.getTime();
          const [heartbeats, sessions] = await Promise.all([
            getRecentHeartbeats(idToken, sinceMillis),
            getRecentVisitSessions(idToken, sinceMillis),
          ]);
          setAllHeartbeats(heartbeats);
          setAllSessions(sessions);

          // Ages are fetched once for every distinct linked uid across the whole
          // 30-day window (not re-filtered by club), so switching the club
          // dropdown below doesn't trigger another round trip.
          const uids = Array.from(new Set(sessions.map((s) => s.uid).filter((uid): uid is string => !!uid)));
          setAgesByUid(uids.length > 0 ? await getAgesForUids(idToken, uids) : {});
        }
      } catch (error) {
        console.error("Error fetching historical analytics data:", error);
        setFirestoreError("Failed to load analytics data from Firestore.");
        setAllHeartbeats([]);
        setAllSessions([]);
        setAgesByUid({});
      } finally {
        setLoadingHistorical(false);
      }
    }
    fetchHistoricalData();
  }, []);

  const filteredHeartbeats = useMemo(
    () => (selectedClubId === "all" ? allHeartbeats : allHeartbeats.filter((hb) => hb.clubId === selectedClubId)),
    [allHeartbeats, selectedClubId]
  );

  const filteredSessions = useMemo(
    () => (selectedClubId === "all" ? allSessions : allSessions.filter((s) => s.clubId === selectedClubId)),
    [allSessions, selectedClubId]
  );

  const hourlyData = useMemo(() => processHourlyData(filteredHeartbeats), [filteredHeartbeats]);
  const busiestDayData = useMemo(() => processBusiestDayData(filteredHeartbeats), [filteredHeartbeats]);
  const visitMetrics = useMemo(() => processVisitMetrics(filteredSessions), [filteredSessions]);
  const ageDistribution = useMemo(
    () => processAgeDistribution(filteredSessions, agesByUid),
    [filteredSessions, agesByUid]
  );

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
          <Card variant="vy-glass">
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
          <Card variant="vy-glass">
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

        <Card variant="vy-glass">
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
          <Card variant="vy-glass">
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

      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Visitor Age Distribution (Last 30 Days)</CardTitle>
            <CardDescription>
              Share of distinct visitors by age bracket{selectedClub ? ` at ${selectedClub.name}` : ""}, based on age
              provided at sign-up.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {loadingHistorical ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <>
                <AgeDistributionChart data={ageDistribution.data} />
                {ageDistribution.totalDistinctVisitors > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Age on file for {ageDistribution.withAge} of {ageDistribution.totalDistinctVisitors} distinct
                    visitors in this window ({Math.round((ageDistribution.withAge / ageDistribution.totalDistinctVisitors) * 100)}%). The
                    rest haven&apos;t shared their age yet.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
