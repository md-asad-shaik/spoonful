import type { MetadataRoute } from "next";
import { getAllPages, getAllPosts, getCategories, getPosts, getTags } from "@/lib/wordpress";
import { site } from "@/lib/site";

// Rebuilt at most once an hour, like the pages (ISR).
export const revalidate = 3600;

/**
 * /sitemap.xml — every public URL, so Google can find all pages after the migration.
 * (Yoast's old sitemap was at /sitemap_index.xml; next.config.ts doesn't need a redirect
 * because we submit this new sitemap in Google Search Console.)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, pages, categories, tags, firstPage] = await Promise.all([
    getAllPosts(),
    getAllPages(),
    getCategories(),
    getTags(),
    getPosts({ page: 1 }),
  ]);
  const url = (path: string) => `${site.url}${path}`;
  const latest = posts[0]?.modified;

  return [
    { url: url("/"), lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: url("/recipes/"), lastModified: latest, changeFrequency: "daily", priority: 0.9 },
    ...Array.from({ length: Math.max(firstPage.totalPages - 1, 0) }, (_, i) => ({
      url: url(`/recipes/page/${i + 2}/`),
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
    ...posts.map((post) => ({
      url: url(`/recipes/${post.slug}/`),
      lastModified: post.modified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({ url: url(`/category/${c.slug}/`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...tags.map((t) => ({ url: url(`/tag/${t.slug}/`), changeFrequency: "weekly" as const, priority: 0.5 })),
    ...pages.map((p) => ({ url: url(`/${p.slug}/`), lastModified: p.modified, changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
