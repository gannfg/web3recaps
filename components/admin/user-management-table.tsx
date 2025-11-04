"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime } from "@/lib/utils"
import { MoreHorizontal, Shield, ShieldOff, Trash2, Search, RefreshCw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

const ROLE_COLORS = {
  Admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  Author: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Builder: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Student: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Visitor: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

interface User {
  id: string
  display_name?: string
  email?: string
  role: "Admin" | "Author" | "Builder" | "Student" | "Visitor"
  total_xp: number
  created_at: string
  last_seen?: string
  avatar_url?: string
}

export function UserManagementTable() {
  const { execute } = useApi()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [suspendingId, setSuspendingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(roleFilter !== "all" && { role: roleFilter })
      })

      const result = await execute(`/api/admin/users?${params}`)
      if (result.success && result.data) {
        setUsers(result.data.users)
        setTotalPages(result.data.pagination.pages)
      }
    } catch (error) {
      console.error("Error loading users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [page, search, roleFilter])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const result = await execute(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (result.success) {
        setUsers(users.map((user) => (user.id === userId ? { ...user, role: newRole as any } : user)))
        toast({
          title: "Success",
          description: "User role updated successfully"
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error updating role:", error)
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const result = await execute(`/api/admin/users/${userId}`, {
        method: "DELETE"
      })

      if (result.success) {
        setUsers(users.filter(user => user.id !== userId))
        toast({
          title: "Success",
          description: "User deleted successfully"
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const handleSuspend = async (userId: string, isSuspended: boolean) => {
    try {
      setSuspendingId(userId)
      const result = await execute(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended })
      })
      if (result.success) {
        toast({ title: "Success", description: isSuspended ? "User suspended" : "User unsuspended" })
        loadUsers()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update suspension", variant: "destructive" })
    } finally {
      setSuspendingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h3 className="text-lg font-semibold">User Management</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full sm:w-[200px]"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Author">Author</SelectItem>
              <SelectItem value="Builder">Builder</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
              <SelectItem value="Visitor">Visitor</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback>{user.display_name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.display_name || "Anonymous"}</p>
                      <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={ROLE_COLORS[user.role]} variant="secondary">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>{user.total_xp.toLocaleString()}</TableCell>
                <TableCell>{formatRelativeTime(user.created_at)}</TableCell>
                <TableCell>
                  {user.last_seen ? formatRelativeTime(user.last_seen) : "Never"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRoleChange(user.id, "Admin")}>
                        <Shield className="h-4 w-4 mr-2" />
                        Make Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(user.id, "Author")}>
                        <ShieldOff className="h-4 w-4 mr-2" />
                        Make Author
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(user.id, "Builder")}>
                        <ShieldOff className="h-4 w-4 mr-2" />
                        Make Builder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(user.id, "Student")}>
                        Make Student
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(user.id, "Visitor")}>
                        Make Visitor
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSuspend(user.id, true)} disabled={suspendingId === user.id}>
                        Suspend User
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSuspend(user.id, false)} disabled={suspendingId === user.id}>
                        Unsuspend User
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {user.display_name || "this user"}? This action cannot be undone and will remove all their data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
