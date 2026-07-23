"use client";

import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { getStoryMediaUrlAction, deleteStoryAction, type SerializedStory } from "@/actions/storyActions";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

const STORY_DURATION_MS = 5000;
const TICK_MS = 50;

interface StoryViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorUid: string;
  authorName: string;
  authorPhotoUrl: string | null;
  stories: SerializedStory[];
  initialIndex?: number;
  isOwnStory?: boolean;
  onDeleted?: (storyId: string) => void;
}

// Full-screen tap/auto-advance viewer — DialogContent already renders its own close
// button (top-right); this reuses that instead of adding a second one, and pads the
// header row so it doesn't overlap.
export function StoryViewer({
  open,
  onOpenChange,
  authorUid,
  authorName,
  authorPhotoUrl,
  stories,
  initialIndex = 0,
  isOwnStory = false,
  onDeleted,
}: StoryViewerProps) {
  const { toast } = useToast();
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const mediaCacheRef = useRef<Map<string, string>>(new Map());

  const current = stories[index] ?? null;

  useEffect(() => {
    if (open) {
      setIndex(Math.min(initialIndex, Math.max(stories.length - 1, 0)));
      setProgress(0);
    } else {
      mediaCacheRef.current.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mint a signed URL for the current photo story — never a stored/reused download URL.
  useEffect(() => {
    if (!open || !current || current.mediaType !== "image" || !current.mediaPath) {
      setMediaUrl(null);
      return;
    }
    const cached = mediaCacheRef.current.get(current.id);
    if (cached) {
      setMediaUrl(cached);
      setMediaError(false);
      return;
    }
    let cancelled = false;
    setLoadingMedia(true);
    setMediaUrl(null);
    setMediaError(false);
    (async () => {
      try {
        const idToken = await auth?.currentUser?.getIdToken();
        if (!idToken) return;
        const result = await getStoryMediaUrlAction(idToken, authorUid, current.id);
        if (cancelled) return;
        if (result?.success && result.url) {
          mediaCacheRef.current.set(current.id, result.url);
          setMediaUrl(result.url);
        } else {
          toast({
            title: "Couldn't load photo",
            description: result?.error || "Something went wrong — please try again.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        if (!cancelled) {
          toast({ title: "Couldn't load photo", description: error.message, variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoadingMedia(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, current, authorUid, toast]);

  const goNext = () => {
    if (index >= stories.length - 1) {
      onOpenChange(false);
      return;
    }
    setIndex((i) => i + 1);
    setProgress(0);
  };

  const goPrev = () => {
    if (index === 0) {
      setProgress(0);
      return;
    }
    setIndex((i) => i - 1);
    setProgress(0);
  };

  // Auto-advance — paused while the photo is still loading or the viewer is held down.
  useEffect(() => {
    if (!open || paused || loadingMedia) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + (TICK_MS / STORY_DURATION_MS) * 100;
        if (next >= 100) {
          goNext();
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paused, loadingMedia, index]);

  const handleDelete = async () => {
    if (!current) return;
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) return;
    setIsDeleting(true);
    try {
      const result = await deleteStoryAction(idToken, current.id);
      if (result?.success) {
        onDeleted?.(current.id);
        if (stories.length <= 1) {
          onOpenChange(false);
        } else {
          goNext();
        }
      } else {
        toast({
          title: "Couldn't delete",
          description: result?.error || "Something went wrong — please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 border-none bg-black overflow-hidden sm:rounded-none">
        <DialogTitle className="sr-only">{authorName}&apos;s story</DialogTitle>
        <div className="relative flex h-full w-full flex-col">
          <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-2 pr-12">
            {stories.map((s, i) => (
              <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full bg-white transition-[width] duration-75 ease-linear"
                  style={{ width: `${i < index ? 100 : i === index ? progress : 0}%` }}
                />
              </div>
            ))}
          </div>

          <div className="absolute inset-x-0 top-4 z-20 flex items-center gap-2 px-3 pt-3 pr-14">
            <Avatar className="h-8 w-8 border border-white/40">
              {authorPhotoUrl ? <AvatarImage src={authorPhotoUrl} alt={authorName} /> : null}
              <AvatarFallback>
                <Icons.userRound className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm font-medium text-white truncate">{authorName}</span>
            {isOwnStory && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label="Delete story"
                className="rounded-full p-1.5 text-white/80 hover:bg-white/10"
              >
                {isDeleting ? <Icons.spinner className="h-4 w-4 animate-spin" /> : <Icons.trash className="h-4 w-4" />}
              </button>
            )}
          </div>

          <div
            className="relative flex flex-1 items-center justify-center"
            style={current.mediaType === "text" ? { backgroundColor: current.backgroundColor ?? "#7c3aed" } : undefined}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
          >
            {current.mediaType === "text" ? (
              <p className="max-w-md break-words px-8 text-center text-2xl font-semibold text-white">
                {current.text}
              </p>
            ) : mediaError ? (
              <div className="flex flex-col items-center gap-2 text-white/70">
                <Icons.imageOff className="h-8 w-8" />
                <span className="text-sm">Couldn&apos;t display this photo</span>
              </div>
            ) : loadingMedia || !mediaUrl ? (
              <Icons.spinner className="h-8 w-8 animate-spin text-white/70" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl}
                alt=""
                className="max-h-full max-w-full object-contain"
                onError={() => setMediaError(true)}
              />
            )}

            {current.mediaType === "image" && current.text && (
              <p className="absolute bottom-6 left-0 right-0 px-6 text-center text-sm text-white/90">
                {current.text}
              </p>
            )}

            <button type="button" aria-label="Previous story" onClick={goPrev} className="absolute inset-y-0 left-0 w-1/3" />
            <button type="button" aria-label="Next story" onClick={goNext} className="absolute inset-y-0 right-0 w-2/3" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
