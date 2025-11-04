import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Search, Filter, X, ChevronDown, Users, Code, Briefcase, MapPin } from "lucide-react"

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

interface AdvancedTeamFiltersProps {
  filters: TeamFilters
  onFiltersChange: (filters: TeamFilters) => void
  onReset: () => void
}

const TEAM_STATUS_OPTIONS = [
  { value: "all", label: "All Teams" },
  { value: "recruiting", label: "🟢 Recruiting" },
  { value: "active", label: "🔵 Active" },
  { value: "completed", label: "✅ Completed" },
  { value: "archived", label: "📁 Archived" },
]

const PROJECT_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "hackathon", label: "🏆 Hackathon" },
  { value: "startup", label: "🚀 Startup" },
  { value: "learning", label: "📚 Learning" },
  { value: "freelance", label: "💼 Freelance" },
  { value: "open_source", label: "🌐 Open Source" },
]

const LOCATION_OPTIONS = [
  { value: "all", label: "All Locations" },
  { value: "remote", label: "🌍 Remote" },
  { value: "hybrid", label: "🏢 Hybrid" },
  { value: "onsite", label: "🏛️ On-site" },
]

const BUDGET_OPTIONS = [
  { value: "all", label: "All Budgets" },
  { value: "unpaid", label: "💝 Unpaid/Volunteer" },
  { value: "low", label: "💰 Low ($1-$5k)" },
  { value: "medium", label: "💰💰 Medium ($5k-$20k)" },
  { value: "high", label: "💰💰💰 High ($20k+)" },
  { value: "equity", label: "📈 Equity Based" },
]

const POPULAR_SKILLS = [
  "React", "Next.js", "TypeScript", "JavaScript", "Node.js",
  "Python", "Rust", "Solana", "Ethereum", "Web3",
  "UI/UX", "Design", "Figma", "Product", "Marketing",
  "DevOps", "AI/ML", "Mobile", "Flutter", "React Native",
  "Backend", "Frontend", "Fullstack", "DeFi", "NFT"
]

export function AdvancedTeamFilters({ filters, onFiltersChange, onReset }: AdvancedTeamFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [skillInput, setSkillInput] = useState("")

  const updateFilter = (key: keyof TeamFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const addSkill = (skill: string) => {
    if (skill && !filters.skills.includes(skill)) {
      updateFilter('skills', [...filters.skills, skill])
    }
    setSkillInput("")
  }

  const removeSkill = (skill: string) => {
    updateFilter('skills', filters.skills.filter(s => s !== skill))
  }

  const handleSkillInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault()
      addSkill(skillInput.trim())
    }
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.status !== 'all') count++
    if (filters.projectType !== 'all') count++
    if (filters.location !== 'all') count++
    if (filters.budgetRange !== 'all') count++
    if (filters.skills.length > 0) count++
    if (filters.teamSizeMin > 1 || filters.teamSizeMax < 10) count++
    return count
  }

  return (
    <div className="space-y-4">
      {/* Basic Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams, skills, or descriptions..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEAM_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Advanced
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {getActiveFiltersCount()}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      {/* Quick Skill Tags */}
      <div className="flex flex-wrap gap-2">
        {POPULAR_SKILLS.slice(0, 8).map((skill) => (
          <Badge
            key={skill}
            variant={filters.skills.includes(skill) ? "default" : "outline"}
            className="cursor-pointer hover:bg-secondary"
            onClick={() => filters.skills.includes(skill) ? removeSkill(skill) : addSkill(skill)}
          >
            #{skill}
          </Badge>
        ))}
      </div>

      {/* Advanced Filters Panel */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleContent>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
                <Button variant="ghost" size="sm" onClick={onReset}>
                  <X className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Type & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Project Type
                  </Label>
                  <Select value={filters.projectType} onValueChange={(value) => updateFilter('projectType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <Select value={filters.location} onValueChange={(value) => updateFilter('location', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Team Size */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Size: {filters.teamSizeMin} - {filters.teamSizeMax} members
                </Label>
                <div className="px-2">
                  <Slider
                    value={[filters.teamSizeMin, filters.teamSizeMax]}
                    onValueChange={([min, max]) => {
                      updateFilter('teamSizeMin', min)
                      updateFilter('teamSizeMax', max)
                    }}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>1 member</span>
                  <span>10+ members</span>
                </div>
              </div>

              <Separator />

              {/* Budget Range */}
              <div className="space-y-2">
                <Label>Budget Range</Label>
                <Select value={filters.budgetRange} onValueChange={(value) => updateFilter('budgetRange', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Skills */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Required Skills
                </Label>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Add skill (e.g., React, Design, Marketing)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={handleSkillInputKeyPress}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={() => addSkill(skillInput.trim())}
                    disabled={!skillInput.trim()}
                  >
                    Add
                  </Button>
                </div>

                {filters.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {filters.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1">
                        {skill}
                        <button
                          onClick={() => removeSkill(skill)}
                          className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Popular Skills:</Label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SKILLS.filter(skill => !filters.skills.includes(skill)).slice(0, 12).map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary text-xs"
                        onClick={() => addSkill(skill)}
                      >
                        + {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
