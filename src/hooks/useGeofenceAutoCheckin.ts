
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ClubWithId, UserLocation } from '@/types';
import { getDistanceMeters } from '@/lib/utils';
import { useToast } from './use-toast';

const GEOFENCE_RADIUS_METERS = 50; // Radius for considering a user "at" a club

interface UseGeofenceAutoCheckinProps {
  clubs: ClubWithId[];
  isEnabled: boolean; // Is the auto check-in system globally enabled by the user
  userLocation: UserLocation | null; // Current user location from dashboard
}

interface UseGeofenceAutoCheckinReturn {
  closestClubInGeofence: ClubWithId | null;
  locationError: string | null;
}

export function useGeofenceAutoCheckin({ clubs, isEnabled, userLocation }: UseGeofenceAutoCheckinProps): UseGeofenceAutoCheckinReturn {
  const { toast } = useToast();
  const [closestClubInGeofence, setClosestClubInGeofence] = useState<ClubWithId | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const previousClosestClubIdRef = useRef<string | null>(null);

  const findClosestClubInGeofence = useCallback((latitude: number, longitude: number) => {
    let newClosestClub: ClubWithId | null = null;
    let minDistance = Infinity;

    for (const club of clubs) {
      if (!club.location) continue;
      const distance = getDistanceMeters(latitude, longitude, club.location.lat, club.location.lng);
      if (distance <= GEOFENCE_RADIUS_METERS) {
        if (distance < minDistance) {
          minDistance = distance;
          newClosestClub = club;
        }
      }
    }
    
    if (newClosestClub?.id !== previousClosestClubIdRef.current) {
        if (newClosestClub) {
            toast({ title: "Near Club", description: `You are now near ${newClosestClub.name}. Heartbeats will be sent.`});
        } else if (previousClosestClubIdRef.current) {
            const oldClub = clubs.find(c => c.id === previousClosestClubIdRef.current);
            toast({ title: "Left Club Area", description: `You've left the vicinity of ${oldClub?.name || 'the club'}. Heartbeats stopped for this club.` });
        }
        previousClosestClubIdRef.current = newClosestClub?.id || null;
    }
    setClosestClubInGeofence(newClosestClub);

  }, [clubs, toast]);


  useEffect(() => {
    if (isEnabled && userLocation) {
      setLocationError(null);
      findClosestClubInGeofence(userLocation.lat, userLocation.lng);
    } else if (!isEnabled) {
      // If feature is disabled, clear the current geofenced club
      if (closestClubInGeofence) {
        // Optionally notify user they are no longer "actively" tracked for heartbeat for this club
        // toast({ title: "Auto Presence Disabled", description: `Stopped sending heartbeats for ${closestClubInGeofence.name}.` });
      }
      setClosestClubInGeofence(null);
      previousClosestClubIdRef.current = null;
    }
    // Not including findClosestClubInGeofence in deps to avoid re-running if only clubs/toast changes
    // It's primarily driven by isEnabled and userLocation changes.
  }, [isEnabled, userLocation, clubs, toast]); // Added clubs and toast, findClosestClubInGeofence will be stable if memoized correctly

  // This hook now primarily returns the club the user is in the geofence of.
  // The actual heartbeat sending is handled by useHeartbeatTracker.
  return { closestClubInGeofence, locationError };
}
