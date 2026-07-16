
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Icons } from "@/components/icons";
import { MatchNotificationListener } from "@/components/meetme/MatchNotificationListener";
import { AgePromptDialog } from "@/components/common/AgePromptDialog";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (authLoading || !isClient) {
      return;
    }
    if (!user) {
      router.replace(`/auth?redirect=${encodeURIComponent("/dashboard")}`);
    }
  }, [user, authLoading, router, isClient]);

  if (authLoading || !isClient || !user) {
    return (
      <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <PageHeader
          title={!authLoading && isClient ? "Sign In Required" : "Loading..."}
          description={!authLoading && isClient ? "Redirecting to sign-in page..." : "Please wait."}
          className="text-center"
        />
        <Icons.spinner className="mt-4 h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <MatchNotificationListener />
      <AgePromptDialog />
      {children}
    </>
  );
}
