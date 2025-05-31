"use client";

import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { ClubStatusIndicator } from "./ClubStatusIndicator";
import { WaitTimeDialog } from "./WaitTimeDialog";
import type { ClubWithId, ClubStatus } from "@/types";
import { getClubStatus, formatDate } from "@/lib/utils";
import { useState } from "react";

interface ClubCardProps {
  club: ClubWithId;
}

export function ClubCard({ club }: ClubCardProps) {
  const [isWaitTimeDialogOpen, setIsWaitTimeDialogOpen] = useState(false);
  const status: ClubStatus = getClubStatus(club.currentCount, club.capacityThresholds);

  const statusTextMap: Record<ClubStatus, string> = {
    low: "Not busy",
    moderate: "Moderately busy",
    packed: "Packed",
    "over-packed": "Very Packed",
    unknown: "Unknown",
  };

  return (
    <>
      <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="p-0 relative">
          <Image
            src={club.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(club.name)}`}
            alt={club.name}
            width={600}
            height={400}
            className="w-full h-48 object-cover"
            data-ai-hint="nightclub nightlife"
          />
           <div className="absolute top-2 right-2 bg-background/80 p-1.5 rounded-full">
             <ClubStatusIndicator status={status} size="lg" />
           </div>
        </CardHeader>
        <CardContent className="p-6 flex-grow">
          <CardTitle className="text-2xl font-headline mb-1">{club.name}</CardTitle>
          <CardDescription className="text-muted-foreground mb-3 flex items-center">
            <Icons.mapPin className="h-4 w-4 mr-2" />
            {club.address}
          </CardDescription>
          
          <div className="flex items-center space-x-2 mb-1">
            <Icons.users className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">{club.currentCount}</span>
            <span className="text-sm text-muted-foreground">people currently</span>
          </div>
          <div className="flex items-center space-x-2 mb-3">
             <ClubStatusIndicator status={status} size="sm"/>
             <span className="text-sm font-medium">{statusTextMap[status]}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Last updated: {formatDate(club.lastUpdated)}
          </p>
        </CardContent>
        <CardFooter className="p-6 border-t">
          <Button onClick={() => setIsWaitTimeDialogOpen(true)} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            <Icons.clock className="mr-2 h-4 w-4" />
            Estimate Wait Time
          </Button>
        </CardFooter>
      </Card>
      {isWaitTimeDialogOpen && (
        <WaitTimeDialog
          club={club}
          isOpen={isWaitTimeDialogOpen}
          onOpenChange={setIsWaitTimeDialogOpen}
        />
      )}
    </>
  );
}
