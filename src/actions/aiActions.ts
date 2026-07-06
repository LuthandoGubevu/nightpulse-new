
"use server";
import type { EstimateWaitTimeInput } from '@/ai/flows/estimate-wait-time';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { HeartbeatEntry } from '@/types'; // Changed from Visit to HeartbeatEntry

// This function now aims to get recent heartbeat data rather than full visit logs.
// The AI prompt might need adjustment if it was expecting longer visit durations.
async function getHistoricalDataForClub(clubId: string): Promise<string> {
  if (!adminFirestore) {
    console.warn("Firestore admin not initialized in getHistoricalDataForClub. Returning empty data.");
    return JSON.stringify([]);
  }

  try {
    // Fetch recent heartbeats, e.g., last 24 hours, to get an idea of recent activity patterns
    const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const querySnapshot = await adminFirestore
      .collection('visits') // 'visits' collection stores heartbeats
      .where('clubId', '==', clubId)
      .where('lastSeen', '>=', twentyFourHoursAgo) // Focus on recent heartbeats
      .orderBy('lastSeen', 'desc')
      .limit(100) // Limit to a reasonable number of recent heartbeats
      .get();

    if (querySnapshot.empty) {
      console.log(`No recent heartbeat data for ${clubId}, returning empty array.`);
      return JSON.stringify([]);
    }

    const heartbeats = querySnapshot.docs.map(doc => {
      const data = doc.data() as HeartbeatEntry; // Using HeartbeatEntry
      const lastSeenTimestamp = data.lastSeen instanceof Timestamp
        ? data.lastSeen.toDate().toISOString()
        : (typeof data.lastSeen === 'string' ? data.lastSeen : new Date().toISOString());

      // For the AI, we might represent each heartbeat as a point-in-time presence
      return {
        deviceId: doc.id, // The deviceId is the document ID
        clubId: data.clubId,
        location: data.location,
        timestamp: lastSeenTimestamp,
      };
    });
    return JSON.stringify(heartbeats);
  } catch (error) {
    console.error(`Error fetching historical heartbeat data for club ${clubId}:`, error);
    return JSON.stringify([]); // Return empty on error
  }
}

export async function getEstimatedWaitTime(clubId: string, currentCount: number) {
  try {
    const historicalData = await getHistoricalDataForClub(clubId);

    const input: EstimateWaitTimeInput = {
      clubId,
      currentCount,
      // The historicalData format has changed. The AI prompt might need to be updated
      // to understand that this data now represents individual heartbeats/presence points
      // rather than entry/exit visit durations.
      historicalData,
    };
    // Loaded dynamically so the Genkit/Handlebars dependency chain is only evaluated
    // when this feature is actually invoked, not on every page that merely references
    // this action (e.g. the dashboard's WaitTimeDialog).
    const { estimateWaitTime: estimateWaitTimeFlow } = await import('@/ai/flows/estimate-wait-time');
    const result = await estimateWaitTimeFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error estimating wait time via AI flow:", error);
    const errorMessage = (typeof error === 'object' && error !== null && 'message' in error) ? String(error.message) : "Failed to estimate wait time due to an unknown error.";
    // Fallback logic to a simple estimation if AI fails, not mock club specific
    let basicWait = "5-15 min";
    if (currentCount > 100) basicWait = "20-30 min";
    if (currentCount > 150) basicWait = "35-50 min";
    if (currentCount <=10) basicWait = "No Wait";
    return { success: true, data: { estimatedWaitTime: `~${basicWait} (Default Estimate)` }, error: `AI estimation failed: ${errorMessage}. Using default.` };
  }
}
