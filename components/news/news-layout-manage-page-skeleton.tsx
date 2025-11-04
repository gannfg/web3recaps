export function NewsLayoutManagePageSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 bg-muted animate-pulse rounded" />
          <div className="h-9 w-20 bg-muted animate-pulse rounded" />
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg border p-4">
            <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>

      {/* Layout Builder Skeleton */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-40 bg-muted animate-pulse rounded" />
        </div>

        {/* Layout Preview Skeleton */}
        <div className="bg-muted/50 rounded-lg p-6 mb-8">
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="grid grid-cols-12 gap-2 h-32">
            <div className="col-span-3 bg-muted animate-pulse rounded" />
            <div className="col-span-6 bg-muted animate-pulse rounded" />
            <div className="col-span-3 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 h-16">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>

        {/* Articles List Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg border p-4">
              <div className="flex items-start gap-4">
                <div className="w-24 h-16 bg-muted animate-pulse rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="h-5 w-3/4 bg-muted animate-pulse rounded mb-2" />
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    </div>
                    <div className="ml-4 w-16 h-6 bg-muted animate-pulse rounded flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-14 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-9 w-48 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
