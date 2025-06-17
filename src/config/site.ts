
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
      icon: "logo" as keyof typeof Icons, 
    },
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: "layoutDashboard" as keyof typeof Icons, 
    },
    {
      title: "Manage Clubs",
      href: "/admin/clubs",
      icon: "building" as keyof typeof Icons, 
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: "barChartBig" as keyof typeof Icons,
    },
    // The "/auth" link is implicitly removed by AppShell filtering
    // or can be explicitly removed from here if it was ever present.
  ],
  links: {
    // Add external links if any
  },
}
