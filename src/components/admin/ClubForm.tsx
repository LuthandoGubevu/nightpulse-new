"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Assuming you have a Textarea component
import type { Club, ClubWithId } from "@/types";
import { addClubAction, updateClubAction } from "@/actions/clubActions";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react"; // Added a proper import for useState

const clubFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  currentCount: z.coerce.number().min(0).default(0),
  thresholdLow: z.coerce.number().min(0),
  thresholdModerate: z.coerce.number().min(0),
  thresholdPacked: z.coerce.number().min(0),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
}).refine(data => data.thresholdModerate > data.thresholdLow, {
  message: "Moderate threshold must be greater than Low threshold.",
  path: ["thresholdModerate"],
}).refine(data => data.thresholdPacked > data.thresholdModerate, {
  message: "Packed threshold must be greater than Moderate threshold.",
  path: ["thresholdPacked"],
});


type ClubFormValues = z.infer<typeof clubFormSchema>;

interface ClubFormProps {
  club?: ClubWithId | null; // Make club optional for 'add' mode
  mode: "add" | "edit";
}

export function ClubForm({ club, mode }: ClubFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<ClubFormValues> = club
    ? {
        name: club.name,
        address: club.address,
        latitude: club.location?.lat,
        longitude: club.location?.lng,
        currentCount: club.currentCount,
        thresholdLow: club.capacityThresholds.low,
        thresholdModerate: club.capacityThresholds.moderate,
        thresholdPacked: club.capacityThresholds.packed,
        imageUrl: club.imageUrl || '',
      }
    : {
        name: "",
        address: "",
        currentCount: 0,
        thresholdLow: 50,
        thresholdModerate: 100,
        thresholdPacked: 150,
        imageUrl: '',
      };

  const form = useForm<ClubFormValues>({
    resolver: zodResolver(clubFormSchema),
    defaultValues,
    mode: "onChange",
  });

  async function onSubmit(data: ClubFormValues) {
    setIsSubmitting(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    
    // Special handling for nested objects before they are stringified to FormData
    // Or ensure actions can parse these directly. For simplicity, flattened for FormData.

    let result;
    if (mode === "edit" && club) {
      result = await updateClubAction(club.id, formData);
    } else {
      result = await addClubAction(formData);
    }
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: `Club ${mode === "edit" ? "Updated" : "Added"}`,
        description: `${data.name} has been successfully ${mode === "edit" ? "updated" : "added"}.`,
      });
      router.push("/admin/clubs");
      router.refresh(); // Ensure data is refreshed on the redirected page
    } else {
      toast({
        title: `Error ${mode === "edit" ? "Updating" : "Adding"} Club`,
        description: result.error || "An unexpected error occurred.",
        variant: "destructive",
      });
      // Handle field-specific errors if your action returns them
      if (result.errors) {
        Object.entries(result.errors).forEach(([field, errors]) => {
          form.setError(field as keyof ClubFormValues, { message: (errors as string[]).join(", ") });
        });
      }
    }
  }
  
  // Removed incorrect useState re-declaration
  // const [_, React] = useState(false); 
  // const { useState } = React;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the main details for the nightclub.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., The Velvet Lounge" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., 123 Nightlife Ave, Cityville" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/club-image.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location (Optional)</CardTitle>
            <CardDescription>Coordinates for map display. Leave blank if not applicable.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="latitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitude</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="e.g., 34.0522" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="longitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitude</FormLabel>
                  <FormControl>
                     <Input type="number" step="any" placeholder="e.g., -118.2437" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Crowd & Capacity</CardTitle>
            <CardDescription>Set current crowd count and capacity thresholds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="currentCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Crowd Count</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>This value is typically updated by the mobile app.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="thresholdLow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Low Threshold</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>Crowd count for 'Low' status.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="thresholdModerate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moderate Threshold</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>Crowd count for 'Moderate' status.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="thresholdPacked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Packed Threshold</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>Crowd count for 'Packed' status.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "add" ? "Add Club" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
