"use client";
import { AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { ClubWithId } from '@/types';
import { getClubStatus } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Icons } from '../icons';
import { ClubStatusIndicator } from './ClubStatusIndicator';

interface ClubMapMarkerProps {
  club: ClubWithId;
  onWaitTimeClick: (club: ClubWithId) => void;
}

export function ClubMapMarker({ club, onWaitTimeClick }: ClubMapMarkerProps) {
  if (!club.location) return null;

  const status = getClubStatus(club.currentCount, club.capacityThresholds);
  
  let pinColor = "hsl(var(--muted-foreground))"; // Unknown or default
  if (status === "low") pinColor = "hsl(var(--status-green))";
  else if (status === "moderate") pinColor = "hsl(var(--status-yellow))";
  else if (status === "packed") pinColor = "hsl(var(--status-orange))";
  else if (status === "over-packed") pinColor = "hsl(var(--status-red))";

  return (
    <AdvancedMarker position={club.location} title={club.name}>
      <Popover>
        <PopoverTrigger asChild>
          <button aria-label={`Details for ${club.name}`} className="focus:outline-none">
            <Pin background={pinColor} borderColor={"hsl(var(--foreground))"} glyphColor={"hsl(var(--foreground))"} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4">
          <div className="space-y-2">
            <h4 className="font-medium font-headline leading-none">{club.name}</h4>
            <p className="text-sm text-muted-foreground flex items-center">
              <Icons.mapPin className="h-3 w-3 mr-1.5 flex-shrink-0" />
              {club.address}
            </p>
            <div className="text-sm flex items-center">
              <Icons.users className="h-3 w-3 mr-1.5 flex-shrink-0" />
              Current Crowd: {club.currentCount}
              <ClubStatusIndicator status={status} size="sm" />
            </div>
            <Button size="sm" className="w-full mt-2" onClick={() => onWaitTimeClick(club)}>
              <Icons.clock className="mr-2 h-4 w-4" /> Estimate Wait Time
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </AdvancedMarker>
  );
}
