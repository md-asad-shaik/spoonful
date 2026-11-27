import type { Metadata } from "next";
import { Suspense } from "react";
import { getPosts } from "@/lib/wordpress";
import { Pagination } from "@/components/Pagination";
import { RecipeGrid } from "@/components/RecipeGrid";
import { SearchForm } from "@/components/SearchForm";
import { RecipeGridSkeleton } from "@/components/RecipeGridSkeleton";

export const metadata: Metadata = {
  title: "Search",
  // Search result pages shouldn't appear in Google (thin, endless duplicate pages).
  robots: { index: false, follow: true },
  alternates: { canonical: "/search/" },
};

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

/**
 * /search/?q=paneer — uses the WordPress REST API's ?search= parameter.
 * Reading searchParams makes this page dynamic (rendered per request), which is
 * what we want: there are endless possible search terms, we can't pre-build them.
 */
export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1" } = await searchParams;
  const query = q.trim();
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-4xl font-bold sm:text-5xl">Search recipes</h1>
      <div className="mt-6">
        <SearchForm defaultValue={query} autoFocus={!query} />
      </div>

      {query ? (
        // key makes React show the skeleton again whenever the search changes.
        <Suspense key={`${query}-${pageNumber}`} fallback={<RecipeGridSkeleton className="mt-10" />}>
          <SearchResults query={query} page={pageNumber} />
        </Suspense>
      ) : (
        <p className="mt-10 text-muted">Type an ingredient or dish name, for example “mango” or “eggs”.</p>
      )}
    </div>
  );
}

async function SearchResults({ query, page }: { query: string; page: number }) {
  const results = await getPosts({ search: query, page });
  return (
    <section className="mt-10" aria-live="polite">
      <p className="mb-6 text-muted">
        {results.total} {results.total === 1 ? "result" : "results"} for <strong className="text-ink">“{query}”</strong>
      </p>
      <RecipeGrid posts={results.items} />
      <Pagination currentPage={page} totalPages={results.totalPages} basePath="/search/" query={{ q: query }} />
    </section>
  );
}
