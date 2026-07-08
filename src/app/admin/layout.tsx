
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Icons } from "@/components/icons";
import { isAdminEmail } from "@/lib/adminEmails";

export default function AdminLayout({
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
      router.replace(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
    } else if (!isAdminEmail(user.email)) {
      router.replace("/dashboard?error=access_denied");
    }
  }, [user, authLoading, router, isClient]);

  if (authLoading || !isClient || !user || (user && !isAdminEmail(user.email))) {
    let title = "Loading Admin Section...";
    let description = "Please wait while we verify your access.";

    if (!authLoading && isClient) {
      if (!user) {
        title = "Authentication Required";
        description = "Redirecting to sign-in page...";
      } else if (!isAdminEmail(user.email)) {
        title = "Access Denied";
        description = "You do not have permission to access this section.";
      }
    }

    return (
      <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <PageHeader title={title} description={description} className="text-center" />
        {(authLoading || !isClient) && <Icons.spinner className="mt-4 h-8 w-8 animate-spin" />}
        {!authLoading && isClient && user && !isAdminEmail(user.email) && <Icons.warning className="mt-4 h-8 w-8 text-destructive" />}
        {!authLoading && isClient && !user && <Icons.logIn className="mt-4 h-8 w-8" />}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {children}
    </div>
  );
}
