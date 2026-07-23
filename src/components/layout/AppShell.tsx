
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { siteConfig } from "@/config/site";
import { Icons } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { auth, firestore } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isAdminEmail } from "@/lib/adminEmails";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { isMobile, setOpenMobile } = useSidebar();
  usePresenceHeartbeat(user?.uid);

  // "Interested" nav badge — unseen count of incoming Meet Me interest since the user
  // last opened /dashboard/interested (see InterestedPage, which writes
  // interestsLastSeenAt on mount). Live on both halves so the badge clears immediately
  // after a visit, without needing a full reload.
  const [interestsLastSeenAt, setInterestsLastSeenAt] = useState<any>(null);
  const [interestedBadgeCount, setInterestedBadgeCount] = useState(0);

  useEffect(() => {
    if (!user || !firestore) {
      setInterestsLastSeenAt(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(firestore, "users", user.uid), (snap) => {
      setInterestsLastSeenAt(snap.data()?.interestsLastSeenAt ?? null);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !firestore) {
      setInterestedBadgeCount(0);
      return;
    }
    const q = query(collection(firestore, "interests"), where("toUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const thresholdMillis = interestsLastSeenAt?.toMillis?.() ?? 0;
      const count = snapshot.docs.filter((d) => (d.data().createdAt?.toMillis?.() ?? 0) > thresholdMillis).length;
      setInterestedBadgeCount(count);
    });
    return () => unsubscribe();
  }, [user, interestsLastSeenAt]);

  const closeSidebarOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleSignOut = async () => {
    if (!auth) {
      toast({ title: "Error", description: "Firebase Auth not initialized.", variant: "destructive" });
      return;
    }
    closeSidebarOnMobile();
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push("/");
      router.refresh();
    } catch (error: any) {
      const errorMessage = error.message || "Could not sign out.";
      toast({ title: "Sign Out Failed", description: errorMessage, variant: "destructive" });
    }
  };

  const mainNavItems = useMemo(() => siteConfig.mainNav.filter(item => {
    if (item.href === "/auth") return false; // Always hide auth link

    if (item.href === "/admin/clubs" || item.href === "/admin/analytics") {
      return !authLoading && !!user && isAdminEmail(user.email);
    }
    if (item.href === "/dashboard" || item.href?.startsWith("/dashboard/")) {
      return !authLoading && !!user;
    }
    return true; // Home (and anything else ungated) always shows
  }), [user, authLoading]);

  const showFullAppLayout = pathname !== "/" && pathname !== "/auth" && pathname !== "/terms";

  if (!showFullAppLayout) {
    return (
      <main className="flex-1">
        {children}
      </main>
    );
  }

  return (
      <div className="flex min-h-screen bg-background">
        <Sidebar
          side="left"
          collapsible="icon"
          variant="sidebar"
          className="border-r border-white/10"
        >
          <SidebarHeader className="p-4">
            <Link href="/dashboard" className="flex items-center space-x-2" onClick={closeSidebarOnMobile}>
              <Icons.logo className="h-7 w-7 text-vy-purple" />
              <span className="font-bold font-headline text-lg group-data-[collapsible=icon]:hidden bg-gradient-vy-purple-pink bg-clip-text text-transparent">
                {siteConfig.name}
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-2 flex-grow">
            <SidebarMenu>
              {mainNavItems.map((item) => {
                if (item.href) {
                  const IconComponent = item.icon ? Icons[item.icon] : null;
                  const isItemActive = pathname === item.href ||
                                     (item.href?.startsWith("/admin") && pathname.startsWith(item.href)) ||
                                     (item.href === "/dashboard" && pathname === "/dashboard");

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isItemActive}
                        tooltip={item.title}
                        className="w-full justify-start data-[active=true]:!bg-gradient-vy-purple-pink data-[active=true]:!text-white data-[active=true]:shadow-glow-vy"
                      >
                        <Link href={item.href} onClick={closeSidebarOnMobile}>
                          {IconComponent && <IconComponent className="h-4 w-4" />}
                          <span className="group-data-[collapsible=icon]:hidden flex-1">{item.title}</span>
                          {item.href === "/dashboard/interested" && interestedBadgeCount > 0 && (
                            <span className="group-data-[collapsible=icon]:hidden ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-vy-purple-pink px-1.5 text-[11px] font-bold text-white">
                              {interestedBadgeCount}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return null;
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-2 mt-auto border-t border-white/10">
            <div className="flex flex-col gap-2">
              {authLoading ? (
                <div className="flex items-center gap-2 px-2">
                  <Icons.spinner className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : user ? (
                <div className="flex items-center justify-between gap-2 px-2">
                  <div className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback>
                        {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm text-muted-foreground">
                      {user.displayName || user.email}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="group-data-[collapsible=icon]:mx-auto"
                  >
                    <Icons.logOut className="h-4 w-4" />
                    <span className="sr-only">Sign Out</span>
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" asChild className="w-full justify-start group-data-[collapsible=icon]:justify-center">
                  <Link href="/auth" onClick={closeSidebarOnMobile}>
                    <Icons.logIn className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Sign In</span>
                  </Link>
                </Button>
              )}
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:justify-start">
            <div className="md:hidden">
              <Link href="/dashboard" className="flex items-center space-x-2">
                  <Icons.logo className="h-6 w-6 text-vy-purple" />
                  <span className="font-bold font-headline text-base bg-gradient-vy-purple-pink bg-clip-text text-transparent">{siteConfig.name}</span>
              </Link>
            </div>
             <SidebarTrigger className="md:hidden ml-auto" />
             <SidebarTrigger className="hidden md:flex mr-4" />
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
  );
}
