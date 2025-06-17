
"use client";

import { useEffect, useState } from "react"; // useState for window check is fine
// import { useRouter } from "next/navigation"; // No longer needed for auth redirection
// import { useAuth } from "@/hooks/useAuth"; // Auth hook no longer directly used for redirection here
import { PageHeader } from "@/components/common/PageHeader";
import { Icons } from "@/components/icons";

// const ADMIN_EMAIL = "lgubevu@gmail.com"; // This logic is removed for now

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const { user, loading: authLoading } = useAuth(); // Auth state no longer used for redirection
  // const router = useRouter(); // Router no longer used for auth redirection
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); 
  }, []);

  // The entire useEffect block for authentication and redirection is removed.
  // useEffect(() => {
  //   if (authLoading || !isClient) {
  //     return; 
  //   }
  //   if (!user) {
  //     router.replace(`/auth?redirect=${window.location.pathname}`);
  //   } else if (user.email !== ADMIN_EMAIL) {
  //     router.replace("/dashboard?error=access_denied"); 
  //   }
  // }, [user, authLoading, router, isClient]);

  // The loading/access denied state is removed as auth is removed.
  // if (authLoading || !isClient || !user || (user && user.email !== ADMIN_EMAIL)) {
  //   let title = "Loading Admin Section...";
  //   let description = "Please wait while we verify your access.";

  //   if (!authLoading && isClient) {
  //       if (!user) {
  //           title = "Authentication Required";
  //           description = "Redirecting to sign-in page...";
  //       } else if (user.email !== ADMIN_EMAIL) {
  //           title = "Access Denied";
  //           description = "You do not have permission to access this section.";
  //       }
  //   }
    
  //   return (
  //     <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
  //       <PageHeader title={title} description={description} className="text-center" />
  //       {(authLoading || !isClient) && <Icons.spinner className="mt-4 h-8 w-8 animate-spin" />}
  //       {!authLoading && isClient && user && user.email !== ADMIN_EMAIL && <Icons.warning className="mt-4 h-8 w-8 text-destructive" />}
  //       {!authLoading && isClient && !user && <Icons.logIn className="mt-4 h-8 w-8" />}
  //     </div>
  //   );
  // }

  // If not client-side yet, show a basic loading to avoid hydration issues if any.
  if (!isClient) {
    return (
      <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <PageHeader title="Loading Admin Section..." description="Please wait." className="text-center" />
        <Icons.spinner className="mt-4 h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Admin section is now directly accessible
  return (
    <div className="container mx-auto py-8 px-4">
      {children}
    </div>
  );
}
