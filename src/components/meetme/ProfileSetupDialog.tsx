"use client";

import { useEffect, useRef, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import type { Gender, LookingFor } from "@/types";

interface ProfileSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDisplayName?: string;
  initialPhotoUrl?: string | null;
  initialAge?: number;
  initialGender?: Gender;
  initialLookingFor?: LookingFor;
  onSaved: (profile: { displayName: string; photoUrl: string | null; lookingFor: LookingFor }) => void;
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "man", label: "Man" },
  { value: "woman", label: "Woman" },
  { value: "non-binary", label: "Non-binary" },
];

export function ProfileSetupDialog({
  open,
  onOpenChange,
  initialDisplayName,
  initialPhotoUrl,
  initialAge,
  initialGender,
  initialLookingFor,
  onSaved,
}: ProfileSetupDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl ?? null);
  const [age, setAge] = useState(initialAge ? String(initialAge) : "");
  const [gender, setGender] = useState<Gender | undefined>(initialGender);
  const [lookingFor, setLookingFor] = useState<LookingFor | undefined>(initialLookingFor);
  const [isSaving, setIsSaving] = useState(false);

  // The caller fetches any existing profile asynchronously and only knows the real
  // initial* values after this dialog has already mounted, so the useState
  // initializers above only ever see them on a lucky first render. Re-sync from props
  // every time the dialog actually opens instead.
  useEffect(() => {
    if (open) {
      setDisplayName(initialDisplayName ?? "");
      setPhotoFile(null);
      setPhotoPreview(initialPhotoUrl ?? null);
      setAge(initialAge ? String(initialAge) : "");
      setGender(initialGender);
      setLookingFor(initialLookingFor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

    const ageNum = parseInt(age, 10);
    if (!Number.isFinite(ageNum) || ageNum < 18) {
      toast({ title: "Age required", description: "You must be 18 or older to use Meet Me.", variant: "destructive" });
      return;
    }

    if (!gender) {
      toast({ title: "Gender required", description: "Select a gender to continue.", variant: "destructive" });
      return;
    }

    if (!lookingFor) {
      toast({ title: "Pick one", description: "Select whether you're looking for friends or love.", variant: "destructive" });
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

      const result = await saveProfileAction(idToken, {
        displayName: trimmedName,
        photoUrl,
        age: ageNum,
        gender,
        lookingFor,
      });
      if (!result.success) {
        toast({ title: "Couldn't save profile", description: result.error || "An unexpected error occurred.", variant: "destructive" });
        return;
      }

      onSaved({ displayName: trimmedName, photoUrl, lookingFor });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Couldn't save profile", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="bg-gradient-vy-purple-pink bg-clip-text text-transparent">Set up your Meet Me profile</DialogTitle>
          <DialogDescription>
            Your name, photo, and age are shown to others who've also opted in at the venue. You'll choose what you're looking for next — and you can change that every time you check in somewhere new.
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

        <div className="space-y-2">
          <Label htmlFor="meetme-age">Age</Label>
          <Input
            id="meetme-age"
            type="number"
            inputMode="numeric"
            min={18}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="18+"
          />
        </div>

        <div className="space-y-2">
          <Label>Gender</Label>
          <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Looking for tonight</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={lookingFor === "friends" ? "vy" : "outline"}
              onClick={() => setLookingFor("friends")}
            >
              <Icons.usersRound className="mr-1.5 h-4 w-4" /> Friends
            </Button>
            <Button
              type="button"
              variant={lookingFor === "love" ? "vy" : "outline"}
              onClick={() => setLookingFor("love")}
            >
              <Icons.heart className="mr-1.5 h-4 w-4" /> Love
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="vy" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Save &amp; continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
