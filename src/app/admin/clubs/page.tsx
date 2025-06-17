
"use client"; 

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { firestore } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import type { ClubWithId } from "@/types";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast"; // Added for potential error messaging

const mockAdminClubData: ClubWithId[] = [
  {
    id: 'mock-club-1',
    name: 'The Velvet Underground',
    address: '123 Cool St, Music City, TX',
    location: { lat: 30.2672, lng: -97.7431 },
    currentCount: 75,
    capacityThresholds: { low: 50, moderate: 100, packed: 150 },
    lastUpdated: new Date().toISOString(),
    imageUrl: 'https://placehold.co/600x400.png?text=Velvet+Underground',
    estimatedWaitTime: '5-10 min',
    tags: ['live music', 'chill', 'cocktails'],
    musicGenres: ['Indie Rock', 'Soul', 'Funk'],
    tonightDJ: 'DJ Retro',
    announcementMessage: 'Happy Hour 7-9 PM tonight!',
    announcementExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-club-2',
    name: 'Neon Pulse',
    address: '456 Party Ave, Electro Town, CA',
    location: { lat: 34.0522, lng: -118.2437 },
    currentCount: 160,
    capacityThresholds: { low: 60, moderate: 120, packed: 180 },
    lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    imageUrl: 'https://placehold.co/600x400.png?text=Neon+Pulse',
    estimatedWaitTime: '20-30 min',
    tags: ['edm', 'dance floor', 'laser show'],
    musicGenres: ['Techno', 'House', 'Trance'],
    tonightDJ: 'Sparkle Pony',
    announcementMessage: 'Special guest DJ Sparkle Pony tonight!',
    announcementExpiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  },
];


function ClubsDataTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" /> 
        <Skeleton className="h-10 w-32" /> 
      </div>
      <div className="rounded-md border">
        <Skeleton className="h-12 w-full" /> 
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full border-t" /> 
        ))}
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Skeleton className="h-8 w-24" /> 
        <Skeleton className="h-8 w-24" /> 
      </div>
    </div>
  );
}


export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<ClubWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore) {
      console.warn("Firestore is not initialized. Displaying mock data for admin clubs page.");
      setClubs(mockAdminClubData);
      setLoading(false);
      return;
    }

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
        } as ClubWithId;
      });

      if (clubList.length === 0) {
        setClubs(mockAdminClubData); // Use mock data if Firestore returns empty
        toast({ title: "Sample Data", description: "No live club data found. Displaying sample entries for demonstration.", duration: 5000 });
      } else {
        setClubs(clubList);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching clubs for admin:", error);
      toast({ title: "Error", description: "Could not fetch club data for admin. Displaying sample data.", variant: "destructive" });
      setClubs(mockAdminClubData); // Use mock data on error
      setLoading(false);
    });

    return () => unsubscribe(); 
  }, [toast]);

  const refreshData = () => {
    // With onSnapshot, manual refresh is less critical but could force re-check if needed.
    // For mock data, this won't do much unless we re-trigger Firestore check or mock data generation.
    console.log("Data is real-time or using mocks. Manual refresh trigger invoked.");
    // Potentially, re-run the effect logic or parts of it if a hard refresh is desired.
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Nightclubs"
        description="View, add, edit, or delete nightclub entries. Data updates in real-time or shows samples if empty."
      >
        <Button asChild>
          <Link href="/admin/clubs/new">
            <Icons.add className="mr-2 h-4 w-4" />
            Add New Club
          </Link>
        </Button>
      </PageHeader>
      
      {loading ? (
        <ClubsDataTableSkeleton />
      ) : (
        <DataTable columns={columns} data={clubs} refreshData={refreshData} />
      )}
    </div>
  );
}

