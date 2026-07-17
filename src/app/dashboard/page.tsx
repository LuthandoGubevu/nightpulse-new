
"use client"; 

import React, { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { firestore, auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { getMyRatingsAction } from "@/actions/ratingActions";
import type { ClubWithId, UserLocation } from "@/types";
import { ClubList } from "@/components/clubs/ClubList";
import { PageHeader } from "@/components/common/PageHeader";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { haversineDistance, getClubStatus } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useGeofenceAutoCheckin } from "@/hooks/useGeofenceAutoCheckin";
import { useHeartbeatTracker } from "@/hooks/useHeartbeatTracker";
import { getLiveClubCounts } from "@/actions/clubActions"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallPrompt } from "@/components/common/PwaInstallPrompt";

function AccessDeniedNotice() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("error") === "access_denied") {
      toast({
        title: "Access Denied",
        description: "You do not have permission to view that section.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  return null;
}

type LocationStatus = "locating" | "active" | "denied" | "unavailable";

function DashboardLoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader
        title="Nightclub Dashboard"
        description="Finding real-time crowd levels and estimated wait times..."
      />
      <div className="mt-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
            <Skeleton className="h-10 w-full md:w-auto" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-row gap-2 w-full md:w-auto">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid w-full grid-cols-2 md:w-96">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex flex-col overflow-hidden">
              <CardContent className="p-6 flex-grow space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="p-6 border-t">
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [allClubs, setAllClubs] = useState<ClubWithId[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("locating");
  const [sortBy, setSortBy] = useState<string>("default");
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const [activeGeofenceClubId, setActiveGeofenceClubId] = useState<string | null>(null);

  const [liveClubCounts, setLiveClubCounts] = useState<Record<string, number>>({});
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const { showInstallPrompt, handleInstallClick, handleDismissClick } = usePwaInstall();


  useEffect(() => {
    if (!firestore) { 
      console.warn("Firestore is not initialized. Dashboard will be empty.");
      setAllClubs([]);
      setLoadingClubs(false);
      setFirestoreError("Firebase Firestore is not available. Please check configuration.");
      return;
    }
    setFirestoreError(null);
    setLoadingClubs(true);
    const clubsCol = collection(firestore, "clubs");
    const q = query(clubsCol, orderBy("name"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const clubList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let announcementExpiresAt = null;
        if (data.announcementExpiresAt) {
            announcementExpiresAt = data.announcementExpiresAt instanceof Timestamp ? data.announcementExpiresAt.toDate() : new Date(data.announcementExpiresAt);
        }
        return {
          id: doc.id,
          name: data.name || "Unnamed Club",
          address: data.address || "No address",
          location: data.location || null,
          currentCount: data.currentCount || 0, // Base count from admin
          capacityThresholds: data.capacityThresholds || { low: 50, moderate: 100, packed: 150 },
          lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate().toISOString() : new Date().toISOString(),
          imageUrl: data.imageUrl || `https://placehold.co/600x400.png`,
          data_ai_hint: data.data_ai_hint || (data.name ? data.name.toLowerCase().split(" ").slice(0,2).join(" ") : "nightclub"),
          estimatedWaitTime: data.estimatedWaitTime,
          tags: data.tags || [],
          musicGenres: data.musicGenres || [],
          tonightDJ: data.tonightDJ,
          announcementMessage: data.announcementMessage,
          announcementExpiresAt: announcementExpiresAt,
          safetyRatingSum: data.safetyRatingSum ?? 0,
          safetyRatingCount: data.safetyRatingCount ?? 0,
          isTrending: getClubStatus(liveClubCounts[doc.id] ?? data.currentCount ?? 0, data.capacityThresholds || {}) === 'packed' || getClubStatus(liveClubCounts[doc.id] ?? data.currentCount ?? 0, data.capacityThresholds || {}) === 'over-packed',
        } as ClubWithId;
      });
      
      setAllClubs(clubList);
      setLoadingClubs(false);
    }, (error) => {
      console.error("Error fetching clubs with real-time listener:", error);
      toast({ title: "Error", description: "Could not fetch club data. Please try again later.", variant: "destructive" });
      setAllClubs([]); 
      setLoadingClubs(false);
      setFirestoreError("Failed to load club data from Firestore.");
    });
    return () => unsubscribe();
  }, [toast, liveClubCounts]); // liveClubCounts dependency to re-evaluate isTrending

  const fetchLiveCounts = useCallback(async () => {
    if (!firestore) {
        // console.warn("Firestore not initialized, skipping live count fetch.");
        setLiveClubCounts({}); // Ensure it's empty if no firestore
        return;
    }
    try {
      const counts = await getLiveClubCounts();
      setLiveClubCounts(counts);
    } catch (error) {
      console.error("Failed to fetch live club counts:", error);
      // Potentially set liveClubCounts to {} or show a toast
    }
  }, []);

  useEffect(() => {
    fetchLiveCounts();
    const interval = setInterval(fetchLiveCounts, 1 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLiveCounts]);

  // Fetch this user's own safety-rating votes once per login/club-set change (not
  // polled — this data only changes via the user's own actions, which the
  // SafetyRatingWidget already reflects optimistically without a refetch).
  const clubIdsKey = useMemo(() => allClubs.map(c => c.id).sort().join(","), [allClubs]);

  useEffect(() => {
    if (!user || !clubIdsKey) {
      setMyRatings({});
      return;
    }
    let cancelled = false;
    (async () => {
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken || cancelled) return;
      const ratings = await getMyRatingsAction(idToken, clubIdsKey.split(","));
      if (!cancelled) setMyRatings(ratings);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, clubIdsKey]);

  const handleGeofenceChange = useCallback((clubId: string | null) => {
    setActiveGeofenceClubId(clubId);
  }, []);
  
  const isTrackingActive = locationStatus === "active";

  const { locationError: geofenceLocationError } = useGeofenceAutoCheckin({
    clubs: allClubs,
    isEnabled: isTrackingActive,
    userLocation: userLocation,
    onGeofenceChange: handleGeofenceChange,
  });

  useHeartbeatTracker({
    clubId: activeGeofenceClubId,
    userLocation: userLocation,
    isEnabled: isTrackingActive && !!activeGeofenceClubId,
  });
  
  useEffect(() => {
    if (geofenceLocationError) {
      toast({ variant: 'destructive', title: 'Auto Presence Location Issue', description: geofenceLocationError });
    }
  }, [geofenceLocationError, toast]);

  const watchIdRef = useRef<number | null>(null);
  const errorToastShownRef = useRef(false);
  const hasAutoSortedRef = useRef(false);

  const beginLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }
    if (watchIdRef.current !== null) return;

    setLocationStatus("locating");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("active");
        if (!hasAutoSortedRef.current) {
          hasAutoSortedRef.current = true;
          setSortBy("nearby");
        }
      },
      (error) => {
        console.error("Error watching user location:", error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("denied");
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
        } else {
          // Transient (TIMEOUT / POSITION_UNAVAILABLE) — leave the watch running so the
          // browser can recover on its own instead of forcing the user back through a
          // manual re-enable flow for a temporary GPS hiccup.
          setLocationStatus("unavailable");
        }
        if (!errorToastShownRef.current) {
          errorToastShownRef.current = true;
          toast({
            title: error.code === error.PERMISSION_DENIED ? "Location Access Off" : "Location Unavailable",
            description:
              error.code === error.PERMISSION_DENIED
                ? "Enable location for this site in your browser settings to get nearby sorting and auto check-in."
                : `Could not determine your location: ${error.message}`,
            variant: "destructive",
          });
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000, distanceFilter: 10 }
    );
  }, [toast]);

  // Start tracking unconditionally on mount — calling watchPosition itself triggers the
  // browser's native permission prompt with no button click required, and silently
  // resumes on later visits where permission was already granted. No localStorage
  // involved: the browser is the source of truth for permission state.
  useEffect(() => {
    beginLocationTracking();
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clubsWithLiveCountsAndDistance = useMemo(() => {
    let clubsToProcess = allClubs.map(club => ({
      ...club,
      // Prioritize live count. If not available, use the admin-set base count.
      currentCount: liveClubCounts[club.id] ?? club.currentCount ?? 0, 
      isTrending: getClubStatus(liveClubCounts[club.id] ?? club.currentCount ?? 0, club.capacityThresholds || {}) === 'packed' || getClubStatus(liveClubCounts[club.id] ?? club.currentCount ?? 0, club.capacityThresholds || {}) === 'over-packed',
      distance: userLocation && club.location ? haversineDistance(userLocation.lat, userLocation.lng, club.location.lat, club.location.lng) : Infinity,
      myRating: myRatings[club.id] ?? null,
    }));

    if (filterTags.length > 0) {
      clubsToProcess = clubsToProcess.filter(club => 
        filterTags.every(filterTag => {
          if (filterTag === "trending") return club.isTrending;
          return club.tags?.includes(filterTag);
        })
      );
    }
    
    if (sortBy === "nearby" && userLocation) {
         clubsToProcess.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else if (sortBy === "crowded") { 
        clubsToProcess.sort((a,b) => (b.currentCount || 0) - (a.currentCount || 0));
    } else { 
        clubsToProcess.sort((a,b) => a.name.localeCompare(b.name));
    }
    return clubsToProcess;
  }, [allClubs, userLocation, sortBy, filterTags, liveClubCounts, myRatings]);


  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  const handleFilterChange = (value: string) => {
    setFilterTags(value === "all" ? [] : [value]);
  };

  if (loadingClubs) {
    return <DashboardLoadingSkeleton />;
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={null}>
        <AccessDeniedNotice />
      </Suspense>
      <PageHeader
        title="Nightclub Dashboard"
        description="Find real-time crowd levels, wait times, and vibes for nightclubs."
      />

      {showInstallPrompt && (
        <PwaInstallPrompt
          onInstall={handleInstallClick}
          onDismiss={handleDismissClick}
        />
      )}

      {firestoreError && (
        <Alert variant="destructive" className="my-4">
          <Icons.warning className="h-4 w-4" />
          <AlertTitle>Application Error</AlertTitle>
          <AlertDescription>
            {firestoreError} Some features may be unavailable. Please ensure Firebase is correctly configured and the server is running.
          </AlertDescription>
        </Alert>
      )}

      <div className="my-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {locationStatus !== "active" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground w-full md:w-auto">
            {locationStatus === "locating" && (
              <>
                <Icons.spinner className="h-4 w-4 animate-spin" />
                <span>Locating you…</span>
              </>
            )}
            {locationStatus === "denied" && (
              <>
                <Icons.warning className="h-4 w-4 text-destructive" />
                <span>Location is off — enable it in your browser&apos;s site settings for nearby sorting &amp; auto check-in.</span>
              </>
            )}
            {locationStatus === "unavailable" && (
              <>
                <Icons.warning className="h-4 w-4 text-amber-500" />
                <span>Can&apos;t get a location fix right now.</span>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={beginLocationTracking}>
                  Retry
                </Button>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto rounded-lg border border-white/10 bg-white/5 p-2">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Sort: Default</SelectItem>
              <SelectItem value="nearby" disabled={!userLocation}>Sort: Nearby</SelectItem>
              <SelectItem value="crowded">Sort: Most Crowded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTags[0] || "all"} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filter: All</SelectItem>
              <SelectItem value="trending">Filter: Trending Now 🔥</SelectItem>
              <SelectItem value="chill">Filter: Chill Vibe</SelectItem>
              <SelectItem value="live music">Filter: Live Music</SelectItem>
              <SelectItem value="rooftop">Filter: Rooftop</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6">
        <ClubList clubs={clubsWithLiveCountsAndDistance} activeGeofenceClubId={activeGeofenceClubId} />
      </div>
    </div>
  );
}
