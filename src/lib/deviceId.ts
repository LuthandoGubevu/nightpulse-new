
"use client";

const DEVICE_ID_LOCAL_STORAGE_KEY = 'nightpulse_device_id';

/**
 * Retrieves a unique device ID from localStorage, or creates and stores one if not found.
 * This ID is used to uniquely identify the user's browser/session for heartbeats.
 * @returns {string} The unique device ID.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    // Fallback for environments without localStorage (e.g., server-side, or if disabled)
    // In a real-world scenario, might need a more robust server-side generated ID if this occurs often.
    console.warn("localStorage not available, generating a temporary device ID.");
    return `temp_${Math.random().toString(36).substring(2, 15)}`;
  }

  let deviceId = localStorage.getItem(DEVICE_ID_LOCAL_STORAGE_KEY);
  if (!deviceId) {
    try {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_LOCAL_STORAGE_KEY, deviceId);
    } catch (error) {
      // Fallback if crypto.randomUUID is not available (very old browsers) or localStorage fails
      console.error("Error generating or storing device ID:", error);
      deviceId = `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      // Attempt to store the fallback, but it might also fail
      try {
        localStorage.setItem(DEVICE_ID_LOCAL_STORAGE_KEY, deviceId);
      } catch (storeError) {
        console.error("Failed to store fallback device ID:", storeError);
      }
    }
  }
  return deviceId;
}
