"use client";

import { useRef, useState } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "@/lib/firebase";
import { saveProfileAction } from "@/actions/profileActions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

interface ProfileSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDisplayName?: string;
  initialPhotoUrl?: string | null;
  onSaved: (profile: { displayName: string; photoUrl: string | null }) => void;
}

export function ProfileSetupDialog({
  open,
  onOpenChange,
  initialDisplayName,
  initialPhotoUrl,
  onSaved,
}: ProfileSetupDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl ?? null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast({ title: "Name required", description: "Enter a name so others can recognize you.", variant: "destructive" });
      return;
    }

    const uid = auth?.currentUser?.uid;
    const idToken = await auth?.currentUser?.getIdToken();
    if (!uid || !idToken) {
      toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      let photoUrl = initialPhotoUrl ?? null;
      if (photoFile) {
        if (!storage) throw new Error("Storage is not available.");
        const fileRef = storageRef(storage, `profilePhotos/${uid}/photo.jpg`);
        await uploadBytes(fileRef, photoFile, { contentType: photoFile.type });
        photoUrl = await getDownloadURL(fileRef);
      }

      const result = await saveProfileAction(idToken, { displayName: trimmedName, photoUrl });
      if (!result.success) {
        toast({ title: "Couldn't save profile", description: result.error || "An unexpected error occurred.", variant: "destructive" });
        return;
      }

      onSaved({ displayName: trimmedName, photoUrl });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Couldn't save profile", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up your Meet Me profile</DialogTitle>
          <DialogDescription>
            Just a name and one photo — this is all anyone else at the venue will see.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
            aria-label="Choose profile photo"
          >
            <Avatar className="h-24 w-24 border">
              {photoPreview ? <AvatarImage src={photoPreview} alt="Profile preview" /> : null}
              <AvatarFallback>
                <Icons.userRound className="h-10 w-10 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <Icons.camera className="h-6 w-6 text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button type="button" variant="link" size="sm" onClick={() => fileInputRef.current?.click()}>
            {photoPreview ? "Change photo" : "Add a photo"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meetme-display-name">Display name</Label>
          <Input
            id="meetme-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder="What should people call you?"
          />
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Save &amp; continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
