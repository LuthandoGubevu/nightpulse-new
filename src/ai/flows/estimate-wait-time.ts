'use server';

/**
 * @fileOverview Provides estimated wait times for nightclubs based on current crowd levels and historical data.
 *
 * - estimateWaitTime - A function that estimates the wait time for a given nightclub.
 * - EstimateWaitTimeInput - The input type for the estimateWaitTime function.
 * - EstimateWaitTimeOutput - The return type for the estimateWaitTime function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateWaitTimeInputSchema = z.object({
  clubId: z.string().describe('The ID of the nightclub.'),
  currentCount: z.number().describe('The current number of people in the nightclub.'),
  historicalData: z.string().describe('JSON string containing historical visit data for the nightclub.'),
});
export type EstimateWaitTimeInput = z.infer<typeof EstimateWaitTimeInputSchema>;

const EstimateWaitTimeOutputSchema = z.object({
  estimatedWaitTime: z.string().describe('Estimated wait time in minutes. E.g., \'15-25 minutes\''),
});
export type EstimateWaitTimeOutput = z.infer<typeof EstimateWaitTimeOutputSchema>;

export async function estimateWaitTime(input: EstimateWaitTimeInput): Promise<EstimateWaitTimeOutput> {
  return estimateWaitTimeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateWaitTimePrompt',
  input: {schema: EstimateWaitTimeInputSchema},
  output: {schema: EstimateWaitTimeOutputSchema},
  prompt: `You are an AI assistant that estimates wait times for nightclubs.

  You are provided with the current number of people in the nightclub, and historical visit data.
  Use this information to estimate the wait time in minutes.

  Nightclub ID: {{{clubId}}}
  Current Crowd Count: {{{currentCount}}}
  Historical Visit Data: {{{historicalData}}}

  Provide your estimate in the format \'X-Y minutes\'. Be realistic.
`,
});

const estimateWaitTimeFlow = ai.defineFlow(
  {
    name: 'estimateWaitTimeFlow',
    inputSchema: EstimateWaitTimeInputSchema,
    outputSchema: EstimateWaitTimeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
