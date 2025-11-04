"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  MessageSquare, 
  Calendar, 
  Newspaper, 
  BookOpen,
  Sparkles 
} from "lucide-react"

const navItems = [
  {
    href: "/feed",
    label: "Feed",
    icon: MessageSquare,
  },
  {
    href: "/events",
    label: "Events", 
    icon: Calendar,
  },
  {
    href: "/",
    label: "News",
    icon: Newspaper,
  },
  {
    href: "/magazine",
    label: "Magazine",
    icon: BookOpen,
  },
  {
    href: "/showcase",
    label: "Showcase",
    icon: Sparkles,
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/feed" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-xs font-medium transition-colors truncate",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}