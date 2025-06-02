
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
      href: "/dashboard", // User dashboard, shown when logged in
    },
    {
      title: "Manage Clubs", // Admin section, shown when logged in (could be role-based later)
      href: "/admin/clubs",
    },
    // Example of a public link:
    // {
    //   title: "Pricing",
    //   href: "/pricing",
    // },
  ],
  links: {
    // Add external links if any, e.g., GitHub repo
    // github: "https://github.com/your-repo",
  },
}
