
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { siteConfig } from '@/config/site';
import { Smartphone, Activity, PartyPopper, CheckCircle2, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallPrompt } from "@/components/common/PwaInstallPrompt";

export default function LandingPage() {
  const { showInstallPrompt, handleInstallClick, handleDismissClick } = usePwaInstall();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <PwaInstallPrompt
          onInstall={handleInstallClick}
          onDismiss={handleDismissClick}
        />
      )}
      
      {/* Hero Section */}
      <section
        className="relative py-20 md:py-32 text-center text-primary-foreground bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-image.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-700 to-purple-900 opacity-50"></div>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        
        <div className="container relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold font-headline mb-6 animate-fade-in-down">
            Find the Pulse of the Night
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto animate-fade-in-up">
            Real-time nightclub crowd insights. Know where the party&apos;s at—before you go.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 animate-fade-in">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto" asChild>
              <Link href="/dashboard">
                <Icons.martini className="mr-2" /> Get Started
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold font-headline text-center mb-12">How NightPulse Works</h2>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12 text-center">
            <div className="flex flex-col items-center p-6 bg-card rounded-lg shadow-lg">
              <Smartphone size={48} className="text-accent mb-4" />
              <h3 className="text-xl font-semibold font-headline mb-2">1. Install the App</h3>
              <p className="text-muted-foreground">Get NightPulse on your iOS or Android device. Quick and easy setup.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-card rounded-lg shadow-lg">
              <Activity size={48} className="text-accent mb-4" />
              <h3 className="text-xl font-semibold font-headline mb-2">2. Check Crowd Levels</h3>
              <p className="text-muted-foreground">See live data on how busy clubs are, powered by our community.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-card rounded-lg shadow-lg">
              <PartyPopper size={48} className="text-accent mb-4" />
              <h3 className="text-xl font-semibold font-headline mb-2">3. Go Where It&apos;s Lit</h3>
              <p className="text-muted-foreground">Head straight to the hottest spots and skip the guesswork.</p>
            </div>
          </div>
          <p className="text-center text-muted-foreground mt-10 text-lg">
            <Icons.shieldCheck className="inline h-5 w-5 mr-2 text-green-500" />
            Your privacy is paramount. No personal info shared. Fully anonymous tracking.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold font-headline text-center mb-12">Why You&apos;ll Love NightPulse</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-start space-x-4 p-6 bg-card rounded-lg shadow-lg">
              <CheckCircle2 size={36} className="text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold font-headline mb-2">Avoid Empty Clubs</h3>
                <p className="text-muted-foreground">Never waste a night on a dead scene. Find the energy you&apos;re looking for.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-6 bg-card rounded-lg shadow-lg">
              <CheckCircle2 size={36} className="text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold font-headline mb-2">Discover Hotspots</h3>
                <p className="text-muted-foreground">Uncover trending clubs and hidden gems packed with partygoers.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-6 bg-card rounded-lg shadow-lg">
              <CheckCircle2 size={36} className="text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold font-headline mb-2">Maximize Your Night</h3>
                <p className="text-muted-foreground">Spend less time searching and more time enjoying the best nightlife your city offers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Club Owners CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">Are You a Club Owner?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Get your venue on NightPulse and attract more partygoers. It&apos;s free to list your club and gain visibility!
          </p>
          <Button size="lg" variant="secondary" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
            <Link href="/admin/clubs">List Your Club</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t">
        <div className="container text-center">
          <div className="flex justify-center space-x-6 mb-6">
            <Link href="#" aria-label="Facebook" className="text-muted-foreground hover:text-accent"><Facebook size={24} /></Link>
            <Link href="#" aria-label="Twitter" className="text-muted-foreground hover:text-accent"><Twitter size={24} /></Link>
            <Link href="#" aria-label="Instagram" className="text-muted-foreground hover:text-accent"><Instagram size={24} /></Link>
            <Link href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-accent"><Linkedin size={24} /></Link>
          </div>
          <div className="mb-4">
            <Link href="#" className="text-sm text-muted-foreground hover:text-accent mx-2">Contact Us</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-accent mx-2">Terms of Service</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-accent mx-2">Privacy Policy</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
