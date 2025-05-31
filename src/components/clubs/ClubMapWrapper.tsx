"use client";
import { APIProvider, Map, ControlPosition } from '@vis.gl/react-google-maps';
import type { ClubWithId } from '@/types';
import { ClubMapMarker } from './ClubMapMarker';
import { mapConfig } from '@/config';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { CustomMapControl } from './CustomMapControl';
import { useState } from 'react';
import { WaitTimeDialog } from './WaitTimeDialog';

interface ClubMapWrapperProps {
  clubs: ClubWithId[];
}

export default function ClubMapWrapper({ clubs }: ClubMapWrapperProps) {
  const [selectedClubForWaitTime, setSelectedClubForWaitTime] = useState<ClubWithId | null>(null);

  const handleWaitTimeClick = (club: ClubWithId) => {
    setSelectedClubForWaitTime(club);
  };
  
  if (!mapConfig.apiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-muted/50 rounded-lg text-muted-foreground p-8 text-center shadow-inner">
        <Icons.warning className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2 font-headline">Map Display Disabled</h3>
        <p className="text-sm">
          Google Maps API Key is not configured. Please set the <code className="bg-primary/10 text-primary font-mono p-1 rounded-sm text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> environment variable.
        </p>
      </div>
    );
  }

  // Calculate center based on clubs or use default
  let center = mapConfig.defaultCenter;
  if (clubs.length > 0 && clubs[0]?.location) {
      // Simplistic center calculation: average of first club or more sophisticated logic
      const validClubs = clubs.filter(club => club.location);
      if (validClubs.length > 0) {
        const avgLat = validClubs.reduce((sum, club) => sum + (club.location?.lat ?? 0), 0) / validClubs.length;
        const avgLng = validClubs.reduce((sum, club) => sum + (club.location?.lng ?? 0), 0) / validClubs.length;
        if(!isNaN(avgLat) && !isNaN(avgLng)) {
           center = { lat: avgLat, lng: avgLng };
        }
      }
  }


  return (
    <>
      <APIProvider apiKey={mapConfig.apiKey}>
        <div style={{ height: "600px", width: "100%" }} className="rounded-lg overflow-hidden shadow-xl border">
          <Map
            defaultCenter={center}
            defaultZoom={mapConfig.defaultZoom}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapId="nightlife_navigator_map"
            className="dark-map-styles" // Apply custom styles if needed via cloud console
            fullscreenControl={false}
            zoomControl={true}
            streetViewControl={false}
          >
            {clubs.map(club => (
              <ClubMapMarker key={club.id} club={club} onWaitTimeClick={handleWaitTimeClick} />
            ))}
            <CustomMapControl controlPosition={ControlPosition.TOP_RIGHT}>
              <Button variant="outline" size="icon" className="m-2 bg-background hover:bg-muted" onClick={() => console.log("Recenter map") /* Implement recenter functionality */}>
                <Icons.mapPin className="h-4 w-4" /> 
                <span className="sr-only">Recenter Map</span>
              </Button>
            </CustomMapControl>
          </Map>
        </div>
      </APIProvider>
      {selectedClubForWaitTime && (
        <WaitTimeDialog
          club={selectedClubForWaitTime}
          isOpen={!!selectedClubForWaitTime}
          onOpenChange={() => setSelectedClubForWaitTime(null)}
        />
      )}
    </>
  );
}
