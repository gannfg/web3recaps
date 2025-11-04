"use client"

import { useState, useEffect } from "react"
import { OptimizedTeamsList } from "@/components/teams/optimized-teams-list"
import { TeamCreateForm } from "@/components/teams/team-create-form"
import { PerformanceMonitor } from "@/components/performance/performance-monitor"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { useApi } from "@/hooks/use-api"
import { useSession } from "@/store/useSession"
import { Plus } from "lucide-react"
import type { Team } from "@/lib/types"

interface TeamFilters {
  search: string
  status: string
  projectType: string
  location: string
  skills: string[]
  teamSizeMin: number
  teamSizeMax: number
  budgetRange: string
}

export default function TeamsPage() {
  const { user } = useSession()
  const [showCreateForm, setShowCreateForm] = useState(false)

  const handleTeamCreated = (newTeam: Team) => {
    setShowCreateForm(false)
    // The OptimizedTeamsList will handle refreshing the data
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <TeamCreateForm onTeamCreated={handleTeamCreated} onCancel={() => setShowCreateForm(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Optimized Teams List with Performance Improvements */}
      <OptimizedTeamsList />

      {/* Performance Monitor (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceMonitor showDetails={true} />
      )}
    </div>
  )
}
