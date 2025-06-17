
"use client";

import React from "react";
import { usePathname } from "next/navigation"; // Removed useRouter
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
// import { useAuth } from "@/hooks/useAuth"; // No longer using for Sign In/Out buttons
// import { auth } from "@/lib/firebase"; // No longer using for Sign In/Out buttons
// import { signOut } from "firebase/auth"; // No longer using for Sign In/Out buttons
import { useToast } from "@/hooks/use-toast";

// const ADMIN_EMAIL = "lgubevu@gmail.com"; // No longer used here

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  // const router = useRouter(); // No longer needed for sign out redirection
  // const { user, loading: authLoading } = useAuth(); // No longer used for conditional UI here
  const { toast } = useToast(); // Keep for other potential toasts

  // const handleSignOut = async () => {
  //   if (!auth) { // auth is removed from firebase.ts
  //     toast({ title: "Error", description: "Firebase Auth not initialized.", variant: "destructive" });
  //     return;
  //   }
  //   try {
  //     await signOut(auth);
  //     toast({ title: "Signed Out", description: "You have been successfully signed out." });
  //     router.push("/");
  //     router.refresh();
  //   } catch (error: any) {
  //     const errorMessage = error.message || "Could not sign out.";
  //     toast({ title: "Sign Out Failed", description: errorMessage, variant: "destructive" });
  //   }
  // };

  const mainNavItems = siteConfig.mainNav.filter(item => {
    if (item.href === "/auth") return false; // Always hide auth link

    // Show home, dashboard, admin clubs, and admin analytics by default
    if (item.href === "/" || 
        item.href === "/dashboard" || 
        item.href === "/admin/clubs" || 
        item.href === "/admin/analytics") {
      return true;
    }
    return true; // Default to showing other items if any
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
                if (item.href) { // Removed: && !(item.href === "/" && user) 
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
                        className="w-full justify-start"
                      >
                        <Link href={item.href}>
                          {IconComponent && <IconComponent className="h-4 w-4" />}
                          <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return null;
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-2 mt-auto border-t">
            <div className="flex flex-col gap-2">
               <div className="group-data-[collapsible=icon]:mx-auto">
                 <ThemeToggle />
               </div>
              {/* Sign In/Out buttons removed */}
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
