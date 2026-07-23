
import type { Icons } from "@/components/icons";

export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Vybi",
  description:
    "Real-time nightclub crowd insights, plus Meet Me — an opt-in way to meet friends (or something more) at the venues you're already at.",
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
      title: "Matches",
      href: "/dashboard/matches",
      icon: "heart" as keyof typeof Icons,
    },
    {
      title: "Interested",
      href: "/dashboard/interested",
      icon: "view" as keyof typeof Icons,
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
