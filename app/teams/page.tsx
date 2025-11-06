"use client"

import { useState } from "react"
import { OptimizedTeamsList } from "@/components/teams/optimized-teams-list"
import { TeamCreateForm } from "@/components/teams/team-create-form"
import { PerformanceMonitor } from "@/components/performance/performance-monitor"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import type { Team } from "@/lib/types"

export default function TeamsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleTeamCreated = (newTeam: Team) => {
    setShowCreateForm(false)
    // Trigger refresh of the teams list
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Find and join teams or create your own</p>
        </div>
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto scrollbar-hide">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Build a team to collaborate on projects and bring your ideas to life
              </DialogDescription>
            </DialogHeader>
            <TeamCreateForm onTeamCreated={handleTeamCreated} onCancel={() => setShowCreateForm(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Optimized Teams List with Performance Improvements */}
      <OptimizedTeamsList refreshTrigger={refreshTrigger} />

      {/* Performance Monitor (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceMonitor showDetails={true} />
      )}
    </div>
  )
}
