
import type { Icons } from "@/components/icons";

export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "NightPulse",
  description:
    "Navigate the night with real-time club crowd data and estimated wait times.",
  mainNav: [
    {
      title: "Home",
      href: "/", 
      icon: "logo" as keyof typeof Icons, // Or a more generic home icon like 'home' if added
    },
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: "barChart" as keyof typeof Icons, // Example icon
    },
    {
      title: "Manage Clubs",
      href: "/admin/clubs",
      icon: "building" as keyof typeof Icons, // Example icon
    },
    // Example for auth link (conditionally shown by AppShell)
    // {
    //   title: "Sign In",
    //   href: "/auth",
    //   icon: "logIn" as keyof typeof Icons,
    // }
  ],
  links: {
    // Add external links if any
  },
}
