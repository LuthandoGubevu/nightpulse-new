export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Nightlife Navigator",
  description:
    "Navigate the night with real-time club crowd data and estimated wait times.",
  mainNav: [
    {
      title: "Dashboard",
      href: "/",
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
