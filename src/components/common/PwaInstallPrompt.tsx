
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { siteConfig } from "@/config/site";

interface PwaInstallPromptProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function PwaInstallPrompt({ onInstall, onDismiss }: PwaInstallPromptProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm animate-in slide-in-from-bottom-10 fade-in-50">
      <Card className="shadow-2xl">
        <CardHeader className="p-4 flex flex-row items-start gap-4">
          <Icons.logo className="h-10 w-10 text-primary mt-1 flex-shrink-0" />
          <div>
            <CardTitle className="text-lg font-headline">Install {siteConfig.name}</CardTitle>
            <CardDescription className="text-sm">
              Get the full app experience. It's fast, free, and works offline.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Not Now
          </Button>
          <Button size="sm" onClick={onInstall}>
            <Icons.download className="mr-2 h-4 w-4" />
            Install
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
