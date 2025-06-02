
"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "@/components/nav/SiteHeader";
import type React from "react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const showHeader = pathname !== "/";

  return (
    <div className="relative flex min-h-screen flex-col">
      {showHeader && <SiteHeader />}
      <main className="flex-1">{children}</main>
    </div>
  );
}
