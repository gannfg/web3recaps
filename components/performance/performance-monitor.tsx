'use client'

import { useEffect, useState } from 'react'
import { MemoryMonitor, PerformanceMetrics } from '@/lib/performance-optimizations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Activity, MemoryStick, Zap, AlertTriangle } from 'lucide-react'

interface PerformanceMonitorProps {
  showDetails?: boolean
  className?: string
}

export function PerformanceMonitor({ showDetails = false, className }: PerformanceMonitorProps) {
  const [memoryInfo, setMemoryInfo] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const monitor = MemoryMonitor.getInstance()
    
    // Start monitoring
    monitor.startMonitoring(10000) // Every 10 seconds
    
    // Subscribe to memory updates
    const unsubscribe = monitor.subscribe((info) => {
      setMemoryInfo(info)
    })

    // Update metrics periodically
    const interval = setInterval(() => {
      setMetrics(PerformanceMetrics.getMetrics())
    }, 5000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  // Record page load time
  useEffect(() => {
    const startTime = performance.now()
    
    const handleLoad = () => {
      const loadTime = performance.now() - startTime
      PerformanceMetrics.recordTiming('page_load', loadTime)
    }

    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad)
    }

    return () => window.removeEventListener('load', handleLoad)
  }, [])

  // Get performance status
  const getPerformanceStatus = () => {
    if (!memoryInfo) return 'unknown'
    
    const percentage = memoryInfo.percentage
    if (percentage > 90) return 'critical'
    if (percentage > 80) return 'warning'
    if (percentage > 60) return 'moderate'
    return 'good'
  }

  const status = getPerformanceStatus()
  const statusColors = {
    good: 'bg-green-500',
    moderate: 'bg-yellow-500',
    warning: 'bg-orange-500',
    critical: 'bg-red-500',
    unknown: 'bg-gray-500'
  }

  const statusLabels = {
    good: 'Good',
    moderate: 'Moderate',
    warning: 'Warning',
    critical: 'Critical',
    unknown: 'Unknown'
  }

  if (!isVisible && !showDetails) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
          {!showDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              ×
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Memory Usage */}
        {memoryInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MemoryStick className="h-4 w-4" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <Badge 
                variant={status === 'critical' || status === 'warning' ? 'destructive' : 'secondary'}
                className={statusColors[status]}
              >
                {statusLabels[status]}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(memoryInfo.used / 1024 / 1024)} MB</span>
                <span>{Math.round(memoryInfo.limit / 1024 / 1024)} MB</span>
              </div>
              <Progress 
                value={memoryInfo.percentage} 
                className="h-2"
              />
              <div className="text-xs text-center text-muted-foreground">
                {Math.round(memoryInfo.percentage)}% used
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {Object.keys(metrics).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Performance Metrics</span>
            </div>
            
            <div className="space-y-1">
              {Object.entries(metrics).map(([name, data]: [string, any]) => (
                <div key={name} className="flex justify-between text-xs">
                  <span className="capitalize">{name.replace('_', ' ')}</span>
                  <span className="text-muted-foreground">
                    {Math.round(data.average)}ms (avg)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Tips */}
        {status === 'warning' || status === 'critical' ? (
          <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-orange-800 dark:text-orange-200">
                  High Memory Usage Detected
                </div>
                <div className="text-orange-700 dark:text-orange-300 mt-1">
                  Consider refreshing the page or closing unused tabs to improve performance.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Cache Stats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Cache Status</span>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <div>Image cache: Active</div>
            <div>API cache: Active</div>
            <div>Optimizations: Enabled</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Performance optimization tips component
export function PerformanceTips() {
  const tips = [
    {
      title: "Image Optimization",
      description: "Images are automatically optimized and cached for faster loading.",
      status: "active"
    },
    {
      title: "API Caching",
      description: "API responses are cached to reduce server load and improve speed.",
      status: "active"
    },
    {
      title: "Lazy Loading",
      description: "Images and components load only when needed to save bandwidth.",
      status: "active"
    },
    {
      title: "Database Indexes",
      description: "Database queries are optimized with proper indexes for faster responses.",
      status: "active"
    }
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Performance Optimizations</h3>
      <div className="grid gap-3">
        {tips.map((tip, index) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">{tip.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{tip.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
