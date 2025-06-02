
"use client"; // Needs to be client component for auth check and redirect

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { ClubWithId } from "@/types";
import { ClubList } from "@/components/clubs/ClubList";
import { PageHeader } from "@/components/common/PageHeader";
import ClubMapWrapper from "@/components/clubs/ClubMapWrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth"; // Import useAuth hook
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

// This function can remain outside the component as it's a utility for data fetching
async function getClubsServerSide(): Promise<ClubWithId[]> {
  if (!firestore) {
    console.error("Firestore is not initialized. Cannot fetch clubs. This usually means your Firebase environment variables (e.g., NEXT_PUBLIC_FIREBASE_PROJECT_ID) are missing or incorrect in your .env file. Please check your server console for more specific error messages from the Firebase initialization process and your .env file.");
    return [];
  }
  try {
    const clubsCol = collection(firestore, "clubs");
    const q = query(clubsCol, orderBy("name"));
    const clubSnapshot = await getDocs(q);
    const clubList = clubSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "Unnamed Club",
        address: data.address || "No address",
        location: data.location || null,
        currentCount: data.currentCount || 0,
        capacityThresholds: data.capacityThresholds || { low: 50, moderate: 100, packed: 150 },
        lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate().toISOString() : new Date().toISOString(),
        imageUrl: data.imageUrl,
      } as ClubWithId;
    });
    return clubList;
  } catch (error) {
    console.error("Error fetching clubs:", error);
    return [];
  }
}


function DashboardPageContent({ clubs }: { clubs: ClubWithId[] }) {
  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader
        title="Nightclub Dashboard"
        description="Find real-time crowd levels and estimated wait times for nightclubs."
      />

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
           <ClubList clubs={clubs} />
        </TabsContent>
        <TabsContent value="map" className="mt-6">
          <ClubMapWrapper clubs={clubs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [clubs, setClubs] = useState<ClubWithId[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth?redirect=/dashboard"); // Redirect to auth if not logged in
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchClubs() {
      if (user) { // Only fetch clubs if user is authenticated
        setLoadingClubs(true);
        const fetchedClubs = await getClubsServerSide();
        setClubs(fetchedClubs);
        setLoadingClubs(false);
      }
    }
    if (!authLoading && user) {
      fetchClubs();
    }
  }, [user, authLoading]);


  if (authLoading || (!user && !authLoading) ) { // Show loading state while checking auth or redirecting
    return (
        <div className="container mx-auto py-8 px-4">
            <PageHeader
                title="Nightclub Dashboard"
                description="Find real-time crowd levels and estimated wait times for nightclubs."
            />
            <div className="mt-6 space-y-4">
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
  
  if (!user) {
    // This case should ideally not be reached due to the redirect,
    // but it's a fallback. Or show a "Please sign in" message.
    return (
       <div className="container mx-auto flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-12">
            <p>Redirecting to sign-in...</p>
       </div>
    );
  }
  
  // User is authenticated, show the dashboard content
  if (loadingClubs) {
     return (
        <div className="container mx-auto py-8 px-4">
            <PageHeader
                title="Nightclub Dashboard"
                description="Loading club data..."
            />
             <div className="mt-6 space-y-4">
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


  return <DashboardPageContent clubs={clubs} />;
}

// Note: Removed 'export const revalidate' as data fetching is now client-side based on auth.
// If SSR with auth is needed, middleware or a different pattern would be required.
