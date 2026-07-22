"use client";

import { useRef, useState } from "react";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { auth, storage } from "@/lib/firebase";
import { postStoryAction } from "@/actions/storyActions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StoryComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted: () => void;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // must stay in sync with storage.rules' storyMedia cap

// Phone-camera photos routinely run 5-15MB, well past storage.rules' cap — which the
// Storage SDK tends to report as an opaque "storage/unknown" rather than a clear
// too-large error. Downscaling client-side avoids hitting that limit in the first
// place, rather than just producing a clearer error after the fact.
async function compressImageForUpload(file: File, maxDimension = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Could not process image.");
  return blob;
}

const PRESET_COLORS = [
  "#7c3aed", // purple
  "#db2777", // pink
  "#4338ca", // indigo
  "#0891b2", // cyan
  "#059669", // emerald
  "#c2410c", // orange
];

export function StoryComposerDialog({ open, onOpenChange, onPosted }: StoryComposerDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"image" | "text">("image");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [statusText, setStatusText] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(PRESET_COLORS[0]);
  const [isPosting, setIsPosting] = useState(false);

  const reset = () => {
    setMode("image");
    setPhotoFile(null);
    setPhotoPreview(null);
    setCaption("");
    setStatusText("");
    setBackgroundColor(PRESET_COLORS[0]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePost = async () => {
    const uid = auth?.currentUser?.uid;
    const idToken = await auth?.currentUser?.getIdToken();
    if (!uid || !idToken) {
      toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
      return;
    }

    if (mode === "image" && !photoFile) {
      toast({ title: "Add a photo", description: "Choose a photo to post to your story.", variant: "destructive" });
      return;
    }
    if (mode === "text" && !statusText.trim()) {
      toast({ title: "Write something", description: "Add a status to post.", variant: "destructive" });
      return;
    }

    setIsPosting(true);
    try {
      let result;
      if (mode === "image") {
        if (!storage) throw new Error("Storage is not available.");

        let uploadBlob: Blob = photoFile!;
        try {
          uploadBlob = await compressImageForUpload(photoFile!);
        } catch {
          // Fall back to the original file if compression fails for any reason
          // (unsupported format, etc.) — the size check below still guards it.
        }
        if (uploadBlob.size > MAX_UPLOAD_BYTES) {
          toast({
            title: "Photo too large",
            description: "Please choose a smaller photo (under 5MB) and try again.",
            variant: "destructive",
          });
          return;
        }

        const path = `storyMedia/${uid}/${crypto.randomUUID()}.jpg`;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, uploadBlob, { contentType: "image/jpeg" });
        result = await postStoryAction(idToken, {
          mediaType: "image",
          mediaPath: fileRef.fullPath,
          text: caption.trim() || undefined,
        });
      } else {
        result = await postStoryAction(idToken, {
          mediaType: "text",
          text: statusText.trim(),
          backgroundColor,
        });
      }

      if (!result?.success) {
        toast({
          title: "Couldn't post",
          description: result?.error || "Something went wrong — please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Posted!", description: "Your story is live for 24 hours." });
      onPosted();
      handleOpenChange(false);
    } catch (error: any) {
      toast({ title: "Couldn't post", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="bg-gradient-vy-purple-pink bg-clip-text text-transparent">
            Add to your story
          </DialogTitle>
          <DialogDescription>
            Only shows to your matches, and disappears after 24 hours.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "image" | "text")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image">Photo</TabsTrigger>
            <TabsTrigger value="text">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-input bg-white/5"
            >
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Story preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icons.camera className="h-8 w-8" />
                  <span className="text-sm">Tap to choose a photo</span>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              placeholder="Add a caption (optional)"
            />
          </TabsContent>

          <TabsContent value="text" className="space-y-3">
            <div
              className="flex h-56 w-full items-center justify-center rounded-lg p-6 text-center"
              style={{ backgroundColor }}
            >
              <p className="text-lg font-semibold text-white break-words">
                {statusText || "Your status will look like this"}
              </p>
            </div>
            <Textarea
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              maxLength={200}
              placeholder="What's the vybe tonight?"
            />
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Background color ${color}`}
                  onClick={() => setBackgroundColor(color)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    backgroundColor === color ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="vy" onClick={handlePost} disabled={isPosting} className="w-full sm:w-auto">
            {isPosting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Post to your story
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
