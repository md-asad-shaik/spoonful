/**
 * lib/wordpress.ts — the ONLY file that talks to WordPress.
 *
 * Every page and component asks this file for data. That gives us one place to:
 *   - define TypeScript types for what WordPress returns (Post, Page, Category, Tag, Media)
 *   - set caching (ISR): every request is cached for REVALIDATE seconds and tagged "wordpress"
 *   - switch the data source:
 *       WORDPRESS_URL is set   -> live WordPress REST API (/wp-json/wp/v2/...)
 *       WORDPRESS_URL is empty -> data/wordpress.json, a snapshot with the exact same shape
 *                                 (made by `npm run data:export` or `npm run data:sample`)
 *
 * NOTE: imports here are relative (not "@/...") because next.config.ts also imports
 * this file (through lib/redirects.ts) to build the redirect list.
 */
import snapshotJson from "../data/wordpress.json";

/* =====================================================================
 * Types — only the fields we use. The REST API returns many more.
 * ===================================================================== */

export interface Rendered {
  rendered: string;
}

export interface Media {
  id: number;
  source_url: string;
  alt_text: string;
  mime_type: string;
  title: Rendered;
  media_details: { width: number; height: number; file?: string };
}

/** Yoast SEO adds this object to every post, page and term in the REST API. */
export interface YoastHeadJson {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: { index?: string; follow?: string };
  og_locale?: string;
  og_type?: string;
  og_title?: string;
  og_description?: string;
  og_url?: string;
  og_site_name?: string;
  og_image?: { url: string; width?: number; height?: number; type?: string }[];
  article_published_time?: string;
  article_modified_time?: string;
  twitter_card?: string;
  schema?: Record<string, unknown>;
}

export interface Term {
  id: number;
  name: string;
  slug: string;
  link: string;
  taxonomy: string;
  count?: number;
  description?: string;
  yoast_head_json?: YoastHeadJson;
}
export type Category = Term;
export type Tag = Term;

export interface Post {
  id: number;
  date: string;
  modified: string;
  slug: string;
  link: string;
  title: Rendered;
  content: Rendered;
  excerpt: Rendered;
  featured_media: number;
  categories: number[];
  tags: number[];
  yoast_head_json?: YoastHeadJson;
  // Filled in when we request ?_embed — saves extra API calls for images and terms.
  _embedded?: {
    "wp:featuredmedia"?: Media[];
    "wp:term"?: Term[][];
  };
}

export interface Page {
  id: number;
  date: string;
  modified: string;
  slug: string;
  link: string;
  title: Rendered;
  content: Rendered;
  excerpt: Rendered;
  yoast_head_json?: YoastHeadJson;
}

/** One page of results plus the totals WordPress sends in the X-WP-Total / X-WP-TotalPages headers. */
export interface Paginated<T> {
  items: T[];
  page: number;
  total: number;
  totalPages: number;
}

interface Snapshot {
  wordpressOrigin: string;
  posts: Post[];
  pages: Page[];
  categories: Category[];
  tags: Tag[];
}

/* =====================================================================
 * Config
 * ===================================================================== */

const WORDPRESS_URL = (process.env.WORDPRESS_URL || "").replace(/\/$/, "");
const snapshot = snapshotJson as unknown as Snapshot;

export const isSnapshotMode = WORDPRESS_URL === "";
export const PER_PAGE = 6;
/** ISR: cached responses are refreshed in the background at most once per hour. */
export const REVALIDATE_SECONDS = 3600;
export const CACHE_TAG = "wordpress";

/** The WordPress address that appears inside content, Yoast canonicals, image URLs, etc. */
export const wordpressOrigin = isSnapshotMode ? snapshot.wordpressOrigin : WORDPRESS_URL;

export class WordPressError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "WordPressError";
  }
}

/* =====================================================================
 * Low-level fetch (REST mode)
 * ===================================================================== */

type Params = Record<string, string | number | undefined>;

