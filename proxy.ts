import { NextResponse, type NextRequest } from "next/server";
import { getCategoryById, getPageById, getPostById } from "@/lib/wordpress";

/**
 * proxy.ts (called "middleware" before Next.js 16) runs BEFORE a page is rendered.
 *
 * It handles old WordPress "plain" links that use a query string instead of a path:
 *   /?p=123        -> /recipes/<slug>/      (post ID)
 *   /?page_id=45   -> /<slug>/              (page ID)
 *   /?cat=3        -> /category/<slug>/     (category ID)
 *   /?s=pancakes   -> /search/?q=pancakes   (WordPress search)
 *
 * Why here and not in next.config.ts like the other redirects?
 * next.config redirects always copy the old query string onto the new URL, so /?p=123
 * would land on /recipes/slug/?p=123. Here we build the new URL ourselves, so it's clean.
 * Bonus: we look the ID up live, so posts published after the last build work too.
 */
export async function proxy(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = (key: string) => {
    const value = params.get(key);
    return value && /^\d+$/.test(value) ? Number(value) : null;
  };

  let destination: string | null = null;
  const postId = id("p");
  const pageId = id("page_id");
  const catId = id("cat");

  if (params.has("s")) {
    destination = `/search/?q=${encodeURIComponent(params.get("s") ?? "")}`;
  } else if (postId) {
    const post = await getPostById(postId);
    if (post) destination = `/recipes/${post.slug}/`;
  } else if (pageId) {
    const page = await getPageById(pageId);
    if (page) destination = `/${page.slug}/`;
  } else if (catId) {
    const category = await getCategoryById(catId);
    if (category) destination = `/category/${category.slug}/`;
  }

  // Unknown ID: just show the home page, like a normal request.
  if (!destination) return NextResponse.next();
  return NextResponse.redirect(new URL(destination, request.url), 301);
}

// Only run on the home page, and only when one of these query keys is present.
// Every other request skips the proxy completely, so it costs nothing.
export const config = {
  matcher: [
    { source: "/", has: [{ type: "query", key: "p" }] },
    { source: "/", has: [{ type: "query", key: "page_id" }] },
    { source: "/", has: [{ type: "query", key: "cat" }] },
    { source: "/", has: [{ type: "query", key: "s" }] },
  ],
};
