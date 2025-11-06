"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useSession } from "@/store/useSession"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/auth/user-menu"
import Image from "next/image"

const navItems = [
  { href: "/", label: "News" },
  { href: "/feed", label: "Feed" },
  { href: "/events", label: "Events" },
  { href: "/magazine", label: "Magazine" },
  { href: "/showcase", label: "Showcase" },
]

export function HeaderNav() {
  const pathname = usePathname()
  const { user } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-12 items-center justify-between px-4">
        {/* Left: Logo + Navigation */}
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Web3 Recap"
              width={42}
              height={42}
              className="h-12 w-12 object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden lg:flex items-center justify-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search posts, events, teams..." className="pl-8" />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2">
          {user && <NotificationBell />}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
