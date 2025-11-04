"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useApi } from "@/hooks/use-api"

interface ArticleItem {
  id: string
  slug: string
  title: string
  featured_image_url?: string
  published_at?: string
}

export function LatestArticlesWidget() {
  const { execute } = useApi()
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await execute(`/api/news?status=published&sort_by=published_at&sort_order=desc&limit=5&page=1`)
      if (res.success && res.data?.articles) {
        setArticles(
          res.data.articles.map((a: any) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            featured_image_url: a.featured_image_url,
            published_at: a.published_at,
          }))
        )
      }
      setLoading(false)
    }
    load()
  }, []) // Remove execute from dependencies to prevent infinite loop

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-12 h-12 bg-muted rounded animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!articles.length) {
    return <div className="text-xs text-muted-foreground">No recent articles</div>
  }

  return (
    <div className="space-y-3">
      {articles.map((a) => (
        <Link key={a.id} href={`/news/${a.slug}`} className="flex gap-3 group">
          <div className="relative w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
            {a.featured_image_url && (
              <Image src={a.featured_image_url} alt={a.title} fill className="object-cover group-hover:scale-105 transition-transform" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium line-clamp-2 group-hover:text-primary">
              {a.title}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}


