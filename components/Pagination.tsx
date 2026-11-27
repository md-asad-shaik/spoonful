import Link from "next/link";

interface Props {
  currentPage: number;
  totalPages: number; // from WordPress's X-WP-TotalPages header
  /** Archive root with trailing slash, e.g. "/recipes/" or "/category/lunch/" */
  basePath: string;
  /** For search results: page links become /search/?q=...&page=2 instead of /page/2/ */
  query?: Record<string, string>;
}

/**
 * Builds the URL for a page number. Archives use the same URLs as WordPress:
 * page 1 = /recipes/, page 2 = /recipes/page/2/
 */
export function pageHref({ basePath, query }: Pick<Props, "basePath" | "query">, page: number): string {
  if (query) {
    const params = new URLSearchParams(query);
    if (page > 1) params.set("page", String(page));
    return `${basePath}?${params.toString()}`;
  }
  return page === 1 ? basePath : `${basePath}page/${page}/`;
}

export function Pagination({ currentPage, totalPages, basePath, query }: Props) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const link = "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold";

  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {currentPage > 1 && (
        <Link href={pageHref({ basePath, query }, currentPage - 1)} rel="prev" className={`${link} border border-line hover:bg-butter`}>
          ← Previous
        </Link>
      )}
      {pages.map((page) =>
        page === currentPage ? (
          <span key={page} aria-current="page" className={`${link} bg-tomato text-white`}>
            {page}
          </span>
        ) : (
          <Link key={page} href={pageHref({ basePath, query }, page)} className={`${link} border border-line hover:bg-butter`}>
            <span className="sr-only">Page </span>
            {page}
          </Link>
        ),
      )}
      {currentPage < totalPages && (
        <Link href={pageHref({ basePath, query }, currentPage + 1)} rel="next" className={`${link} border border-line hover:bg-butter`}>
          Next →
        </Link>
      )}
    </nav>
  );
}
