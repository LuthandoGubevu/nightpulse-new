
"use client"; 

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query, Timestamp, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { ClubWithId, UserLocation } from "@/types";
import { ClubList } from "@/components/clubs/ClubList";
import { PageHeader } from "@/components/common/PageHeader";
import ClubMapWrapper from "@/components/clubs/ClubMapWrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth"; 
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { haversineDistance, getClubStatus } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";


function DashboardLoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader
        title="Nightclub Dashboard"
        description="Finding real-time crowd levels and estimated wait times..."
      />
      <div className="mt-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
            <Skeleton className="h-10 w-full md:w-auto" /> {/* Location button */}
            <div className="grid grid-cols-2 md:flex md:flex-row gap-2"> {/* Filter selects */}
                <Skeleton className="h-10 w-full md:w-32" />
                <Skeleton className="h-10 w-full md:w-32" />
            </div>
        </div>
        <div className="grid w-full grid-cols-2 md:w-96">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex flex-col overflow-hidden">
              <Skeleton className="h-48 w-full" />
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allClubs, setAllClubs] = useState<ClubWithId[]>([]);
  const [displayedClubs, setDisplayedClubs] = useState<ClubWithId[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  const [sortBy, setSortBy] = useState<string>("default"); // 'default', 'nearby', 'crowded'
  const [filterTags, setFilterTags] = useState<string[]>([]); // e.g., ['chill', 'free entry']

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth?redirect=/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !firestore) {
      if (!authLoading && !user) setLoadingClubs(false); // Not logged in, stop loading
      return;
    }

    setLoadingClubs(true);
    const clubsCol = collection(firestore, "clubs");
    const q = query(clubsCol, orderBy("name"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const clubList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Ensure announcementExpiresAt is correctly handled (Date or null)
        let announcementExpiresAt = null;
        if (data.announcementExpiresAt) {
            announcementExpiresAt = data.announcementExpiresAt instanceof Timestamp ? data.announcementExpiresAt.toDate() : new Date(data.announcementExpiresAt);
        }

        return {
          id: doc.id,
          name: data.name || "Unnamed Club",
          address: data.address || "No address",
          location: data.location || null,
          currentCount: data.currentCount || 0,
          capacityThresholds: data.capacityThresholds || { low: 50, moderate: 100, packed: 150 },
          lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate().toISOString() : new Date().toISOString(),
          imageUrl: data.imageUrl,
          estimatedWaitTime: data.estimatedWaitTime,
          tags: data.tags || [],
          musicGenres: data.musicGenres || [],
          tonightDJ: data.tonightDJ,
          announcementMessage: data.announcementMessage,
          announcementExpiresAt: announcementExpiresAt,
          isTrending: getClubStatus(data.currentCount || 0, data.capacityThresholds || {}) === 'packed' || getClubStatus(data.currentCount || 0, data.capacityThresholds || {}) === 'over-packed',
        } as ClubWithId;
      });
      setAllClubs(clubList);
      setLoadingClubs(false);
    }, (error) => {
      console.error("Error fetching clubs with real-time listener:", error);
      toast({ title: "Error", description: "Could not fetch club data.", variant: "destructive" });
      setLoadingClubs(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, toast]);

  const handleGetUserLocation = () => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setLocationLoading(false);
          setSortBy("nearby"); // Automatically sort by nearby when location is fetched
          toast({ title: "Location Found", description: "Sorting clubs by your location." });
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
  
  const processedClubs = useMemo(() => {
    let clubsToProcess = [...allClubs];

    // Calculate distances if userLocation is available
    if (userLocation) {
      clubsToProcess = clubsToProcess.map(club => ({
        ...club,
        distance: club.location ? haversineDistance(userLocation.lat, userLocation.lng, club.location.lat, club.location.lng) : Infinity,
      }));
    }

    // Filtering
    if (filterTags.length > 0) {
      clubsToProcess = clubsToProcess.filter(club => 
        filterTags.every(filterTag => {
          if (filterTag === "trending") return club.isTrending;
          // Assuming other filterTags directly match club.tags
          return club.tags?.includes(filterTag);
        })
      );
    }
    
    // Sorting
    // 1. Always bring trending clubs to the top, unless sorting by distance specifically
    if (sortBy !== "nearby") { // If not sorting by nearby, trending clubs get precedence
        clubsToProcess.sort((a, b) => {
            if (a.isTrending && !b.isTrending) return -1;
            if (!a.isTrending && b.isTrending) return 1;
            // Then apply other sort criteria
            if (sortBy === "crowded") return (b.currentCount || 0) - (a.currentCount || 0);
            return a.name.localeCompare(b.name); // Default sort by name
        });
    } else if (userLocation) { // Sorting by nearby
         clubsToProcess.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else if (sortBy === "crowded") { // Sorting by crowded without location
        clubsToProcess.sort((a,b) => (b.currentCount || 0) - (a.currentCount || 0));
    } else { // Default sort by name if no other criteria met
        clubsToProcess.sort((a,b) => a.name.localeCompare(b.name));
    }


    return clubsToProcess;
  }, [allClubs, userLocation, sortBy, filterTags]);


  useEffect(() => {
    setDisplayedClubs(processedClubs);
  }, [processedClubs]);


  const handleSortChange = (value: string) => {
    if (value === "nearby" && !userLocation) {
      handleGetUserLocation(); // Prompt for location if not available and user selects "nearby"
    } else {
      setSortBy(value);
    }
  };

  const handleFilterChange = (value: string) => {
    // For simplicity, this example handles one filter at a time. 
    // For multi-select, filterTags would be an array managed by adding/removing tags.
    if (value === "all") {
        setFilterTags([]);
    } else {
        setFilterTags([value]); // Replace current filter
    }
  };


  if (authLoading || (!user && !authLoading) || loadingClubs ) {
    return <DashboardLoadingSkeleton />;
  }
  
  if (!user) {
    return (
       <div className="container mx-auto flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-12">
            <p>Redirecting to sign-in...</p>
       </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader
        title="Nightclub Dashboard"
        description="Find real-time crowd levels, wait times, and vibes for nightclubs."
      />

      <div className="my-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        <Button onClick={handleGetUserLocation} disabled={locationLoading} variant="outline">
          {locationLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.navigation className="mr-2 h-4 w-4" />}
          {userLocation ? "Update My Location" : "Use My Location"}
        </Button>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Sort: Default</SelectItem>
              <SelectItem value="nearby" disabled={!userLocation && !locationLoading}>Sort: Nearby</SelectItem>
              <SelectItem value="crowded">Sort: Most Crowded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTags[0] || "all"} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filter: All</SelectItem>
              <SelectItem value="trending">Filter: Trending Now 🔥</SelectItem>
              <SelectItem value="chill">Filter: Chill Vibe</SelectItem>
              <SelectItem value="free entry">Filter: Free Entry</SelectItem>
              {/* Add more based on common tags */}
            </SelectContent>
          </Select>
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
           <ClubList clubs={displayedClubs} />
        </TabsContent>
        <TabsContent value="map" className="mt-6">
          <ClubMapWrapper clubs={displayedClubs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
