"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { UserBadge } from "@/lib/types"

interface BadgePillProps {
  badge: UserBadge
  showTooltip?: boolean
}

const RARITY_COLORS = {
  common: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  uncommon: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rare: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  epic: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  legendary: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
}

const RARITY_LABELS = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
}

export function BadgePill({ badge, showTooltip = true }: BadgePillProps) {
  const badgeElement = (
    <Badge className={`${RARITY_COLORS[badge.rarity]} border-0`} variant="secondary">
      {badge.badgeName}
    </Badge>
  )

  if (!showTooltip) {
    return badgeElement
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeElement}</TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{badge.badgeName}</p>
            <p className="text-xs text-muted-foreground">{RARITY_LABELS[badge.rarity]} Badge</p>
            <p className="text-xs text-muted-foreground">Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
