import { RecipeGridSkeleton } from "@/components/RecipeGridSkeleton";

/**
 * loading.tsx = automatic loading state. Next.js wraps the page in <Suspense> and shows
 * this while the page's data is loading (e.g. when clicking a link to a page that
 * isn't cached yet).
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10 h-12 w-64 animate-pulse rounded-lg bg-butter" />
      <RecipeGridSkeleton />
    </div>
  );
}