async function wpFetch<T>(endpoint: string, params: Params = {}) {
  const url = new URL(`${WORDPRESS_URL}/wp-json/wp/v2/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] } });
  } catch {
    throw new WordPressError(`Could not reach WordPress at ${WORDPRESS_URL}. Is the site running?`);
  }

  // Asking for a page after the last one returns 400. Treat it as "no results".
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    if (body?.code === "rest_post_invalid_page_number") {
      return { data: [] as T, total: 0, totalPages: 0 };
    }
  }
  if (!res.ok) {
    throw new WordPressError(`WordPress returned ${res.status} for ${url.pathname}`, res.status);
  }

  return {
    data: (await res.json()) as T,
    total: Number(res.headers.get("X-WP-Total") ?? 0),
    totalPages: Number(res.headers.get("X-WP-TotalPages") ?? 0),
  };
}

/** Fetch every item of a collection, 100 at a time (the REST API maximum). */
async function wpFetchAll<T>(endpoint: string, params: Params = {}): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await wpFetch<T[]>(endpoint, { ...params, per_page: 100, page });
    all.push(...res.data);
    totalPages = res.totalPages;
    page++;
  } while (page <= totalPages);
  return all;
}

/** Same pagination maths as WordPress, used in snapshot mode. */
function paginate<T>(items: T[], page: number, perPage: number): Paginated<T> {
  const totalPages = Math.ceil(items.length / perPage);
  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    page,
    total: items.length,
    totalPages,
  };
}

const EMBED = "wp:featuredmedia,wp:term";

/* =====================================================================
 * Posts (recipes)
 * ===================================================================== */

export interface PostQuery {
  page?: number;
  perPage?: number;
  category?: number;
  tag?: number;
  search?: string;
  exclude?: number[];
}

export async function getPosts(query: PostQuery = {}): Promise<Paginated<Post>> {
  const { page = 1, perPage = PER_PAGE, category, tag, search, exclude = [] } = query;

  if (isSnapshotMode) {
    const q = search?.trim().toLowerCase();
    const filtered = snapshot.posts.filter(
      (p) =>
        (!category || p.categories.includes(category)) &&
        (!tag || p.tags.includes(tag)) &&
        !exclude.includes(p.id) &&
        (!q || `${p.title.rendered} ${p.excerpt.rendered} ${p.content.rendered}`.toLowerCase().includes(q)),
    );
    return paginate(filtered, page, perPage);
  }

  const res = await wpFetch<Post[]>("posts", {
    page,
    per_page: perPage,
    categories: category,
    tags: tag,
    search,
    exclude: exclude.length ? exclude.join(",") : undefined,
    _embed: EMBED,
  });
  return { items: res.data, page, total: res.total, totalPages: res.totalPages };
}

export async function getAllPosts(): Promise<Post[]> {
  if (isSnapshotMode) return snapshot.posts;
  return wpFetchAll<Post>("posts", { _embed: EMBED });
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (isSnapshotMode) return snapshot.posts.find((p) => p.slug === slug) ?? null;
  const res = await wpFetch<Post[]>("posts", { slug, _embed: EMBED });
  return res.data[0] ?? null;
}

/** Fetch one item by numeric ID. Returns null when WordPress answers 404. */
async function wpFetchById<T>(endpoint: string, id: number): Promise<T | null> {
  try {
    return (await wpFetch<T>(`${endpoint}/${id}`)).data;
  } catch (error) {
    if (error instanceof WordPressError && error.status === 404) return null;
    throw error;
  }
}

/** Used by proxy.ts to redirect old "plain" links like /?p=123. */
export async function getPostById(id: number): Promise<Post | null> {
  if (isSnapshotMode) return snapshot.posts.find((p) => p.id === id) ?? null;
  return wpFetchById<Post>("posts", id);
}

/** Recipes from the same category, topped up with the latest recipes if there aren't enough. */
export async function getRelatedPosts(post: Post, limit = 3): Promise<Post[]> {
  const sameCategory = await getPosts({ category: post.categories[0], exclude: [post.id], perPage: limit });
  let related = sameCategory.items;
  if (related.length < limit) {
    const latest = await getPosts({ exclude: [post.id, ...related.map((p) => p.id)], perPage: limit - related.length });
    related = [...related, ...latest.items];
  }
  return related;
}

/* =====================================================================
 * Pages (About, Contact, Privacy)
 * ===================================================================== */

export async function getAllPages(): Promise<Page[]> {
  if (isSnapshotMode) return snapshot.pages;
  return wpFetchAll<Page>("pages");
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  if (isSnapshotMode) return snapshot.pages.find((p) => p.slug === slug) ?? null;
  const res = await wpFetch<Page[]>("pages", { slug });
  return res.data[0] ?? null;
}

export async function getPageById(id: number): Promise<Page | null> {
  if (isSnapshotMode) return snapshot.pages.find((p) => p.id === id) ?? null;
  return wpFetchById<Page>("pages", id);
}

/* =====================================================================
 * Categories and tags
 * ===================================================================== */

export async function getCategories(): Promise<Category[]> {
  const all = isSnapshotMode
    ? snapshot.categories
    : await wpFetchAll<Category>("categories", { hide_empty: "true" });
  return all.filter((c) => c.slug !== "uncategorized");
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (isSnapshotMode) return snapshot.categories.find((c) => c.slug === slug) ?? null;
  const res = await wpFetch<Category[]>("categories", { slug });
  return res.data[0] ?? null;
}

export async function getCategoryById(id: number): Promise<Category | null> {
  if (isSnapshotMode) return snapshot.categories.find((c) => c.id === id) ?? null;
  return wpFetchById<Category>("categories", id);
}

export async function getTags(): Promise<Tag[]> {
  if (isSnapshotMode) return snapshot.tags;
  return wpFetchAll<Tag>("tags", { hide_empty: "true" });
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  if (isSnapshotMode) return snapshot.tags.find((t) => t.slug === slug) ?? null;
  const res = await wpFetch<Tag[]>("tags", { slug });
  return res.data[0] ?? null;
}

/* =====================================================================
 * Small helpers for reading embedded data
 * ===================================================================== */

export function getFeaturedImage(post: Post): Media | null {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  // A deleted image comes back as an error object without source_url.
  return media?.source_url ? media : null;
}

export function getPostCategories(post: Post): Category[] {
  return (post._embedded?.["wp:term"] ?? []).flat().filter((t) => t.taxonomy === "category");
}

export function getPostTags(post: Post): Tag[] {
  return (post._embedded?.["wp:term"] ?? []).flat().filter((t) => t.taxonomy === "post_tag");
}

/**
 * Image URL to give next/image.
 * Snapshot mode: images were copied to /public/wp-content/uploads, so we drop the
 * WordPress domain and serve them from our own site, at the same path.
 * REST mode: keep the WordPress URL (allowed in next.config.ts images.remotePatterns).
 */
export function mediaSrc(url: string): string {
  if (isSnapshotMode && url.startsWith(wordpressOrigin)) return url.slice(wordpressOrigin.length);
  return url;
}
