
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { ClubWithId } from "@/types";
import { ClubList } from "@/components/clubs/ClubList";
import { PageHeader } from "@/components/common/PageHeader";
import ClubMapWrapper from "@/components/clubs/ClubMapWrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";

async function getClubs(): Promise<ClubWithId[]> {
  if (!firestore) {
    console.error("Firestore is not initialized. Cannot fetch clubs. This usually means your Firebase environment variables (e.g., NEXT_PUBLIC_FIREBASE_PROJECT_ID) are missing or incorrect in your .env file. Please check your server console for more specific error messages from the Firebase initialization process and your .env file.");
    return [];
  }
  try {
    const clubsCol = collection(firestore, "clubs");
    // Order by name for consistent listing
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
    return []; // Return empty array on error
  }
}

export default async function DashboardPage() {
  const clubs = await getClubs();

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

// Enable dynamic rendering for this page as club data changes frequently
export const revalidate = 60; // Revalidate every 60 seconds
