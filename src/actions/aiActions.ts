
"use server";
import { estimateWaitTime as estimateWaitTimeFlow, type EstimateWaitTimeInput } from '@/ai/flows/estimate-wait-time';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Visit } from '@/types';

// Mock historical data for specific mock club IDs in Johannesburg
const mockClubVisitHistory: Record<string, Partial<Visit>[]> = {
  'mock-club-1': [ // Sanctuary Mandela
    // Simulate weekend pattern - busier Fri/Sat nights
    // Friday night (5 days ago if today is Wednesday for example)
    { entryTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - (24-21) * 60 * 60 * 1000).toISOString(), exitTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - (24-23) * 60 * 60 * 1000).toISOString() }, // 9 PM - 11 PM
    { entryTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - (24-22) * 60 * 60 * 1000).toISOString(), exitTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - (24-24) * 60 * 60 * 1000).toISOString() }, // 10 PM - 12 AM
    // Saturday night (4 days ago)
    { entryTimestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - (24-20) * 60 * 60 * 1000).toISOString(), exitTimestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - (24-22) * 60 * 60 * 1000).toISOString() }, // 8 PM - 10 PM
    { entryTimestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - (24-23) * 60 * 60 * 1000).toISOString(), exitTimestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - (24-25) * 60 * 60 * 1000).toISOString() }, // 11 PM - 1 AM
  ],
  'mock-club-2': [ // Truth Nightclub
    // Simulate late night techno club pattern
    // Friday (5 days ago)
    { entryTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - (24-23) * 60 * 60 * 1000).toISOString(), exitTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - (24-26) * 60 * 60 * 1000).toISOString() }, // 11 PM - 2 AM
    { entryTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - (24-24) * 60 * 60 * 1000).toISOString(), exitTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - (24-27) * 60 * 60 * 1000).toISOString() }, // 12 AM - 3 AM
    // Saturday (4 days ago)
    { entryTimestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - (24-22) * 60 * 60 * 1000).toISOString(), exitTimestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - (24-25) * 60 * 60 * 1000).toISOString() }, // 10 PM - 1 AM
  ],
  'mock-club-4': [ // And Club (Packed)
    // Consistently busy on weekends
    // Friday (5 days ago)
    { entryTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - (24-22) * 60 * 60 * 1000).toISOString(), exitTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - (24-25) * 60 * 60 * 1000).toISOString() }, // 10 PM - 1 AM
    // Saturday (4 days ago)
    { entryTimestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - (24-21) * 60 * 60 * 1000).toISOString(), exitTimestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - (24-24) * 60 * 60 * 1000).toISOString() }, // 9 PM - 12 AM
    // Current day, recent activity
    { entryTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), exitTimestamp: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString() }, // 2 hours ago, 1.5hr duration
  ],
};


async function getHistoricalDataForClub(clubId: string): Promise<string> {
  if (!firestore) {
    console.warn("Firestore not initialized in getHistoricalDataForClub.");
    // If Firestore isn't available, and it's a mock club, provide mock data.
    if (mockClubVisitHistory[clubId]) {
      console.log(`Firestore unavailable, providing mock visit history for mock club ${clubId}`);
      return JSON.stringify(mockClubVisitHistory[clubId].map(v => ({
        entry: v.entryTimestamp,
        exit: v.exitTimestamp,
        userId: v.userId || 'mock-user', // Add userId if available in mock, else default
      })));
    }
    return JSON.stringify([]);
  }

  try {
    const visitsRef = collection(firestore, 'visits');
    const q = query(
      visitsRef,
      where('clubId', '==', clubId),
      orderBy('entryTimestamp', 'desc'),
      limit(50) 
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty && mockClubVisitHistory[clubId]) {
      console.log(`No real visit history for ${clubId}, providing mock visit history.`);
      return JSON.stringify(mockClubVisitHistory[clubId].map(v => ({
        entry: v.entryTimestamp,
        exit: v.exitTimestamp,
        userId: v.userId || 'mock-user',
      })));
    }

    const visits = querySnapshot.docs.map(doc => {
      const data = doc.data() as Visit;
      const entryTimestamp = data.entryTimestamp instanceof Timestamp ? data.entryTimestamp.toDate().toISOString() : (typeof data.entryTimestamp === 'string' ? data.entryTimestamp : new Date().toISOString());
      const exitTimestamp = data.exitTimestamp ? (data.exitTimestamp instanceof Timestamp ? data.exitTimestamp.toDate().toISOString() : (typeof data.exitTimestamp === 'string' ? data.exitTimestamp : null) ) : null;
      
      return {
        entry: entryTimestamp,
        exit: exitTimestamp,
        userId: data.userId, // Include userId from Firestore
      };
    });
    return JSON.stringify(visits);
  } catch (error) {
    console.error(`Error fetching historical data for club ${clubId}:`, error);
    if (mockClubVisitHistory[clubId]) {
      console.log(`Error fetching real history for ${clubId}, providing mock visit history as fallback.`);
      return JSON.stringify(mockClubVisitHistory[clubId].map(v => ({
        entry: v.entryTimestamp,
        exit: v.exitTimestamp,
        userId: v.userId || 'mock-user',
      })));
    }
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
    const errorMessage = (typeof error === 'object' && error !== null && 'message' in error) ? String(error.message) : "Failed to estimate wait time due to an unknown error.";
    // Provide a mock estimation if it's a known mock club and AI fails
    if (['mock-club-1', 'mock-club-2', 'mock-club-3', 'mock-club-4'].includes(clubId)) {
        let mockWait = "5-10 min";
        if (currentCount > 100) mockWait = "15-25 min";
        if (currentCount > 150) mockWait = "30-45 min";
         return { success: true, data: { estimatedWaitTime: `~${mockWait} (Sample)` } };
    }
    return { success: false, error: errorMessage };
  }
}

