"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react"
import type { Event } from "@/lib/types"

interface EventsCalendarProps {
  events: Event[]
  onEventClick?: (event: Event) => void
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function EventsCalendar({ events, onEventClick }: EventsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Create calendar grid
  const calendarDays = []

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i),
    })
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: new Date(year, month, day),
    })
  }

  // Next month days to fill grid
  const remainingDays = 42 - calendarDays.length
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month + 1, day),
    })
  }

  // Group events by date
  const eventsByDate = events.reduce(
    (acc, event) => {
      const eventDate = new Date(event.startTime).toDateString()
      if (!acc[eventDate]) acc[eventDate] = []
      acc[eventDate].push(event)
      return acc
    },
    {} as Record<string, Event[]>,
  )

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(new Date(year, month + (direction === "next" ? 1 : -1), 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "workshop":
        return "bg-blue-500"
      case "1on1":
        return "bg-green-500"
      case "study_group":
        return "bg-purple-500"
      case "hackathon":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Events Calendar
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-center">
            {MONTHS[month]} {year}
          </h3>
        </div>

        {/* Days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((calendarDay, index) => {
            const dayEvents = eventsByDate[calendarDay.date.toDateString()] || []
            const isCurrentDay = isToday(calendarDay.date)

            return (
              <div
                key={index}
                className={`
                  min-h-[80px] p-1 border rounded-lg transition-colors hover:bg-muted/50
                  ${calendarDay.isCurrentMonth ? "bg-background" : "bg-muted/20"}
                  ${isCurrentDay ? "ring-2 ring-primary" : ""}
                `}
              >
                <div
                  className={`
                  text-sm font-medium mb-1
                  ${calendarDay.isCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                  ${isCurrentDay ? "text-primary font-bold" : ""}
                `}
                >
                  {calendarDay.day}
                </div>

                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div key={event.id} onClick={() => onEventClick?.(event)} className="cursor-pointer group">
                      <div
                        className={`
                        w-full h-5 rounded text-xs px-1 flex items-center gap-1 text-white
                        ${getEventTypeColor(event.eventType)} group-hover:opacity-80
                      `}
                      >
                        <Clock className="h-2 w-2 flex-shrink-0" />
                        <span className="truncate text-[10px]">{event.title}</span>
                      </div>
                    </div>
                  ))}

                  {dayEvents.length > 2 && (
                    <div className="text-xs text-muted-foreground text-center">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>Workshop</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>1-on-1</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-500"></div>
            <span>Study Group</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Hackathon</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
