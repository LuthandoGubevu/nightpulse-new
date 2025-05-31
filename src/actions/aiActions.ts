"use server";
import { estimateWaitTime as estimateWaitTimeFlow, type EstimateWaitTimeInput } from '@/ai/flows/estimate-wait-time';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Visit } from '@/types';

// Simplified historical data fetching. In a real app, this would be more complex and robust.
async function getHistoricalDataForClub(clubId: string): Promise<string> {
  if (!firestore) {
     // Firestore might not be initialized on server if called early or config missing
    console.warn("Firestore not initialized in getHistoricalDataForClub. Returning empty historical data.");
    return JSON.stringify([]);
  }
  try {
    const visitsRef = collection(firestore, 'visits');
    const q = query(
      visitsRef,
      where('clubId', '==', clubId),
      orderBy('entryTimestamp', 'desc'),
      limit(50) // Get last 50 visits for simplicity
    );
    const querySnapshot = await getDocs(q);
    const visits = querySnapshot.docs.map(doc => {
      const data = doc.data() as Visit;
      // Ensure timestamps are converted to ISO strings if they are Firestore Timestamps
      const entryTimestamp = data.entryTimestamp instanceof Timestamp ? data.entryTimestamp.toDate().toISOString() : (typeof data.entryTimestamp === 'string' ? data.entryTimestamp : new Date().toISOString());
      const exitTimestamp = data.exitTimestamp ? (data.exitTimestamp instanceof Timestamp ? data.exitTimestamp.toDate().toISOString() : (typeof data.exitTimestamp === 'string' ? data.exitTimestamp : null) ) : null;
      
      return {
        entry: entryTimestamp,
        exit: exitTimestamp,
      };
    });
    return JSON.stringify(visits);
  } catch (error) {
    console.error(`Error fetching historical data for club ${clubId}:`, error);
    // Return empty array string on error to prevent AI flow from failing due to malformed JSON
    return JSON.stringify([]);
  }
}

export async function getEstimatedWaitTime(clubId: string, currentCount: number) {
  try {
    const historicalData = await getHistoricalDataForClub(clubId);
    
    const input: EstimateWaitTimeInput = {
      clubId,
      currentCount,
      historicalData,
    };
    const result = await estimateWaitTimeFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error estimating wait time via AI flow:", error);
    // Check if error is an object and has a message property
    const errorMessage = (typeof error === 'object' && error !== null && 'message' in error) ? String(error.message) : "Failed to estimate wait time due to an unknown error.";
    return { success: false, error: errorMessage };
  }
}
