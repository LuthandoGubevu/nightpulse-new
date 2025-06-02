
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { MainNav } from "@/components/nav/MainNav";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function SiteHeader() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push("/"); // Redirect to landing page after sign out
      router.refresh();
    } catch (error) {
      toast({ title: "Sign Out Failed", description: "Could not sign out.", variant: "destructive" });
    }
  };

  const mainNavItems = siteConfig.mainNav
    .filter(item => {
      if (item.href === "/dashboard" || item.href === "/admin/clubs") {
        return !!user; // Only show Dashboard and Manage Clubs if user is logged in
      }
      if (item.href === "/") return true; // Always show Home
      return !user; // Show other items (like a potential future /pricing) if user is NOT logged in
    });


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <MainNav items={mainNavItems} />
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center">
            {!loading && (
              <>
                {user ? (
                  <Button variant="ghost" onClick={handleSignOut}>
                    <Icons.logOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                ) : (
                  <Link
                    href="/auth"
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                    )}
                  >
                    <Icons.logIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Link>
                )}
              </>
            )}
            {loading && <Icons.spinner className="h-5 w-5 animate-spin" />}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
