
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

  useEffect(() => {
    if (!firestore) {
      console.error("Firestore is not initialized. Cannot fetch clubs for admin. This usually means your Firebase environment variables are missing or incorrect.");
      setLoading(false);
      return;
    }

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
        } as ClubWithId;
      });
      setClubs(clubList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching clubs with real-time listener:", error);
      setLoading(false);
    });

    return () => unsubscribe(); 
  }, []);

  const refreshData = () => {
    console.log("Data is real-time, manual refresh typically not needed.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Nightclubs"
        description="View, add, edit, or delete nightclub entries. Data updates in real-time."
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
