// This file is no longer used as navigation items are directly rendered in AppShell.tsx using Sidebar components.
// You can safely delete this file.
// If you prefer to keep it as a reference, you can leave it.

/*
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import type { NavItem } from "@/types/nav" 
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"

interface MainNavProps {
  items?: NavItem[]
}

export function MainNav({ items }: MainNavProps) {
  const pathname = usePathname()

  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" className="flex items-center space-x-2">
        <Icons.logo className="h-6 w-6 text-primary" />
        <span className="inline-block font-bold font-headline">{siteConfig.name}</span>
      </Link>
      {items?.length ? (
        <nav className="flex gap-6">
          {items?.map(
            (item, index) =>
              item.href && (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium text-muted-foreground hover:text-foreground",
                    pathname === item.href && "text-foreground",
                    item.disabled && "cursor-not-allowed opacity-80"
                  )}
                >
                  {item.title}
                </Link>
              )
          )}
        </nav>
      ) : null}
    </div>
  )
}
*/
