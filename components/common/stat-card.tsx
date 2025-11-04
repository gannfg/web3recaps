"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
  }
  badge?: {
    text: string
    variant?: "default" | "secondary" | "destructive" | "outline"
  }
}

export function StatCard({ title, value, description, icon: Icon, trend, badge }: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null

    if (trend.value > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (trend.value < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    } else {
      return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground"

    if (trend.value > 0) {
      return "text-green-600"
    } else if (trend.value < 0) {
      return "text-red-600"
    } else {
      return "text-muted-foreground"
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
            {badge && (
              <Badge variant={badge.variant || "secondary"} className="text-xs">
                {badge.text}
              </Badge>
            )}
          </div>

          {(description || trend) && (
            <div className="flex items-center justify-between text-xs">
              {description && <p className="text-muted-foreground">{description}</p>}
              {trend && (
                <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span>
                    {trend.value > 0 ? "+" : ""}
                    {trend.value}% {trend.label}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
