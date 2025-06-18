
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
import type { ClubWithId, HeartbeatEntry } from "@/types"; // Changed Visit to HeartbeatEntry
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { firestore } from "@/lib/firebase"; 
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore"; // Added orderBy
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

interface ClubTimelineDialogProps {
  club: ClubWithId;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

async function getHourlyHeartbeatData(clubId: string): Promise<{ name: string; visitors: number }[]> {
  if (!firestore) {
    console.warn(`Firestore unavailable, cannot fetch hourly heartbeats for ${clubId}`);
    return [];
  }
  
  try {
    const heartbeatsRef = collection(firestore, "visits");
    // Analyze heartbeats from the last 7 days for the timeline
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const q = query(
        heartbeatsRef, 
        where("clubId", "==", clubId), 
        where("lastSeen", ">=", Timestamp.fromDate(sevenDaysAgo)),
        orderBy("lastSeen") // Order by lastSeen to process chronologically if needed, though aggregation makes it less critical
    );
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`No recent heartbeats for ${clubId} to generate timeline.`);
      return [];
    }

    const heartbeats = querySnapshot.docs.map(doc => doc.data() as HeartbeatEntry);
    const hourlyCounts: { [key: string]: number } = {};
    for (let i = 0; i < 24; i++) {
        hourlyCounts[i.toString().padStart(2, '0') + ":00"] = 0;
    }

    heartbeats.forEach(hb => {
        if (hb.lastSeen) { // Ensure lastSeen exists
            const entryDate = hb.lastSeen instanceof Timestamp 
                ? hb.lastSeen.toDate() 
                : new Date(hb.lastSeen as string); // Assuming lastSeen could be string from older data
            const hourKey = entryDate.getHours().toString().padStart(2, '0') + ":00";
            hourlyCounts[hourKey] = (hourlyCounts[hourKey] || 0) + 1; // Count each heartbeat
        }
    });
    
    return Object.entries(hourlyCounts)
        .map(([name, visitors]) => ({ name, visitors }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort by hour for the chart

  } catch (error) {
    console.error("Error fetching heartbeat data for timeline:", error);
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
      getHourlyHeartbeatData(club.id)
        .then(data => {
          setTimelineData(data);
          if (data.length === 0) {
            // setError("No heartbeat data found for the last 7 days to generate a timeline.");
            // This state is handled by the "No Data Available" alert now
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
            Typical crowd flow based on heartbeats in the last 7 days.
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
                <AlertDescription>Not enough recent heartbeat data to generate a crowd timeline for this club.</AlertDescription>
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
                <Bar dataKey="visitors" fill="hsl(var(--primary))" name="Average Heartbeats" radius={[4, 4, 0, 0]} />
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
