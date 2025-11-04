"use client"

import { AdminStatsDashboard } from "@/components/admin/admin-stats-dashboard"
import { UserManagementTable } from "@/components/admin/user-management-table"
import { KycReviewTable } from "@/components/admin/kyc-review-table"
import { RoleGate } from "@/components/auth/role-gate"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

function KycResetForm() {
  const { execute } = useApi()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address",
        variant: "destructive"
      })
      return
    }

    setIsResetting(true)
    try {
      const result = await execute("/api/admin/reset-kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      })

      if (result.success) {
        toast({
          title: "KYC Reset Successful",
          description: `KYC data has been reset for ${email}`,
        })
        setEmail("")
      } else {
        throw new Error(result.error || "Failed to reset KYC")
      }
    } catch (error) {
      console.error("Reset KYC error:", error)
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Failed to reset KYC data",
        variant: "destructive"
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset KYC Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">User Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter user email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button 
          onClick={handleReset} 
          disabled={isResetting || !email.trim()}
          variant="destructive"
        >
          {isResetting ? "Resetting..." : "Reset KYC Data"}
        </Button>
        <p className="text-sm text-muted-foreground">
          This will reset all KYC data for the user and allow them to go through the verification process again.
        </p>
      </CardContent>
    </Card>
  )
}

export default function AdminPage() {
  return (
    <RoleGate requiredRole="Admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage ObeliskHub community and platform</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="kyc">KYC Review</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminStatsDashboard />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <UserManagementTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc" className="space-y-6">
            <KycReviewTable />
            <KycResetForm />
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>News Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <a href="/news/editor" className="block rounded-lg border p-4 hover:bg-accent">
                    <div className="font-medium">Create Article</div>
                    <div className="text-sm text-muted-foreground">Open the rich text editor</div>
                  </a>
                  <a href="/news/manage" className="block rounded-lg border p-4 hover:bg-accent">
                    <div className="font-medium">Manage Articles</div>
                    <div className="text-sm text-muted-foreground">Edit, publish, feature, delete</div>
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <a href="/events/manage" className="block rounded-lg border p-4 hover:bg-accent">
                    <div className="font-medium">Manage Events</div>
                    <div className="text-sm text-muted-foreground">Create, edit, publish, feature</div>
                  </a>
                  <a href="/events" className="block rounded-lg border p-4 hover:bg-accent">
                    <div className="font-medium">View Events</div>
                    <div className="text-sm text-muted-foreground">Public listing</div>
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  )
}
