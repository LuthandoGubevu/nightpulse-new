
'use server';

// import { firestore } from '@/lib/firebase';
// import { doc, runTransaction, Timestamp } from 'firebase/firestore';
// import { revalidatePath } from 'next/cache';

// The incrementClubCountAction and decrementClubCountAction are no longer needed
// as crowd counts are now derived from the heartbeat system (visits collection).
// This file can be removed if no other visit-related server actions are planned.

// export async function incrementClubCountAction(clubId: string): Promise<{ success: boolean; error?: string; newCount?: number }> {
//   if (!firestore) return { success: false, error: 'Firestore not initialized' };
//   const clubRef = doc(firestore, 'clubs', clubId);
//   try {
//     let newCountValue;
//     await runTransaction(firestore, async (transaction) => {
//       const clubDoc = await transaction.get(clubRef);
//       if (!clubDoc.exists()) {
//         throw new Error('Club not found');
//       }
//       const currentCount = clubDoc.data().currentCount || 0;
//       newCountValue = currentCount + 1;
//       transaction.update(clubRef, {
//         currentCount: newCountValue,
//         lastUpdated: Timestamp.now(),
//       });
//     });
//     revalidatePath('/'); 
//     revalidatePath('/dashboard');
//     revalidatePath('/admin/clubs');
//     return { success: true, newCount: newCountValue };
//   } catch (error: any) {
//     console.error('Error incrementing club count:', error);
//     return { success: false, error: error.message || 'Failed to increment count' };
//   }
// }

// export async function decrementClubCountAction(clubId: string): Promise<{ success: boolean; error?: string; newCount?: number }> {
//   if (!firestore) return { success: false, error: 'Firestore not initialized' };
//   const clubRef = doc(firestore, 'clubs', clubId);
//   try {
//     let newCountValue;
//     await runTransaction(firestore, async (transaction) => {
//       const clubDoc = await transaction.get(clubRef);
//       if (!clubDoc.exists()) {
//         throw new Error('Club not found');
//       }
//       const currentCount = clubDoc.data().currentCount || 0;
//       newCountValue = Math.max(0, currentCount - 1); 
//       transaction.update(clubRef, {
//         currentCount: newCountValue,
//         lastUpdated: Timestamp.now(),
//       });
//     });
//     revalidatePath('/'); 
//     revalidatePath('/dashboard');
//     revalidatePath('/admin/clubs');
//     return { success: true, newCount: newCountValue };
//   } catch (error: any) {
//     console.error('Error decrementing club count:', error);
//     return { success: false, error: error.message || 'Failed to decrement count' };
//   }
// }
