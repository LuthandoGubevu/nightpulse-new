
"use client"; 

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { ClubWithId, UserLocation } from "@/types";
import { ClubList } from "@/components/clubs/ClubList";
import { PageHeader } from "@/components/common/PageHeader";
import ClubMapWrapper from "@/components/clubs/ClubMapWrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { haversineDistance, getClubStatus } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useGeofenceAutoCheckin } from "@/hooks/useGeofenceAutoCheckin";
import { useHeartbeatTracker } from "@/hooks/useHeartbeatTracker";
import { getLiveClubCounts } from "@/actions/clubActions"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallPrompt } from "@/components/common/PwaInstallPrompt";

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
  const [allClubs, setAllClubs] = useState<ClubWithId[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [sortBy, setSortBy] = useState<string>("default"); 
  const [filterTags, setFilterTags] = useState<string[]>([]); 
  
  const [isAutoPresenceEnabled, setIsAutoPresenceEnabled] = useState(false);
  const [activeGeofenceClubId, setActiveGeofenceClubId] = useState<string | null>(null);
  
  const [liveClubCounts, setLiveClubCounts] = useState<Record<string, number>>({});
  const [pollingLocationForGeofence, setPollingLocationForGeofence] = useState(false);
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

  const handleGeofenceChange = useCallback((clubId: string | null) => {
    setActiveGeofenceClubId(clubId);
  }, []);
  
  const { locationError: geofenceLocationError } = useGeofenceAutoCheckin({
    clubs: allClubs,
    isEnabled: isAutoPresenceEnabled && pollingLocationForGeofence, 
    userLocation: userLocation,
    onGeofenceChange: handleGeofenceChange,
  });
  
  useHeartbeatTracker({
    clubId: activeGeofenceClubId, 
    userLocation: userLocation,
    isEnabled: isAutoPresenceEnabled && !!activeGeofenceClubId, 
  });
  
  useEffect(() => {
    if (geofenceLocationError) {
      toast({ variant: 'destructive', title: 'Auto Presence Location Issue', description: geofenceLocationError });
    }
  }, [geofenceLocationError, toast]);

  const watchIdRef = useRef<number | null>(null);

  const startLocationPolling = useCallback(() => {
    if (navigator.geolocation && !watchIdRef.current) {
      setPollingLocationForGeofence(true);
      setLocationLoading(true); 
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setLocationLoading(false); 
        },
        (error) => {
          console.error("Error watching user location:", error);
          toast({ title: "Location Watch Error", description: `Could not watch your location: ${error.message}. Auto features may be limited.`, variant: "destructive" });
          setLocationLoading(false);
          setPollingLocationForGeofence(false);
          if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
          setIsAutoPresenceEnabled(false);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000, distanceFilter: 10 }
      );
      toast({ title: "Location Tracking Started", description: "App will now monitor your location for auto-presence." });
    }
  }, [toast]);

  const stopLocationPolling = useCallback(() => {
    if (watchIdRef.current && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setPollingLocationForGeofence(false);
    toast({ title: "Location Tracking Stopped", description: "Auto-presence features are now paused." });
  }, [toast]);

  const handleGetUserLocationOnce = () => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setLocationLoading(false);
          setSortBy("nearby");
          toast({ title: "Location Found", description: "Sorting clubs by your location. You can now enable Auto Presence." });
          if (isAutoPresenceEnabled && !pollingLocationForGeofence) {
             startLocationPolling();
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
          toast({ title: "Location Error", description: `Could not get your location: ${error.message}`, variant: "destructive" });
          setLocationLoading(false);
        }
      );
    } else {
      toast({ title: "Location Not Supported", description: "Geolocation is not supported by your browser.", variant: "destructive" });
    }
  };
  
  const clubsWithLiveCountsAndDistance = useMemo(() => {
    let clubsToProcess = allClubs.map(club => ({
      ...club,
      // Prioritize live count. If not available, use the admin-set base count.
      currentCount: liveClubCounts[club.id] ?? club.currentCount ?? 0, 
      isTrending: getClubStatus(liveClubCounts[club.id] ?? club.currentCount ?? 0, club.capacityThresholds || {}) === 'packed' || getClubStatus(liveClubCounts[club.id] ?? club.currentCount ?? 0, club.capacityThresholds || {}) === 'over-packed',
      distance: userLocation && club.location ? haversineDistance(userLocation.lat, userLocation.lng, club.location.lat, club.location.lng) : Infinity,
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
  }, [allClubs, userLocation, sortBy, filterTags, liveClubCounts]);


  const handleSortChange = (value: string) => {
    if (value === "nearby" && !userLocation && !locationLoading) {
      handleGetUserLocationOnce(); 
    } else {
      setSortBy(value);
    }
  };

  const handleFilterChange = (value: string) => {
    setFilterTags(value === "all" ? [] : [value]);
  };

  const handleAutoPresenceToggle = (checked: boolean) => {
    if (checked && !userLocation) {
      toast({ title: "Location Needed", description: "Please 'Use My Location' first to enable Auto Presence.", variant: "default" });
      setIsAutoPresenceEnabled(false); 
      return;
    }
    setIsAutoPresenceEnabled(checked);
    if (checked) {
      startLocationPolling();
    } else {
      stopLocationPolling();
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (loadingClubs) { 
    return <DashboardLoadingSkeleton />;
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
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
        <Button 
          onClick={handleGetUserLocationOnce} 
          disabled={locationLoading} 
          variant="outline"
          className="w-full md:w-auto"
        >
          {locationLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.navigation className="mr-2 h-4 w-4" />}
          {userLocation ? "Update My Location" : "Use My Location"}
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto"> 
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Sort: Default</SelectItem>
              <SelectItem value="nearby" disabled={!userLocation && !locationLoading}>Sort: Nearby</SelectItem>
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
        <div className="flex items-center space-x-2 w-full md:w-auto justify-start md:justify-end">
          <Switch
            id="auto-presence-toggle"
            checked={isAutoPresenceEnabled}
            onCheckedChange={handleAutoPresenceToggle}
            disabled={!userLocation && !isAutoPresenceEnabled} 
          />
          <Label htmlFor="auto-presence-toggle" className={(!userLocation && !isAutoPresenceEnabled) ? 'text-muted-foreground' : ''}>
            Auto Presence
          </Label>
        </div>
      </div>

      <Tabs defaultValue="list" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 md:w-96">
          <TabsTrigger value="list">
            <Icons.users className="mr-2 h-4 w-4" /> List View
          </TabsTrigger>
          <TabsTrigger value="map">
            <Icons.mapPin className="mr-2 h-4 w-4" /> Map View
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-6">
           <ClubList clubs={clubsWithLiveCountsAndDistance} />
        </TabsContent>
        <TabsContent value="map" className="mt-6">
          <ClubMapWrapper clubs={clubsWithLiveCountsAndDistance} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
