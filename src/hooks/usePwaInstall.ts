
"use client";

import { useState, useEffect } from 'react';

// Define the interface for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePwaInstall = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      // Show the custom install prompt.
      setShowInstallPrompt(true);
      console.log("PWA install prompt is ready.");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listener for when the app is successfully installed
    const handleAppInstalled = () => {
        console.log("PWA installed successfully.");
        // Hide the prompt and clear the event
        setShowInstallPrompt(false);
        setInstallPromptEvent(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      console.log("Install prompt event not available.");
      return;
    }
    // Show the browser's install prompt.
    await installPromptEvent.prompt();
    // Wait for the user to respond to the prompt.
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We don't need to do anything here, the `appinstalled` event will handle hiding the prompt.
    // Clear the event reference.
    setInstallPromptEvent(null);
    setShowInstallPrompt(false);
  };

  const handleDismissClick = () => {
    setShowInstallPrompt(false);
    console.log("User dismissed the PWA install prompt.");
  };

  return { showInstallPrompt, handleInstallClick, handleDismissClick };
};
