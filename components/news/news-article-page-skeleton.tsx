import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function NewsArticlePageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="container mx-auto px-4 pt-6">
        <Skeleton className="h-8 w-32 mb-4" />
      </div>

      {/* Featured Image Skeleton */}
      <Skeleton className="h-64 md:h-96 lg:h-[500px] w-full" />

      {/* Article Info Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            {/* Title Skeleton */}
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-6 w-3/4 mb-6" />

            {/* Meta Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="w-px h-4" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>

            {/* Stats Skeleton */}
            <div className="flex gap-6 pt-4 border-t">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Article Content Skeleton */}
            <Card className="mb-8">
              <CardContent className="p-6">
                {/* Tags Skeleton */}
                <div className="flex gap-2 mb-6">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-14" />
                </div>

                {/* Content Skeleton */}
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>

                {/* Footer Skeleton */}
                <div className="mt-8 pt-6 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-28" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Skeleton */}
            <Card className="mb-8">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-12" />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments Skeleton */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                
                {/* Comment Form Skeleton */}
                <div className="mb-6">
                  <Skeleton className="h-20 w-full mb-3" />
                  <div className="flex justify-end">
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>

                {/* Comments List Skeleton */}
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                        <div className="flex gap-4 mt-2">
                          <Skeleton className="h-6 w-12" />
                          <Skeleton className="h-6 w-12" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Related Articles Skeleton */}
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4 p-4">
                      <Skeleton className="w-24 h-24 rounded-md" />
                      <div className="flex-1">
                        <div className="flex gap-2 mb-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-3 w-3/4 mb-2" />
                        <div className="flex gap-3">
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:w-80">
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <Skeleton key={j} className="h-8 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
