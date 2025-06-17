
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
import { firestore } from "@/lib/firebase"; 
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

interface ClubTimelineDialogProps {
  club: ClubWithId;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const mockClubHourlyAggregates: Record<string, { name: string; visitors: number }[]> = {
  'mock-club-1': Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0') + ":00";
    let visitors = 0;
    if (i >= 19 && i <= 23) visitors = Math.floor(Math.random() * 15) + 5; // Evening peak
    if (i >= 0 && i <= 2) visitors = Math.floor(Math.random() * 10) + 2; // Late night
    return { name: hour, visitors };
  }),
  'mock-club-2': Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0') + ":00";
    let visitors = 0;
    if (i >= 21 && i <= 23) visitors = Math.floor(Math.random() * 25) + 10; // Peak hours
    if (i >= 0 && i <= 3) visitors = Math.floor(Math.random() * 20) + 8;   // Late peak
    return { name: hour, visitors };
  }),
   'mock-club-4': Array.from({ length: 24 }, (_, i) => { // The Bassment (packed)
    const hour = i.toString().padStart(2, '0') + ":00";
    let visitors = 0;
    if (i >= 22 || i <= 2) visitors = Math.floor(Math.random() * 30) + 20; // Consistently busy late
    return { name: hour, visitors };
  }),
};


async function getHourlyVisitData(clubId: string): Promise<{ name: string; visitors: number }[]> {
  if (!firestore) {
    if (mockClubHourlyAggregates[clubId]) {
      console.log(`Firestore unavailable, using mock hourly aggregates for ${clubId}`);
      return mockClubHourlyAggregates[clubId];
    }
    return [];
  }
  
  try {
    const visitsRef = collection(firestore, "visits");
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const q = query(visitsRef, where("clubId", "==", clubId), where("entryTimestamp", ">=", Timestamp.fromDate(sevenDaysAgo)));
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty && mockClubHourlyAggregates[clubId]) {
      console.log(`No real visits for ${clubId}, using mock hourly aggregates.`);
      return mockClubHourlyAggregates[clubId];
    }
    if (querySnapshot.empty) {
        return []; // No real data and no mock specifically defined, return empty
    }

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
        .sort((a, b) => a.name.localeCompare(b.name));

  } catch (error) {
    console.error("Error fetching visit data for timeline:", error);
    if (mockClubHourlyAggregates[clubId]) {
      console.log(`Error fetching real timeline for ${clubId}, using mock hourly aggregates as fallback.`);
      return mockClubHourlyAggregates[clubId];
    }
    return [];
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
          if (data.length === 0 && !mockClubHourlyAggregates[club.id]) { // Only set error if no mock is available either
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
            Typical crowd flow based on entries in the last 7 days (real or sample data).
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
