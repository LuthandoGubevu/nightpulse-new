
"use client";

import { useEffect, useRef, useCallback } from 'react';
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
  locationError: string | null; // Keep this for reporting location issues
}

export function useGeofenceAutoCheckin({
  clubs,
  isEnabled,
  userLocation,
  onGeofenceChange,
}: UseGeofenceAutoCheckinProps): UseGeofenceAutoCheckinReturn {
  const { toast } = useToast();
  const [locationError, setLocationError] = useState<string | null>(null); // Keep original location error state

  const determinedClubIdRef = useRef<string | null>(null); // Club ID user is currently considered in
  const lastActionTimestampRef = useRef<number>(0); // Timestamp of the last successful geofence change action
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const processLocationUpdate = useCallback((currentLat: number, currentLng: number) => {
    let closestEligibleClubForCheckIn: ClubWithId | null = null;
    let minDistanceToCheckIn = Infinity;

    for (const club of clubs) {
      if (!club.location) continue;
      const distance = getDistanceMeters(currentLat, currentLng, club.location.lat, club.location.lng);

      // Check if user is within check-in radius of any club
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

    // Scenario 1: User is currently in a determined club's geofence
    if (determinedClubIdRef.current) {
      const currentDeterminedClub = clubs.find(c => c.id === determinedClubIdRef.current);
      if (currentDeterminedClub?.location) {
        const distanceToCurrentDeterminedClub = getDistanceMeters(
          currentLat, currentLng,
          currentDeterminedClub.location.lat, currentDeterminedClub.location.lng
        );

        // Check if user has exited the current determined club's wider geofence
        if (distanceToCurrentDeterminedClub > GEOFENCE_CHECK_OUT_RADIUS_METERS) {
          if (canPerformAction) {
            toast({ title: "Geofence Left", description: `You have left the vicinity of ${currentDeterminedClub.name}.` });
            onGeofenceChange(null);
            determinedClubIdRef.current = null;
            lastActionTimestampRef.current = now;
          } else {
            // console.log(`Cooldown: Exiting ${currentDeterminedClub.name}, but action delayed.`);
            toast({ title: "Cooldown Active", description: `Exited ${currentDeterminedClub.name} vicinity, change will reflect shortly.`, duration: 3000 });
          }
          return; // Exit further processing for this update
        }
      }
    }

    // Scenario 2: User is eligible to enter a new club's geofence
    if (closestEligibleClubForCheckIn) {
      // If not already determined to be in this club
      if (closestEligibleClubForCheckIn.id !== determinedClubIdRef.current) {
        if (canPerformAction) {
          // If previously in another club, that exit should have been handled by Scenario 1 or this new entry supersedes.
          toast({ title: "Geofence Entered", description: `You are now near ${closestEligibleClubForCheckIn.name}. Auto-presence active.` });
          onGeofenceChange(closestEligibleClubForCheckIn.id);
          determinedClubIdRef.current = closestEligibleClubForCheckIn.id;
          lastActionTimestampRef.current = now;
        } else {
            // console.log(`Cooldown: Entering ${closestEligibleClubForCheckIn.name}, but action delayed.`);
            toast({ title: "Cooldown Active", description: `Near ${closestEligibleClubForCheckIn.name}, change will reflect shortly.`, duration: 3000 });
        }
      }
      // If already determined to be in this club, do nothing (no change)
      return;
    }

    // Scenario 3: User is not in any check-in zone, and not in the wider check-out zone of a determined club
    // (This implies they are in "no man's land" or have already been processed for exit)
    // If they were in a club, and didn't meet exit criteria, they are still "in".
    // If determinedClubIdRef.current is set here, it means they are still within the checkout radius of that club.
    // If determinedClubIdRef.current is null, and no new club to check into, then state remains null.
    if (determinedClubIdRef.current && !closestEligibleClubForCheckIn) {
        // User is not in a check-in zone of any club, but was previously in a club.
        // Exit logic (Scenario 1) should handle this if they are beyond checkout radius.
        // If they are between check-in and check-out radius of the current club, they are still "in".
    }


  }, [clubs, onGeofenceChange, toast]);


  useEffect(() => {
    if (!isEnabled || !userLocation) {
      if (determinedClubIdRef.current) {
        // If feature is disabled or location lost, signal exit from current geofence
        // console.log("Geofence disabled or location lost, clearing determined club.");
        onGeofenceChange(null); // Inform dashboard
        determinedClubIdRef.current = null; // Reset internal state
        // No toast here as it might be due to user disabling the feature
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setLocationError(null); // Clear any previous location error when not active
      return;
    }

    setLocationError(null); // Clear error if we have location and are enabled

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (userLocation) { // Ensure userLocation is still valid after debounce
        // console.log('Debounced location processing:', userLocation);
        processLocationUpdate(userLocation.lat, userLocation.lng);
      }
    }, LOCATION_DEBOUNCE_MS);

    // Cleanup debounce timer on unmount or when dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [isEnabled, userLocation, clubs, processLocationUpdate, onGeofenceChange]);

  // This hook now primarily signals geofence changes via onGeofenceChange.
  // It still returns locationError for the dashboard to potentially display.
  // The actual "closestClubInGeofence" object is now managed by the dashboard based on the ID from onGeofenceChange.
  return { locationError };
}
