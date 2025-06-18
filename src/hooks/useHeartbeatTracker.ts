
"use client";

import { useEffect, useRef, useCallback } from 'react';
import type { UserLocation } from '@/types';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import { useToast } from './use-toast';

interface UseHeartbeatTrackerProps {
  clubId: string | null; // The ID of the club the user is currently in (or null if not in any)
  userLocation: UserLocation | null;
  isEnabled: boolean; // Is the auto check-in/heartbeat system globally enabled by the user
}

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useHeartbeatTracker({ clubId, userLocation, isEnabled }: UseHeartbeatTrackerProps) {
  const { toast } = useToast();
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Get or create device ID once
    if (!deviceIdRef.current) {
      deviceIdRef.current = getOrCreateDeviceId();
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!clubId || !userLocation || !deviceIdRef.current) {
      // console.log('Heartbeat skipped: missing clubId, userLocation, or deviceId');
      return;
    }

    // console.log(`Sending heartbeat for club ${clubId} by device ${deviceIdRef.current}`);
    try {
      const response = await fetch('/api/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clubId,
          lat: userLocation.lat,
          lng: userLocation.lng,
          deviceId: deviceIdRef.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Heartbeat failed with status ${response.status}`);
      }
      // console.log('Heartbeat successful for club:', clubId);
      // Optionally, show a success toast, but it might be too noisy for every 5 mins
      // toast({ title: "Still Here!", description: `Your presence at the club is updated.` });
    } catch (error: any) {
      console.error('Failed to send heartbeat:', error);
      toast({
        variant: 'destructive',
        title: 'Heartbeat Failed',
        description: `Could not update your presence: ${error.message}. Crowd counts might be temporarily inaccurate.`,
      });
    }
  }, [clubId, userLocation, toast]);

  useEffect(() => {
    // Clear any existing interval when dependencies change
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (isEnabled && clubId && userLocation) {
      // Send an immediate heartbeat when user enters a club's geofence and feature is enabled
      sendHeartbeat(); 
      
      // Then set up the interval
      intervalIdRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [isEnabled, clubId, userLocation, sendHeartbeat]); // sendHeartbeat is stable due to useCallback

  // No direct return value needed, hook manages its own side effects.
}
