
"use client";

import { Card, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { ClubStatusIndicator } from "./ClubStatusIndicator";
import { ClubRatingIndicator } from "./ClubRatingIndicator";
import { SafetyRatingWidget } from "./SafetyRatingWidget";
import { MeetMeButton } from "@/components/meetme/MeetMeButton";
import type { ClubWithId, ClubStatus } from "@/types";
import { getClubStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";

interface ClubCardProps {
  club: ClubWithId;
  isHereNow?: boolean;
}

export function ClubCard({ club, isHereNow = false }: ClubCardProps) {
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
      <CardFooter className="p-4 border-t flex flex-col items-stretch gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Safety Rating</span>
          <ClubRatingIndicator sum={club.safetyRatingSum ?? 0} count={club.safetyRatingCount ?? 0} size="sm" />
        </div>
        <SafetyRatingWidget clubId={club.id} initialRating={club.myRating ?? null} />
        {isHereNow && (
          <div className="pt-2 border-t">
            <MeetMeButton clubId={club.id} />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
