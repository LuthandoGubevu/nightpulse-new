
"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { ClubStatusIndicator } from "./ClubStatusIndicator";
import { WaitTimeDialog } from "./WaitTimeDialog";
import type { ClubWithId, ClubStatus } from "@/types";
import { getClubStatus } from "@/lib/utils";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ClubTimelineDialog } from "./ClubTimelineDialog"; 
import type { Timestamp } from "firebase/firestore"; // Keep type import if used

interface ClubCardProps {
  club: ClubWithId; 
}

export function ClubCard({ club }: ClubCardProps) {
  const [isWaitTimeDialogOpen, setIsWaitTimeDialogOpen] = useState(false);
  const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false); 

  const status: ClubStatus = getClubStatus(club.currentCount, club.capacityThresholds);

  const statusTextMap: Record<ClubStatus, string> = {
    low: "Not busy",
    moderate: "Moderately busy",
    packed: "Packed",
    "over-packed": "Very Packed",
    unknown: "Unknown",
  };

  const isAnnouncementActive = () => {
    if (!club.announcementMessage) return false;
    if (!club.announcementExpiresAt) return true; 
    
    const expiryDate = club.announcementExpiresAt instanceof Timestamp 
      ? club.announcementExpiresAt.toDate() 
      : new Date(club.announcementExpiresAt as string | Date); 

    return expiryDate > new Date();
  };

  return (
    <>
      <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardContent className="p-6 flex-grow space-y-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl font-headline mb-1">{club.name}</CardTitle>
            <ClubStatusIndicator status={status} size="lg" />
          </div>
          {club.isTrending && (
             <Badge variant="destructive" className="mb-2 animate-pulse">
               <Icons.trendingUp className="mr-1 h-3 w-3" /> Trending Now
             </Badge>
           )}
          <CardDescription className="text-muted-foreground mb-1 flex items-center">
            <Icons.mapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            {club.address}
          </CardDescription>
          
          {club.distance !== undefined && club.distance !== Infinity && (
            <p className="text-sm text-muted-foreground">
              <Icons.navigation className="inline h-4 w-4 mr-1" /> 
              {club.distance.toFixed(1)} km away
            </p>
          )}

          <div className="flex items-baseline space-x-2">
            <Icons.users className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">{club.currentCount}</span> 
            <span className="text-sm text-muted-foreground">people (live)</span>
            <span className="text-sm font-medium">{statusTextMap[status]}</span>
          </div>

          {club.estimatedWaitTime && (
            <div className="flex items-center space-x-2">
              <Icons.clock className="h-5 w-5 text-primary" />
              <span className="text-sm">Est. Wait: <span className="font-semibold">{club.estimatedWaitTime}</span></span>
            </div>
          )}
          
          {isAnnouncementActive() && club.announcementMessage && (
            <div className="mt-2 p-2 bg-accent/10 border border-accent/30 rounded-md">
              <p className="text-xs font-semibold text-accent flex items-center">
                <Icons.bellRing className="h-4 w-4 mr-1.5" /> Announcement
              </p>
              <p className="text-xs text-accent/90">{club.announcementMessage}</p>
            </div>
          )}

          {(club.musicGenres && club.musicGenres.length > 0) && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Music:</span> {club.musicGenres.join(', ')}
            </div>
          )}
          {club.tonightDJ && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">DJ Tonight:</span> {club.tonightDJ}
            </div>
          )}
          
          {club.tags && club.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {club.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="p-4 border-t">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            <Button onClick={() => setIsWaitTimeDialogOpen(true)} variant="outline" className="w-full">
              <Icons.clock className="mr-2 h-4 w-4" />
              AI Wait Time
            </Button>
            <Button onClick={() => setIsTimelineDialogOpen(true)} variant="outline" className="w-full">
              <Icons.barChartBig className="mr-2 h-4 w-4" />
              Crowd Timeline
            </Button>
          </div>
        </CardFooter>
      </Card>

      {isWaitTimeDialogOpen && (
        <WaitTimeDialog
          club={club}
          isOpen={isWaitTimeDialogOpen}
          onOpenChange={setIsWaitTimeDialogOpen}
        />
      )}
      {isTimelineDialogOpen && (
        <ClubTimelineDialog 
          club={club}
          isOpen={isTimelineDialogOpen}
          onOpenChange={setIsTimelineDialogOpen}
        />
      )}
    </>
  );
}
