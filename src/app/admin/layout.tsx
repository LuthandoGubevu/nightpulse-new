
"use client";

import { useEffect, useState } from "react"; // Added useState for window check
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Icons } from "@/components/icons";

const ADMIN_EMAIL = "lgubevu@gmail.com";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Indicate that component has mounted and window is available
  }, []);

  useEffect(() => {
    if (authLoading || !isClient) {
      return; // Wait for auth state and client mount
    }

    if (!user) {
      // Not logged in, redirect to auth page with a redirect back to the attempted admin path
      router.replace(`/auth?redirect=${window.location.pathname}`);
    } else if (user.email !== ADMIN_EMAIL) {
      // Logged in, but not the admin
      router.replace("/dashboard?error=access_denied"); // Redirect to dashboard or a dedicated access denied page
    }
  }, [user, authLoading, router, isClient]);

  if (authLoading || !isClient || !user || (user && user.email !== ADMIN_EMAIL)) {
    let title = "Loading Admin Section...";
    let description = "Please wait while we verify your access.";

    if (!authLoading && isClient) {
        if (!user) {
            title = "Authentication Required";
            description = "Redirecting to sign-in page...";
        } else if (user.email !== ADMIN_EMAIL) {
            title = "Access Denied";
            description = "You do not have permission to access this section.";
        }
    }
    
    return (
      <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]"> {/* Adjusted min-height */}
        <PageHeader title={title} description={description} className="text-center" />
        {(authLoading || !isClient) && <Icons.spinner className="mt-4 h-8 w-8 animate-spin" />}
        {!authLoading && isClient && user && user.email !== ADMIN_EMAIL && <Icons.warning className="mt-4 h-8 w-8 text-destructive" />}
        {!authLoading && isClient && !user && <Icons.logIn className="mt-4 h-8 w-8" />}
      </div>
    );
  }

  // User is authenticated, is the admin, and component is mounted on client
  return (
    <div className="container mx-auto py-8 px-4">
      {children}
    </div>
  );
}
