/** Grey placeholder cards shown while recipes are loading. */
export function RecipeGridSkeleton({ count = 6, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid animate-pulse gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`} aria-busy="true" aria-label="Loading recipes">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="aspect-[3/2] bg-butter" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-20 rounded-full bg-butter" />
            <div className="h-6 w-3/4 rounded bg-butter" />
            <div className="h-4 rounded bg-butter" />
          </div>
        </div>
      ))}
    </div>
  );
}
