/**
 * 301 redirects for every old WordPress URL that does NOT exist at the same path in Next.js.
 * next.config.ts calls buildRedirects() once at build time.
 *
 * Two kinds:
 *   1. Pattern rules: one rule covers many URLs (e.g. any old date-based permalink).
 *   2. Content rules: built from the list of posts, e.g. the old /%postname%/ links.
 *
 * Query-string links (/?p=123, /?page_id=, /?cat=, /?s=) are handled in proxy.ts instead,
 * because next.config redirects would copy the old query string onto the new URL.
 *
 * Why 301 and not Next.js's default 308? Both mean "moved permanently". 301 is the code SEO
 * tools and most migration guides expect, and it's safe because these are all GET pages.
 */
import { getAllPosts, isSnapshotMode } from "./wordpress";

export interface RedirectRule {
  source: string;
  destination: string;
  statusCode: 301 | 302 | 307 | 308;
}

const MOVED = 301 as const;

/** Rules that don't need any data. Destinations end in "/" because trailingSlash is on. */
export const patternRedirects: RedirectRule[] = [
  // Old date-based permalinks: /2024/05/12/pancakes/ and /2024/05/pancakes/ -> /recipes/pancakes/
  { source: "/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug", destination: "/recipes/:slug/", statusCode: MOVED },
  { source: "/:year(\\d{4})/:month(\\d{2})/:slug", destination: "/recipes/:slug/", statusCode: MOVED },

  // WordPress paginates the blog at /page/2/. Our recipe list lives at /recipes/page/2/.
  { source: "/page/:n(\\d+)", destination: "/recipes/page/:n/", statusCode: MOVED },

  // Page 1 has no "/page/1/" URL: send it to the archive root (WordPress does the same).
  { source: "/recipes/page/1", destination: "/recipes/", statusCode: MOVED },
  { source: "/category/:slug/page/1", destination: "/category/:slug/", statusCode: MOVED },
  { source: "/tag/:slug/page/1", destination: "/tag/:slug/", statusCode: MOVED },

  // Nested category URLs (/category/parent/child/) -> we only use the child slug.
  { source: "/category/:parent/:child((?!page$)[^/]+)", destination: "/category/:child/", statusCode: MOVED },

  // WordPress's default privacy page slug, and author archives (single-author blog).
  { source: "/privacy-policy", destination: "/privacy/", statusCode: MOVED },
  { source: "/author/:name", destination: "/about/", statusCode: MOVED },
];

/** Before /recipes/%postname%/ the site used /%postname%/. Old links like /chicken-biryani/ still work. */
export async function contentRedirects(): Promise<RedirectRule[]> {
  const posts = await getAllPosts();
  return posts.map((p) => ({ source: `/${p.slug}`, destination: `/recipes/${p.slug}/`, statusCode: MOVED }));
}

export async function buildRedirects(): Promise<RedirectRule[]> {
  let fromContent: RedirectRule[] = [];
  try {
    fromContent = await contentRedirects();
  } catch (error) {
    // Don't fail the whole build if WordPress is down; the pattern rules still apply.
    console.warn("[redirects] Could not load posts for slug redirects:", (error as Error).message);
  }
  const source = isSnapshotMode ? "snapshot" : "WordPress REST API";
  console.log(`[redirects] ${patternRedirects.length} pattern rules + ${fromContent.length} post rules (from ${source})`);
  return [...patternRedirects, ...fromContent];
}
