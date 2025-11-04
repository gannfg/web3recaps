"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, Filter, Search, TrendingUp, Clock, Award } from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { formatDistanceToNow } from 'date-fns'

interface XpTransaction {
  id: string
  activity: string
  xpEarned: number
  timestamp: string
  details: any
}

interface XpHistoryData {
  transactions: XpTransaction[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasMore: boolean
  }
  summary: {
    totalXpEarned: number
    totalTransactions: number
    xpByActivity: Record<string, number>
    firstTransaction: string | null
    lastTransaction: string | null
  }
  filters: {
    from: string | null
    to: string | null
    activity: string | null
  }
}

export function XpHistoryViewer() {
  const { execute } = useApi()
  const [data, setData] = useState<XpHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    activity: ''
  })
  const [searchTerm, setSearchTerm] = useState('')

  const fetchXpHistory = async (pageNum: number = 1, newFilters = filters) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20'
      })

      if (newFilters.from) params.append('from', newFilters.from)
      if (newFilters.to) params.append('to', newFilters.to)
      if (newFilters.activity) params.append('activity', newFilters.activity)

      const result = await execute(`/api/users/me/xp-history?${params.toString()}`)
      
      if (result.success) {
        setData(result.data)
        setPage(pageNum)
      }
    } catch (error) {
      console.error('Error fetching XP history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchXpHistory()
  }, [])

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    fetchXpHistory(1, newFilters)
  }

  const handleSearch = () => {
    fetchXpHistory(1, filters)
  }

  const clearFilters = () => {
    setFilters({ from: '', to: '', activity: '' })
    setSearchTerm('')
    fetchXpHistory(1, { from: '', to: '', activity: '' })
  }

  const formatActivity = (activity: string) => {
    return activity
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const getActivityIcon = (activity: string) => {
    if (activity.includes('post')) return '📝'
    if (activity.includes('comment')) return '💬'
    if (activity.includes('like')) return '❤️'
    if (activity.includes('team')) return '👥'
    if (activity.includes('project')) return '🚀'
    if (activity.includes('event')) return '🎉'
    if (activity.includes('checkin')) return '✅'
    if (activity.includes('badge')) return '🏆'
    if (activity.includes('admin')) return '⚙️'
    return '⭐'
  }

  const getXpColor = (xp: number) => {
    if (xp > 0) return 'text-green-600'
    if (xp < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-lg">Loading XP history...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Failed to load XP history
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total XP</p>
                <p className="text-2xl font-bold">{data.summary.totalXpEarned.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold">{data.summary.totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">First Activity</p>
                <p className="text-sm font-bold">
                  {data.summary.firstTransaction 
                    ? formatDistanceToNow(new Date(data.summary.firstTransaction), { addSuffix: true })
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Last Activity</p>
                <p className="text-sm font-bold">
                  {data.summary.lastTransaction 
                    ? formatDistanceToNow(new Date(data.summary.lastTransaction), { addSuffix: true })
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Activity Type</label>
              <Select value={filters.activity} onValueChange={(value) => setFilters({ ...filters, activity: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All activities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All activities</SelectItem>
                  {Object.keys(data.summary.xpByActivity).map(activity => (
                    <SelectItem key={activity} value={activity}>
                      {formatActivity(activity)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-x-2">
              <Button onClick={handleSearch} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>XP Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {data.transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No XP transactions found
            </div>
          ) : (
            <div className="space-y-4">
              {data.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {getActivityIcon(transaction.activity)}
                    </div>
                    <div>
                      <p className="font-medium">{formatActivity(transaction.activity)}</p>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(transaction.timestamp), { addSuffix: true })}
                      </p>
                      {transaction.details && (
                        <div className="text-xs text-gray-400 mt-1">
                          {transaction.details.postId && `Post #${transaction.details.postId}`}
                          {transaction.details.teamId && `Team: ${transaction.details.teamName}`}
                          {transaction.details.projectId && `Project: ${transaction.details.projectName}`}
                          {transaction.details.eventId && `Event: ${transaction.details.eventTitle}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getXpColor(transaction.xpEarned)}`}>
                      {transaction.xpEarned > 0 ? '+' : ''}{transaction.xpEarned} XP
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Page {data.pagination.page} of {data.pagination.pages} 
                ({data.pagination.total} total transactions)
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => fetchXpHistory(page - 1, filters)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fetchXpHistory(page + 1, filters)}
                  disabled={!data.pagination.hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
