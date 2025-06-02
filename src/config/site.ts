
export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "NightPulse",
  description:
    "Navigate the night with real-time club crowd data and estimated wait times.",
  mainNav: [
    {
      title: "Home",
      href: "/", // Landing page
    },
    {
      title: "Dashboard",
      href: "/dashboard", // User dashboard
    },
    {
      title: "Manage Clubs",
      href: "/admin/clubs",
    },
  ],
  links: {
    // Add external links if any, e.g., GitHub repo
    // github: "https://github.com/your-repo",
  },
}
