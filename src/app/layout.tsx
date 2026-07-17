
import type {Metadata, Viewport} from 'next';
import { Space_Grotesk, Manrope } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { siteConfig } from '@/config/site';
import AppShell from '@/components/layout/AppShell';
import { SidebarProvider } from "@/components/ui/sidebar"; // New import
import Script from 'next/script'; // Import Script component

const fontSpaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

// App-wide body font (Addendum 18) — previously landing-page-only, now the
// default font-body everywhere, replacing Inter.
const fontManrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  manifest: "/manifest.webmanifest",
  // icons: {
  //   icon: "/favicon.ico",
  //   shortcut: "/favicon-16x16.png",
  //   apple: "/apple-touch-icon.png",
  // },
  // manifest: `/site.webmanifest`,
};

export const viewport: Viewport = {
  themeColor: "#0b0a14",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-body antialiased",
          fontSpaceGrotesk.variable,
          fontManrope.variable
        )}
      >
        {/* Ambient background glow: two large, softly blurred spotlights sitting behind
            every page's content — fixed and pointer-events-none so it never interferes
            with scrolling or clicks. Drawn from the landing page's 5-hue palette
            (Addendum 18) rather than just primary/accent. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-gradient-vy-purple-pink opacity-20 blur-[120px]" />
          <div
            className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full opacity-20 blur-[120px]"
            style={{ background: "radial-gradient(circle, var(--vy-cyan), var(--vy-indigo) 70%, transparent)" }}
          />
        </div>
        <SidebarProvider defaultOpen={false}> {/* Default to collapsed on desktop, mobile is handled by Sheet */}
          <AppShell>{children}</AppShell>
        </SidebarProvider>
        <Toaster />
        <Script id="service-worker-registration">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                  console.log('SW registered: ', registration);
                }).catch(registrationError => {
                  console.log('SW registration failed: ', registrationError);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
