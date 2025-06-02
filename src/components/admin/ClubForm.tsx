
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
import { Textarea } from "@/components/ui/textarea";
import type { ClubWithId } from "@/types";
import { addClubAction, updateClubAction } from "@/actions/clubActions";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { AdvancedMarkerDragEvent } from '@vis.gl/react-google-maps';
import { mapConfig } from '@/config';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Timestamp } from "firebase/firestore"; // Import Timestamp

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
  estimatedWaitTime: z.string().optional().or(z.literal('')),
  tags: z.string().optional(), // Comma-separated string
  musicGenres: z.string().optional(), // Comma-separated string
  tonightDJ: z.string().optional().or(z.literal('')),
  announcementMessage: z.string().optional().or(z.literal('')),
  announcementExpiresAt: z.string().optional().nullable(), // String input for date/time
}).refine(data => data.thresholdModerate > data.thresholdLow, {
  message: "Moderate threshold must be greater than Low threshold.",
  path: ["thresholdModerate"],
}).refine(data => data.thresholdPacked > data.thresholdModerate, {
  message: "Packed threshold must be greater than Moderate threshold.",
  path: ["thresholdPacked"],
});


type ClubFormValues = z.infer<typeof clubFormSchema>;

interface ClubFormProps {
  club?: ClubWithId | null;
  mode: "add" | "edit";
}

