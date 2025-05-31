
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
import { mapConfig } from '@/config';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  club?: ClubWithId | null;
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
        latitude: null,
        longitude: null,
      };

  const form = useForm<ClubFormValues>({
    resolver: zodResolver(clubFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const [mapApiKeyError, setMapApiKeyError] = useState<string | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(() => {
    const lat = defaultValues.latitude;
    const lng = defaultValues.longitude;
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
    return null;
  });

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(() => {
    const lat = defaultValues.latitude;
    const lng = defaultValues.longitude;
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
    return mapConfig.defaultCenter;
  });

  useEffect(() => {
    if (!mapConfig.apiKey) {
      setMapApiKeyError("Google Maps API Key is not configured. Map functionality will be disabled.");
    }
  }, []);

  useEffect(() => {
    const watchedLat = form.watch('latitude');
    const watchedLng = form.watch('longitude');
    if (typeof watchedLat === 'number' && typeof watchedLng === 'number' && !isNaN(watchedLat) && !isNaN(watchedLng)) {
      const newPos = { lat: watchedLat, lng: watchedLng };
      if (!markerPosition || markerPosition.lat !== newPos.lat || markerPosition.lng !== newPos.lng) {
        setMarkerPosition(newPos);
      }
      if (mapCenter.lat !== newPos.lat || mapCenter.lng !== newPos.lng) {
        setMapCenter(newPos);
      }
    } else if (markerPosition !== null) {
      setMarkerPosition(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch('latitude'), form.watch('longitude')]);


  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.detail.latLng) {
      const lat = parseFloat(event.detail.latLng.lat.toFixed(6));
      const lng = parseFloat(event.detail.latLng.lng.toFixed(6));
      form.setValue("latitude", lat, { shouldValidate: true });
      form.setValue("longitude", lng, { shouldValidate: true });
      // No need to call setMarkerPosition here, useEffect will handle it
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsSubmitting(true); // Indicate loading
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lng = parseFloat(position.coords.longitude.toFixed(6));
          form.setValue("latitude", lat, { shouldValidate: true });
          form.setValue("longitude", lng, { shouldValidate: true });
          // setMapCenter({ lat, lng }); // useEffect will also handle this
          toast({ title: "Location Updated", description: "Current location fetched successfully." });
          setIsSubmitting(false);
        },
        (error) => {
          console.error("Error getting current location:", error);
          toast({ title: "Location Error", description: `Could not fetch current location: ${error.message}`, variant: "destructive" });
          setIsSubmitting(false);
        },
        { timeout: 10000 } // Add a timeout for geolocation
      );
    } else {
      toast({ title: "Location Error", description: "Geolocation is not supported by this browser.", variant: "destructive" });
    }
  };


  async function onSubmit(data: ClubFormValues) {
    setIsSubmitting(true);
    const formData = new FormData();
    
    // Convert ClubFormValues to FormData, ensuring nullable fields are handled
    (Object.keys(data) as Array<keyof ClubFormValues>).forEach((key) => {
        const value = data[key];
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        } else if (key === 'latitude' || key === 'longitude') {
            // Explicitly do not append if null, actions/schema should handle missing optional fields
            // Or, if your action expects empty strings for nulls:
            // formData.append(key, ''); 
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
              Set coordinates by clicking the map, entering manually, or using current location.
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
            <Button type="button" variant="outline" onClick={handleUseCurrentLocation} className="w-full md:w-auto" disabled={isSubmitting}>
              {isSubmitting && navigator.geolocation ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.mapPin className="mr-2 h-4 w-4" />}
               Use Current Location
            </Button>

            {mapApiKeyError && (
              <Alert variant="destructive">
                <Icons.warning className="h-4 w-4" />
                <AlertTitle>Map Configuration Error</AlertTitle>
                <AlertDescription>{mapApiKeyError}</AlertDescription>
              </Alert>
            )}

            {!mapApiKeyError && mapConfig.apiKey && (
              <div className="h-96 w-full rounded-md border overflow-hidden">
                <APIProvider apiKey={mapConfig.apiKey}>
                  <Map
                    center={mapCenter}
                    zoom={markerPosition ? 15 : mapConfig.defaultZoom}
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                    onClick={handleMapClick}
                    mapId="club-form-map-123" // Ensure unique mapId
                    className="h-full w-full"
                  >
                    {markerPosition && <AdvancedMarker position={markerPosition} title="Selected Location" />}
                  </Map>
                </APIProvider>
              </div>
            )}
             {!mapConfig.apiKey && !mapApiKeyError && (
                <Alert variant="destructive">
                <Icons.warning className="h-4 w-4" />
                <AlertTitle>Map Display Disabled</AlertTitle>
                <AlertDescription>
                    Google Maps API Key is not configured. Please set the <code className="bg-primary/10 text-primary font-mono p-1 rounded-sm text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> environment variable. Map functionality will be unavailable.
                </AlertDescription>
                </Alert>
            )}
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
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
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

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && !navigator.geolocation ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "add" ? "Add Club" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}


    