
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "./data-table"; // Adjust path if needed
import { columns } from "./columns"; // Adjust path if needed
import { firestore } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import type { ClubWithId } from "@/types";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

async function getClubs(): Promise<ClubWithId[]> {
  if (!firestore) {
    console.error("Firestore is not initialized. Cannot fetch clubs for admin.");
    return [];
  }
  try {
    const clubsCol = collection(firestore, "clubs");
    const q = query(clubsCol, orderBy("name")); // Order by name
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
    console.error("Error fetching clubs for admin:", error);
    return [];
  }
}

function ClubsDataTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" /> {/* Input placeholder */}
        <Skeleton className="h-10 w-32" /> {/* Columns button placeholder */}
      </div>
      <div className="rounded-md border">
        <Skeleton className="h-12 w-full" /> {/* Table header */}
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full border-t" /> /* Table row placeholder */
        ))}
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Skeleton className="h-8 w-24" /> {/* Pagination placeholder */}
        <Skeleton className="h-8 w-24" /> {/* Pagination placeholder */}
      </div>
    </div>
  );
}


export default async function AdminClubsPage() {
  // Fetch data directly in the Server Component
  // The DataTable itself will be a client component for interactivity
  const clubs = await getClubs();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Nightclubs"
        description="View, add, edit, or delete nightclub entries."
      >
        <Button asChild>
          <Link href="/admin/clubs/new">
            <Icons.add className="mr-2 h-4 w-4" />
            Add New Club
          </Link>
        </Button>
      </PageHeader>
      
      {/* 
        The DataTable component itself needs to be a client component if it uses hooks 
        for sorting, filtering, etc. We pass the server-fetched 'clubs' data as a prop.
        The 'columns' definition can also be part of client components if they include interactive elements like dropdowns.
      */}
      <Suspense fallback={<ClubsDataTableSkeleton />}>
        <DataTableClientWrapper initialData={clubs} />
      </Suspense>
    </div>
  );
}


// Client component wrapper to handle re-fetching data on client if needed or for actions
// For this scaffold, it just passes initial data. A more complex setup might use SWR/React Query.
// For now, we rely on Next.js Server Actions and revalidatePath.
async function DataTableClientWrapper({ initialData }: { initialData: ClubWithId[] }) {
  // This function is marked async for consistency but doesn't perform async operations itself here.
  // It acts as a boundary if we needed to introduce client-side fetching or state management later.
  // To make `refreshData` work, we can re-fetch here, or make DataTable handle it.
  // For simplicity, `revalidatePath` in server actions will trigger re-fetch for the page.
  // If client-side refresh without full page reload is needed, this component would manage that.
  return <DataTable columns={columns} data={initialData} />;
}

// To ensure data freshness upon actions, use revalidatePath in your server actions.
// For on-the-fly refresh without full page reload, more complex client-side state management would be needed.
export const revalidate = 0; // Force dynamic rendering and no caching for admin page