// Helper to format Date/Timestamp to string for input field
const formatDateForInput = (date: Timestamp | Date | string | null | undefined): string => {
  if (!date) return '';
  try {
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '';
    // Format to YYYY-MM-DDTHH:mm (datetime-local input format)
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
};


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
        estimatedWaitTime: club.estimatedWaitTime || '',
        tags: club.tags?.join(', ') || '',
        musicGenres: club.musicGenres?.join(', ') || '',
        tonightDJ: club.tonightDJ || '',
        announcementMessage: club.announcementMessage || '',
        announcementExpiresAt: club.announcementExpiresAt ? formatDateForInput(club.announcementExpiresAt) : '',
      }
    : {
        name: "",
        address: "",
        currentCount: 0,
        thresholdLow: 50,
        thresholdModerate: 100,
        thresholdPacked: 150,
        imageUrl: '',
        estimatedWaitTime: '',
        tags: '',
        musicGenres: '',
        tonightDJ: '',
        announcementMessage: '',
        announcementExpiresAt: '',
        latitude: null,
        longitude: null,
      };

  const form = useForm<ClubFormValues>({
    resolver: zodResolver(clubFormSchema),
    defaultValues,
    mode: "onChange",
  });
  
  const getInitialMarkerPosition = () => {
    const lat = form.getValues('latitude');
    const lng = form.getValues('longitude');
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
    return null;
  };
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(getInitialMarkerPosition());

  const getInitialMapCenter = () => {
    const lat = form.getValues('latitude');
    const lng = form.getValues('longitude');
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
    return mapConfig.defaultCenter;
  };
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(getInitialMapCenter());
  
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'latitude' || name === 'longitude') {
        const lat = value.latitude;
        const lng = value.longitude;
        if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
          const newPos = { lat, lng };
          setMarkerPosition(newPos);
          setMapCenter(newPos); 
        } else {
          setMarkerPosition(null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);


  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.detail.latLng) {
      const lat = parseFloat(event.detail.latLng.lat.toFixed(6));
      const lng = parseFloat(event.detail.latLng.lng.toFixed(6));
      form.setValue("latitude", lat, { shouldValidate: true, shouldDirty: true });
      form.setValue("longitude", lng, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleMarkerDragEnd = (event: AdvancedMarkerDragEvent) => {
    // Defensive check for event, event.marker, and event.marker.position
    if (!event || !event.marker || !event.marker.position) {
      console.warn("Marker drag end event is missing 'event', 'marker', or 'marker.position'. Event:", event);
      return;
    }

    const position = event.marker.position;
    let latValue: number | undefined;
    let lngValue: number | undefined;

    // Check if position is a google.maps.LatLng object (has lat() and lng() methods)
    if (typeof (position as google.maps.LatLng).lat === 'function' && 
        typeof (position as google.maps.LatLng).lng === 'function') {
      latValue = (position as google.maps.LatLng).lat();
      lngValue = (position as google.maps.LatLng).lng();
    } 
    // Check if position is a google.maps.LatLngLiteral (has lat and lng properties as numbers)
    else if (typeof (position as google.maps.LatLngLiteral).lat === 'number' && 
             typeof (position as google.maps.LatLngLiteral).lng === 'number') {
      latValue = (position as google.maps.LatLngLiteral).lat;
      lngValue = (position as google.maps.LatLngLiteral).lng;
    }

    if (typeof latValue === 'number' && typeof lngValue === 'number') {
      form.setValue("latitude", parseFloat(latValue.toFixed(6)), { shouldValidate: true, shouldDirty: true });
      form.setValue("longitude", parseFloat(lngValue.toFixed(6)), { shouldValidate: true, shouldDirty: true });
    } else {
      console.warn("Marker drag end: position format not recognized or lat/lng are not numbers.", position);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsSubmitting(true); 
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lng = parseFloat(position.coords.longitude.toFixed(6));
          form.setValue("latitude", lat, { shouldValidate: true, shouldDirty: true });
          form.setValue("longitude", lng, { shouldValidate: true, shouldDirty: true });
          toast({ title: "Location Updated", description: "Current location fetched successfully." });
          setIsSubmitting(false);
        },
        (error) => {
          console.error("Error getting current location:", error);
          toast({ title: "Location Error", description: `Could not fetch current location: ${error.message}`, variant: "destructive" });
          setIsSubmitting(false);
        },
        { timeout: 10000 } 
      );
    } else {
      toast({ title: "Location Error", description: "Geolocation is not supported by this browser.", variant: "destructive" });
    }
  };


  async function onSubmit(data: ClubFormValues) {
    setIsSubmitting(true);
    const formData = new FormData();
    
    (Object.keys(data) as Array<keyof ClubFormValues>).forEach((key) => {
        const value = data[key];
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        } else if (key === 'announcementExpiresAt' && value === null) {
            formData.append(key, ''); // Send empty string if null for Zod transform
        }
    });
    
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
      router.refresh();
    } else {
      toast({
        title: `Error ${mode === "edit" ? "Updating" : "Adding"} Club`,
        description: result.error || "An unexpected error occurred.",
        variant: "destructive",
      });
      if (result.errors) {
        Object.entries(result.errors).forEach(([field, errors]) => {
          form.setError(field as keyof ClubFormValues, { message: (errors as string[]).join(", ") });
        });
      }
    }
  }
  
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
            <CardTitle>Location</CardTitle>
            <CardDescription>
              Click map, drag pin, enter manually, or use current location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            <Button type="button" variant="outline" onClick={handleUseCurrentLocation} className="w-full md:w-auto" disabled={isSubmitting && !!navigator.geolocation}>
              {isSubmitting && navigator.geolocation ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.mapPin className="mr-2 h-4 w-4" />}
               Use Current Location
            </Button>
            
            {!mapConfig.apiKey && (
                <Alert variant="destructive">
                  <Icons.warning className="h-4 w-4" />
                  <AlertTitle>Map Display Disabled</AlertTitle>
                  <AlertDescription>
                      Google Maps API Key is not configured. Please ensure the <code className="bg-primary/10 text-primary font-mono p-1 rounded-sm text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> environment variable is correctly set in your <code className="bg-primary/10 text-primary font-mono p-1 rounded-sm text-xs">.env</code> file and that your development server has been restarted. Map functionality will be unavailable.
                  </AlertDescription>
                </Alert>
            )}

            {mapConfig.apiKey && (
              <div className="h-96 w-full rounded-md border overflow-hidden">
                <APIProvider apiKey={mapConfig.apiKey}>
                  <Map
                    center={mapCenter}
                    zoom={markerPosition ? 15 : mapConfig.defaultZoom}
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                    onClick={handleMapClick}
                    mapId="club-form-map-draggable" 
                    className="h-full w-full"
                  >
                    {markerPosition && (
                        <AdvancedMarker 
                            position={markerPosition} 
                            title="Selected Location" 
                            draggable={true}
                            onDragEnd={handleMarkerDragEnd}
                        />
                    )}
                  </Map>
                </APIProvider>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Crowd & Capacity</CardTitle>
            <CardDescription>Set current crowd count, thresholds, and estimated wait time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="currentCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Crowd Count</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                  </FormControl>
                  <FormDescription>This value can be manually overridden here or updated by other mechanisms.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimatedWaitTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Wait Time (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 15-20 minutes, No wait" {...field} />
                  </FormControl>
                  <FormDescription>Manually set the estimated wait time to be displayed to users.</FormDescription>
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
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
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
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
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
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                  </FormControl>
                  <FormDescription>Crowd count for 'Packed' status.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details & Promotion</CardTitle>
            <CardDescription>Add tags, music genres, DJ info, and announcements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional, comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., rooftop, free entry, student night" {...field} />
                  </FormControl>
                  <FormDescription>Help users filter and find your club.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="musicGenres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Music Genres (Optional, comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Afrobeats, Amapiano, Hip Hop" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tonightDJ"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tonight's DJ (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., DJ Pulse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="announcementMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Announcement (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Happy Hour 8-10 PM! 2-for-1 on selected cocktails." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="announcementExpiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Announcement Expiry (Optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormDescription>When this announcement should no longer be shown.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>


        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "add" ? "Add Club" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

