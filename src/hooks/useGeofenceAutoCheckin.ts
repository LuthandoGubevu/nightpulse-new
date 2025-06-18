
"use client";

import { useEffect, useRef, useCallback, useState } from 'react'; // Added useState
import type { ClubWithId, UserLocation } from '@/types';
import { getDistanceMeters } from '@/lib/utils';
import { useToast } from './use-toast';

const GEOFENCE_CHECK_IN_RADIUS_METERS = 45; // Radius for considering a user "entering" a club geofence
const GEOFENCE_CHECK_OUT_RADIUS_METERS = 60; // Radius for considering a user "exiting" a club geofence (must be > check-in)
const ACTION_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown between geofence actions
const LOCATION_DEBOUNCE_MS = 1500; // 1.5 seconds debounce for location updates

interface UseGeofenceAutoCheckinProps {
  clubs: ClubWithId[];
  isEnabled: boolean;
  userLocation: UserLocation | null;
  onGeofenceChange: (clubId: string | null) => void; // Callback when geofence state changes
}

interface UseGeofenceAutoCheckinReturn {
  locationError: string | null; 
}

export function useGeofenceAutoCheckin({
  clubs,
  isEnabled,
  userLocation,
  onGeofenceChange,
}: UseGeofenceAutoCheckinProps): UseGeofenceAutoCheckinReturn {
  const { toast } = useToast();
  const [locationError, setLocationError] = useState<string | null>(null); 

  const determinedClubIdRef = useRef<string | null>(null); 
  const lastActionTimestampRef = useRef<number>(0); 
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const processLocationUpdate = useCallback((currentLat: number, currentLng: number) => {
    let closestEligibleClubForCheckIn: ClubWithId | null = null;
    let minDistanceToCheckIn = Infinity;

    for (const club of clubs) {
      if (!club.location) continue;
      const distance = getDistanceMeters(currentLat, currentLng, club.location.lat, club.location.lng);

      if (distance <= GEOFENCE_CHECK_IN_RADIUS_METERS) {
        if (distance < minDistanceToCheckIn) {
          minDistanceToCheckIn = distance;
          closestEligibleClubForCheckIn = club;
        }
      }
    }

    const now = Date.now();
    const timeSinceLastAction = now - lastActionTimestampRef.current;
    const canPerformAction = timeSinceLastAction > ACTION_COOLDOWN_MS;

    if (determinedClubIdRef.current) {
      const currentDeterminedClub = clubs.find(c => c.id === determinedClubIdRef.current);
      if (currentDeterminedClub?.location) {
        const distanceToCurrentDeterminedClub = getDistanceMeters(
          currentLat, currentLng,
          currentDeterminedClub.location.lat, currentDeterminedClub.location.lng
        );

        if (distanceToCurrentDeterminedClub > GEOFENCE_CHECK_OUT_RADIUS_METERS) {
          if (canPerformAction) {
            toast({ title: "Geofence Left", description: `You have left the vicinity of ${currentDeterminedClub.name}.` });
            onGeofenceChange(null);
            determinedClubIdRef.current = null;
            lastActionTimestampRef.current = now;
          } else {
            toast({ title: "Cooldown Active", description: `Exited ${currentDeterminedClub.name} vicinity, change will reflect shortly.`, duration: 3000 });
          }
          return; 
        }
      }
    }

    if (closestEligibleClubForCheckIn) {
      if (closestEligibleClubForCheckIn.id !== determinedClubIdRef.current) {
        if (canPerformAction) {
          toast({ title: "Geofence Entered", description: `You are now near ${closestEligibleClubForCheckIn.name}. Auto-presence active.` });
          onGeofenceChange(closestEligibleClubForCheckIn.id);
          determinedClubIdRef.current = closestEligibleClubForCheckIn.id;
          lastActionTimestampRef.current = now;
        } else {
            toast({ title: "Cooldown Active", description: `Near ${closestEligibleClubForCheckIn.name}, change will reflect shortly.`, duration: 3000 });
        }
      }
      return;
    }

    if (determinedClubIdRef.current && !closestEligibleClubForCheckIn) {
      // This condition means the user was in a club's check-out zone but not its check-in zone, 
      // and also not in any other club's check-in zone.
      // The exit logic above (distanceToCurrentDeterminedClub > GEOFENCE_CHECK_OUT_RADIUS_METERS) handles explicit exits.
      // If they are between check-in and check-out radius of the current club, they are still "in".
      // No explicit action needed here unless further refinement of "limbo" state is desired.
    }


  }, [clubs, onGeofenceChange, toast]);


  useEffect(() => {
    if (!isEnabled || !userLocation) {
      if (determinedClubIdRef.current) {
        onGeofenceChange(null); 
        determinedClubIdRef.current = null; 
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setLocationError(null); 
      return;
    }

    setLocationError(null); 

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (userLocation) { 
        processLocationUpdate(userLocation.lat, userLocation.lng);
      }
    }, LOCATION_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [isEnabled, userLocation, clubs, processLocationUpdate, onGeofenceChange]);
  
  return { locationError };
}
