
"use client";

import type React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
} from "@/components/ui/sidebar";
import { siteConfig } from "@/config/site";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"; // Ensure cn is imported

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    if (!auth) {
      toast({ title: "Error", description: "Firebase Auth not initialized.", variant: "destructive" });
      return;
    }
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

  const mainNavItems = siteConfig.mainNav.filter(item => {
    if (item.href === "/") return true;

    if (item.href === "/dashboard" || item.href === "/admin/clubs") {
      return !!user;
    }
    if (item.href === "/auth") {
        return !user;
    }
    return true;
  });

  const showFullAppLayout = pathname !== "/" && pathname !== "/auth";

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
        className="border-r"
      >
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Icons.logo className="h-7 w-7 text-primary" />
            <span className="font-bold font-headline text-lg group-data-[collapsible=icon]:hidden">
              {siteConfig.name}
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="p-2 flex-grow">
          <SidebarMenu>
            {mainNavItems.map((item) => {
              // Ensure "Home" link (landing page) is hidden if user is logged in
              if (item.href && ! (item.href === "/" && user) ) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href || (item.href !== "/" && item.href !== "/dashboard" && pathname.startsWith(item.href)) || (item.href === "/dashboard" && pathname === "/dashboard")}
                      tooltip={item.title}
                      className="w-full justify-start"
                    >
                      <Link href={item.href}>
                        {item.icon && <Icons[item.icon] className="h-4 w-4" />}
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }
              return null; // Explicitly return null if condition is not met
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-2 mt-auto border-t">
          <div className="flex flex-col gap-2">
             <div className="group-data-[collapsible=icon]:mx-auto">
               <ThemeToggle />
             </div>

            {!authLoading && (
              user ? (
                <SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out" className="w-full justify-start">
                  <Icons.logOut className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton asChild tooltip="Sign In" className="w-full justify-start">
                  <Link href="/auth">
                    <Icons.logIn className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Sign In</span>
                  </Link>
                </SidebarMenuButton>
              )
            )}
            {authLoading && (
              <div className="flex justify-center p-2 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8">
                <Icons.spinner className="h-5 w-5 animate-spin" />
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:justify-start">
          <div className="md:hidden">
            <Link href="/dashboard" className="flex items-center space-x-2">
                <Icons.logo className="h-6 w-6 text-primary" />
                <span className="font-bold font-headline text-base">{siteConfig.name}</span>
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
