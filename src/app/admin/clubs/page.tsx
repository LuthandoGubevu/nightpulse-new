
"use client"; 

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { auth } from "@/lib/firebase";
import type { ClubWithId } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAdminClubList, migrateLegacyClubCapacityAction } from "@/actions/clubActions";

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
  const [migrating, setMigrating] = useState(false);
  const { toast } = useToast();
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // The raw crowd count is admin-only now (Addendum 24) — it lives in a private
  // Admin-SDK-only subcollection, so this page fetches it via a server action instead
  // of a direct client Firestore listener. That trades away the old real-time push for
  // a fetch-on-mount + manual refresh, which is fine since currentCount is admin-set,
  // not something that changes moment-to-moment on its own.
  const fetchClubs = useCallback(async () => {
    setFirestoreError(null);
    setLoading(true);
    try {
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken) {
        setClubs([]);
        setFirestoreError("You must be signed in as an admin to view clubs.");
        return;
      }
      const clubList = await getAdminClubList(idToken);
      setClubs(clubList);
    } catch (error) {
      console.error("Error fetching clubs for admin:", error);
      toast({ title: "Error", description: "Could not fetch club data for admin.", variant: "destructive" });
      setClubs([]);
      setFirestoreError("Failed to load club data for admin.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const handleMigrateLegacyCapacity = async () => {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) {
      toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
      return;
    }
    setMigrating(true);
    const result = await migrateLegacyClubCapacityAction(idToken);
    setMigrating(false);
    if (result.success) {
      toast({ title: "Migration complete", description: `Migrated ${result.migrated ?? 0} club(s) to the new private capacity storage.` });
      fetchClubs();
    } else {
      toast({ title: "Migration failed", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Nightclubs"
        description="View, add, edit, or delete nightclub entries."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleMigrateLegacyCapacity} disabled={migrating}>
            {migrating ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
            Migrate legacy capacity data
          </Button>
          <Button asChild>
            <Link href="/admin/clubs/new">
              <Icons.add className="mr-2 h-4 w-4" />
              Add New Club
            </Link>
          </Button>
        </div>
      </PageHeader>

      {firestoreError && (
        <Alert variant="destructive" className="my-4">
          <Icons.warning className="h-4 w-4" />
          <AlertTitle>Application Error</AlertTitle>
          <AlertDescription>
            {firestoreError} Some features may be unavailable.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <ClubsDataTableSkeleton />
      ) : (
        <DataTable columns={columns} data={clubs} refreshData={fetchClubs} />
      )}
    </div>
  );
}
