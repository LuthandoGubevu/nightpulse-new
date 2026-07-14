"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
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
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

interface ReportUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUid: string;
  reportedName: string;
  clubId?: string | null;
  conversationId?: string | null;
}

export function ReportUserDialog({
  open,
  onOpenChange,
  reportedUid,
  reportedName,
  clubId = null,
  conversationId = null,
}: ReportUserDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast({ title: "Tell us what happened", description: "A short reason helps our team review this.", variant: "destructive" });
      return;
    }
    const uid = auth?.currentUser?.uid;
    if (!uid || !firestore) {
      toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, "reports"), {
        reporterUid: uid,
        reportedUid,
        clubId,
        conversationId,
        reason: trimmedReason,
        createdAt: serverTimestamp(),
        status: "open",
      });
      toast({ title: "Report submitted", description: "Thanks — our team will review this." });
      setReason("");
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Couldn't submit report", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {reportedName}</DialogTitle>
          <DialogDescription>
            Let us know what happened. Reports are reviewed by our team, not shared with the reported user.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What happened?"
          maxLength={1000}
          rows={4}
        />
        <DialogFooter>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
