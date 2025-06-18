
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ClubWithId } from '@/types';
import { getDistanceMeters } from '@/lib/utils';
import { incrementClubCountAction, decrementClubCountAction } from '@/actions/visitActions';
import { useToast } from './use-toast';

const GEOFENCE_RADIUS_METERS = 50;
const LOCAL_STORAGE_AUTO_CHECKIN_KEY = 'nightpulse_auto_checked_in_club_id';

interface UseGeofenceAutoCheckinProps {
  clubs: ClubWithId[];
  isEnabled: boolean;
}

export function useGeofenceAutoCheckin({ clubs, isEnabled }: UseGeofenceAutoCheckinProps) {
  const { toast } = useToast();
  const [currentlyAutoCheckedInClubId, setCurrentlyAutoCheckedInClubId] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentlyAutoCheckedInClubId(localStorage.getItem(LOCAL_STORAGE_AUTO_CHECKIN_KEY));
    }
  }, []);

  const processGeofenceEvent = useCallback(async (latitude: number, longitude: number) => {
    let closestClubInGeofence: ClubWithId | null = null;
    let minDistance = Infinity;

    for (const club of clubs) {
      if (!club.location) continue;
      const distance = getDistanceMeters(latitude, longitude, club.location.lat, club.location.lng);
      if (distance <= GEOFENCE_RADIUS_METERS) {
        if (distance < minDistance) {
          minDistance = distance;
          closestClubInGeofence = club;
        }
      }
    }

    if (closestClubInGeofence) {
      if (currentlyAutoCheckedInClubId !== closestClubInGeofence.id) {
        if (currentlyAutoCheckedInClubId) {
          const oldClub = clubs.find(c => c.id === currentlyAutoCheckedInClubId);
          await decrementClubCountAction(currentlyAutoCheckedInClubId);
          toast({ variant: 'default', title: "Auto Check-Out", description: `You've left the vicinity of ${oldClub?.name || 'the previous club'}.` });
        }
        await incrementClubCountAction(closestClubInGeofence.id);
        localStorage.setItem(LOCAL_STORAGE_AUTO_CHECKIN_KEY, closestClubInGeofence.id);
        setCurrentlyAutoCheckedInClubId(closestClubInGeofence.id);
        toast({ variant: 'default', title: "Auto Check-In", description: `Welcome to ${closestClubInGeofence.name}! You've been automatically checked in.` });
      }
    } else {
      if (currentlyAutoCheckedInClubId) {
        const oldClub = clubs.find(c => c.id === currentlyAutoCheckedInClubId);
        await decrementClubCountAction(currentlyAutoCheckedInClubId);
        localStorage.removeItem(LOCAL_STORAGE_AUTO_CHECKIN_KEY);
        setCurrentlyAutoCheckedInClubId(null);
        toast({ variant: 'default', title: "Auto Check-Out", description: `You've left the vicinity of ${oldClub?.name || 'the club'}.` });
      }
    }
  }, [clubs, currentlyAutoCheckedInClubId, toast]);


  useEffect(() => {
    if (isEnabled && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
        if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
              setLocationError(null);
              processGeofenceEvent(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
              console.error("Error watching location:", error);
              setLocationError(`Location error: ${error.message}. Auto check-in may not work.`);
              toast({ variant: "destructive", title: "Location Error", description: "Could not get location for auto check-in." });
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000, distanceFilter: 5 }
          );
        } else if (permissionStatus.state === 'denied') {
          setLocationError("Location permission denied. Enable location services for auto check-in.");
          toast({ variant: "destructive", title: "Permission Denied", description: "Location access is needed for auto check-in."});
        }
        permissionStatus.onchange = () => {
           if (permissionStatus.state === 'denied' && watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            setLocationError("Location permission was denied. Auto check-in stopped.");
          }
        };
      });

      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // If feature is disabled and user was auto-checked in, check them out
      if (!isEnabled && currentlyAutoCheckedInClubId && typeof window !== 'undefined') {
         const checkOutAsync = async () => {
            const oldClub = clubs.find(c => c.id === currentlyAutoCheckedInClubId);
            await decrementClubCountAction(currentlyAutoCheckedInClubId);
            localStorage.removeItem(LOCAL_STORAGE_AUTO_CHECKIN_KEY);
            setCurrentlyAutoCheckedInClubId(null);
            toast({ title: "Auto Check-In Disabled", description: `You've been checked out from ${oldClub?.name || 'the club'}.` });
        };
        checkOutAsync();
      }
    }
  }, [isEnabled, processGeofenceEvent, toast, clubs, currentlyAutoCheckedInClubId]);

  return { locationError, autoCheckedInClubId: currentlyAutoCheckedInClubId };
}
