"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "@/store/useSession"
import { useUserProfile } from "@/hooks/use-user-profile"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { User, LogOut, FileText, Edit3, Shield, BookOpen } from "lucide-react"

export function UserMenu() {
  const { user, logout } = useSession()
  const { isLoading: profileLoading } = useUserProfile()
  const router = useRouter()



  const handleLogout = async () => {
    try {
      // Use the centralized clearSession method
      const { clearSession } = useSession.getState()
      clearSession()
      
      // Redirect to home
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (!user) {
    return (
      <Button asChild variant="default" size="sm">
        <Link href="/login">Sign In</Link>
      </Button>
    )
  }

  // Show loading state while profile is being refreshed
  if (profileLoading) {
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full" disabled>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </Button>
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={user.avatarUrl || "/placeholder-user.jpg"} 
              className="object-cover object-center w-full h-full"
            />
            <AvatarFallback className="bg-white text-gray-700 text-sm font-medium border border-gray-200">
              {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">{user.displayName || user.email || "Anonymous"}</p>
            <p className="w-[200px] truncate text-sm text-muted-foreground">
              {user.walletAddress || user.email || "No wallet connected"}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/magazine" className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4" />
            Magazine
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {(user.role === 'Admin' || user.role === 'ADMIN') && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              Admin Panel
            </Link>
          </DropdownMenuItem>
        )}
        {(user.role === 'Author' || user.role === 'Admin' || user.role === 'AUTHOR' || user.role === 'ADMIN') && (
          <DropdownMenuItem asChild>
            <Link href="/news/editor" className="flex items-center">
              <Edit3 className="mr-2 h-4 w-4" />
              Create Article
            </Link>
          </DropdownMenuItem>
        )}
        {(user.role === 'Author' || user.role === 'Admin' || user.role === 'AUTHOR' || user.role === 'ADMIN') && (
          <DropdownMenuItem asChild>
            <Link href="/news/manage" className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Manage News
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="flex items-center">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


