
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Icons } from "@/components/icons";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (authLoading || !isClient) {
      return;
    }
    if (!user) {
      router.replace(`/auth?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, authLoading, router, isClient, pathname]);

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

  return <>{children}</>;
}
