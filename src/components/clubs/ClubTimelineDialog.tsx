
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import type { ClubWithId, Visit } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { firestore } from "@/lib/firebase"; // Assuming you have this
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

interface ClubTimelineDialogProps {
  club: ClubWithId;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Placeholder: Function to process visit data into hourly aggregates
async function getHourlyVisitData(clubId: string): Promise<{ name: string; visitors: number }[]> {
  if (!firestore) return [];
  
  try {
    const visitsRef = collection(firestore, "visits");
    // Fetch visits for the specific club, possibly for a time range (e.g., last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const q = query(visitsRef, where("clubId", "==", clubId), where("entryTimestamp", ">=", Timestamp.fromDate(sevenDaysAgo)));
    
    const querySnapshot = await getDocs(q);
    const visits = querySnapshot.docs.map(doc => doc.data() as Visit);

    const hourlyCounts: { [key: string]: number } = {};
    for (let i = 0; i < 24; i++) {
        hourlyCounts[i.toString().padStart(2, '0') + ":00"] = 0;
    }

    visits.forEach(visit => {
        if (visit.entryTimestamp) {
            const entryDate = visit.entryTimestamp instanceof Timestamp ? visit.entryTimestamp.toDate() : new Date(visit.entryTimestamp);
            const hourKey = entryDate.getHours().toString().padStart(2, '0') + ":00";
            hourlyCounts[hourKey] = (hourlyCounts[hourKey] || 0) + 1;
        }
    });
    
    return Object.entries(hourlyCounts)
        .map(([name, visitors]) => ({ name, visitors }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort by hour

  } catch (error) {
    console.error("Error fetching visit data for timeline:", error);
    return []; // Return empty on error
  }
}


export function ClubTimelineDialog({ club, isOpen, onOpenChange }: ClubTimelineDialogProps) {
  const [timelineData, setTimelineData] = useState<{ name: string; visitors: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && club.id) {
      setIsLoading(true);
      setError(null);
      getHourlyVisitData(club.id)
        .then(data => {
          setTimelineData(data);
          if (data.length === 0) {
            // setError("No visit data found for the last 7 days to generate a timeline.");
          }
        })
        .catch(err => {
          console.error(err);
          setError("Could not fetch timeline data.");
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, club.id]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Average Crowd Timeline for {club.name}</DialogTitle>
          <DialogDescription>
            Typical crowd flow based on entries in the last 7 days. (Updates may take a moment)
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 h-[300px] w-full">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full">
              <Icons.spinner className="h-8 w-8 animate-spin mb-2" />
              <p>Loading timeline data...</p>
              <Skeleton className="h-full w-full mt-2" />
            </div>
          )}
          {!isLoading && error && (
             <Alert variant="destructive" className="h-full flex flex-col justify-center items-center">
                <Icons.warning className="h-6 w-6 mb-2" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && timelineData.length === 0 && (
             <Alert className="h-full flex flex-col justify-center items-center">
                <Icons.barChartBig className="h-6 w-6 mb-2 text-muted-foreground" />
                <AlertTitle>No Data Available</AlertTitle>
                <AlertDescription>Not enough recent visit data to generate a crowd timeline for this club.</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && timelineData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} width={30} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: '12px', padding: '5px 10px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="visitors" fill="hsl(var(--primary))" name="Average Entries" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
