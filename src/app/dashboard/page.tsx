
"use client"; 

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
import { getLiveClubCounts } from "@/actions/clubActions"; // Server action to get live counts

const mockClubData: ClubWithId[] = [
  {
    id: 'mock-club-1',
    name: 'Sanctuary Mandela',
    address: '4 9th St, Houghton Estate, Johannesburg, 2198',
    location: { lat: -26.1738, lng: 28.0549 },
    currentCount: 0, // Base count, will be overridden by live count
    capacityThresholds: { low: 50, moderate: 100, packed: 150 },
    lastUpdated: new Date().toISOString(),
    imageUrl: 'https://placehold.co/600x400.png',
    estimatedWaitTime: '5-10 min',
    tags: ['upscale', 'chill', 'cocktails'],
    musicGenres: ['Jazz', 'Soul', 'Lounge'],
    tonightDJ: 'DJ Smooth',
    announcementMessage: 'Jazz Night from 8 PM!',
    announcementExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    isTrending: false,
    distance: 2.5, 
  },
  {
    id: 'mock-club-2',
    name: 'Truth Nightclub',
    address: 'Old Pretoria Rd, Halfway House, Midrand, 1685',
    location: { lat: -26.0000, lng: 28.1260 },
    currentCount: 0,
    capacityThresholds: { low: 60, moderate: 120, packed: 180 },
    lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(), 
    imageUrl: 'https://placehold.co/600x400.png',
    estimatedWaitTime: '20-30 min',
    tags: ['electronic', 'dance floor', 'underground'],
    musicGenres: ['Techno', 'House', 'Trance'],
    tonightDJ: 'Voltage Control',
    announcementMessage: 'International DJ set tonight!',
    announcementExpiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    isTrending: true,
    distance: 15.1,
  },
   {
    id: 'mock-club-3',
    name: 'The Marabi Club', 
    address: '47 Sivewright Ave, New Doornfontein, Johannesburg, 2094',
    location: { lat: -26.1995, lng: 28.0565 }, 
    currentCount: 0,
    capacityThresholds: { low: 30, moderate: 70, packed: 100 },
    lastUpdated: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    imageUrl: 'https://placehold.co/600x400.png',
    tags: ['live jazz', 'dinner', 'vintage'],
    musicGenres: ['Jazz', 'Blues', 'Swing'],
    tonightDJ: '',
    announcementMessage: 'Live band starts at 9 PM.',
    announcementExpiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    isTrending: false,
    distance: 5.7,
  },
    {
    id: 'mock-club-4',
    name: 'And Club', 
    address: '39a Gwi Gwi Mrwebi St, Newtown, Johannesburg, 2113',
    location: { lat: -26.2044, lng: 28.0353 }, 
    currentCount: 0, 
    capacityThresholds: { low: 50, moderate: 100, packed: 150 },
    lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(), 
    imageUrl: 'https://placehold.co/600x400.png',
    estimatedWaitTime: '45+ min (At Capacity)',
    tags: ['techno', 'underground', 'late night'],
    musicGenres: ['Techno', 'Minimal', 'Deep House'],
    tonightDJ: 'Resident DJs',
    announcementMessage: 'Last entry 2 AM due to capacity!',
    announcementExpiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), 
    isTrending: true,
    distance: 1.2,
  }
].map(club => ({
  ...club,
  imageUrl: club.imageUrl || `https://placehold.co/600x400.png`,
}));


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
  const [isAutoCheckInEnabled, setIsAutoCheckInEnabled] = useState(false);
  const [liveClubCounts, setLiveClubCounts] = useState<Record<string, number>>({});
  const [pollingLocationForGeofence, setPollingLocationForGeofence] = useState(false);


  // Fetch base club data
  useEffect(() => {
    if (!firestore) { 
      console.warn("Firestore is not initialized. Displaying mock data for dashboard.");
      setAllClubs(mockClubData);
      setLoadingClubs(false);
      return;
    }

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
          currentCount: data.currentCount || 0, // This is the admin-set base count
          capacityThresholds: data.capacityThresholds || { low: 50, moderate: 100, packed: 150 },
          lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate().toISOString() : new Date().toISOString(),
          imageUrl: data.imageUrl || `https://placehold.co/600x400.png`,
          estimatedWaitTime: data.estimatedWaitTime,
          tags: data.tags || [],
          musicGenres: data.musicGenres || [],
          tonightDJ: data.tonightDJ,
          announcementMessage: data.announcementMessage,
          announcementExpiresAt: announcementExpiresAt,
          isTrending: getClubStatus(liveClubCounts[doc.id] ?? data.currentCount ?? 0, data.capacityThresholds || {}) === 'packed' || getClubStatus(liveClubCounts[doc.id] ?? data.currentCount ?? 0, data.capacityThresholds || {}) === 'over-packed',
        } as ClubWithId;
      });
      
      if (clubList.length === 0) {
        setAllClubs(mockClubData); 
      } else {
        setAllClubs(clubList);
      }
      setLoadingClubs(false);
    }, (error) => {
      console.error("Error fetching clubs with real-time listener:", error);
      toast({ title: "Error", description: "Could not fetch club data. Displaying sample data.", variant: "destructive" });
      setAllClubs(mockClubData); 
      setLoadingClubs(false);
    });
    return () => unsubscribe();
  }, [toast, liveClubCounts]); // Added liveClubCounts to re-evaluate trending status

  // Fetch live club counts
  const fetchLiveCounts = useCallback(async () => {
    try {
      const counts = await getLiveClubCounts();
      setLiveClubCounts(counts);
    } catch (error) {
      console.error("Failed to fetch live club counts:", error);
      // Optionally, show a toast for this error, but it might be noisy if it happens often
    }
  }, []);

  useEffect(() => {
    fetchLiveCounts(); // Fetch on initial load
    const interval = setInterval(fetchLiveCounts, 1 * 60 * 1000); // Fetch every 1 minute
    return () => clearInterval(interval);
  }, [fetchLiveCounts]);

  const { closestClubInGeofence, locationError: geofenceLocationError } = useGeofenceAutoCheckin({
    clubs: allClubs,
    isEnabled: isAutoCheckInEnabled && pollingLocationForGeofence, // Geofence only active if user location is being polled
    userLocation: userLocation, // Pass userLocation to the geofence hook
  });
  
  useHeartbeatTracker({
    clubId: closestClubInGeofence?.id || null,
    userLocation: userLocation,
    isEnabled: isAutoCheckInEnabled && !!closestClubInGeofence, // Heartbeat only active if in a club geofence and enabled
  });
  
  useEffect(() => {
    if (geofenceLocationError) {
      toast({ variant: 'destructive', title: 'Auto Check-In Location Issue', description: geofenceLocationError });
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
          // If watch fails, stop it
          if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000, distanceFilter: 10 } // Distance filter for watch
      );
      toast({ title: "Location Tracking Started", description: "App will now monitor your location for auto check-in." });
    }
  }, [toast]);

  const stopLocationPolling = useCallback(() => {
    if (watchIdRef.current && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setPollingLocationForGeofence(false);
    // setUserLocation(null); // Optionally clear location when polling stops
    toast({ title: "Location Tracking Stopped", description: "Auto check-in features are now paused." });
  }, [toast]);

  const handleGetUserLocationOnce = () => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setLocationLoading(false);
          setSortBy("nearby");
          toast({ title: "Location Found", description: "Sorting clubs by your location. You can now enable Auto Check-In." });
          // If not already polling, start polling after the first manual location get for auto check-in
          if (isAutoCheckInEnabled && !pollingLocationForGeofence) {
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
      currentCount: liveClubCounts[club.id] ?? club.currentCount ?? 0, // Prioritize live count, fallback to club's own currentCount (admin set), then 0
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
    } else { // default
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

  const handleAutoCheckInToggle = (checked: boolean) => {
    if (checked && !userLocation) {
      toast({ title: "Location Needed", description: "Please 'Use My Location' first to enable auto check-in.", variant: "default" });
      setIsAutoCheckInEnabled(false); // Ensure switch reflects false state
      return;
    }
    setIsAutoCheckInEnabled(checked);
    if (checked) {
      startLocationPolling();
    } else {
      stopLocationPolling();
    }
  };

  // Effect to stop polling if component unmounts
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
            id="auto-checkin-toggle"
            checked={isAutoCheckInEnabled}
            onCheckedChange={handleAutoCheckInToggle}
            disabled={!userLocation && !isAutoCheckInEnabled} // Disable if no location or not explicitly enabled after location
          />
          <Label htmlFor="auto-checkin-toggle" className={(!userLocation && !isAutoCheckInEnabled) ? 'text-muted-foreground' : ''}>
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
