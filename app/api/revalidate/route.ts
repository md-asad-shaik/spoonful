import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CACHE_TAG } from "@/lib/wordpress";

/**
 * POST /api/revalidate/ — on-demand ISR.
 *
 * Time-based ISR refreshes pages at most once an hour. This route lets WordPress say
 * "content changed, refresh now". The small plugin in wordpress/mu-plugins/ calls it
 * whenever a post, page or category is saved.
 *
 * Protected by a shared secret so strangers can't flush the cache.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  // Every WordPress fetch is tagged "wordpress" in lib/wordpress.ts.
  // { expire: 0 } = don't serve the old version again; the next visitor gets fresh content.
  revalidateTag(CACHE_TAG, { expire: 0 });
  // Also refresh every page (the menu, lists and sitemap all show WordPress content).
  revalidatePath("/", "layout");

  const body = await request.json().catch(() => ({}));
  console.log("[revalidate]", body?.reason ?? "manual");
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}
