/**
 * Turns Yoast SEO data (yoast_head_json from the REST API) into a Next.js Metadata object.
 *
 * This is how the SEO work done in WordPress survives the migration: the editor still
 * writes the SEO title and meta description in the Yoast box, and Next.js renders them.
 *
 * One important fix: Yoast builds URLs with the WordPress domain (e.g. http://spoonful.local).
 * Canonical and og:url must point at the NEW site, so we rewrite them to a path and let
 * `metadataBase` (set in app/layout.tsx) turn the path into a full URL.
 */
import type { Metadata } from "next";
import { mediaSrc, wordpressOrigin, type YoastHeadJson } from "./wordpress";
import { site } from "./site";

/** "http://spoonful.local/recipes/pancakes/" -> "/recipes/pancakes/" */
export function toSitePath(url: string | undefined, fallback: string): string {
  if (!url) return fallback;
  if (url.startsWith(wordpressOrigin)) return url.slice(wordpressOrigin.length) || "/";
  try {
    return new URL(url).pathname;
  } catch {
    return fallback;
  }
}

interface Fallback {
  title: string;
  description?: string;
  path: string; // our path for this page, e.g. "/recipes/pancakes/"
}

export function yoastToMetadata(yoast: YoastHeadJson | undefined, fallback: Fallback): Metadata {
  const title = yoast?.title || `${fallback.title} | ${site.name}`;
  const description = yoast?.description || fallback.description;
  const path = toSitePath(yoast?.canonical, fallback.path);
  const images = (yoast?.og_image ?? []).map((img) => ({
    url: mediaSrc(img.url),
    width: img.width,
    height: img.height,
  }));

  const shared = {
    title: yoast?.og_title || title,
    description: yoast?.og_description || description,
    url: path,
    siteName: yoast?.og_site_name || site.name,
    locale: yoast?.og_locale || "en_US",
    images,
  };

  return {
    // "absolute" because Yoast's title already ends with "| Spoonful",
    // so the layout's title template must not add it again.
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    robots: {
      index: yoast?.robots?.index !== "noindex",
      follow: yoast?.robots?.follow !== "nofollow",
    },
    openGraph:
      yoast?.og_type === "article"
        ? {
            ...shared,
            type: "article",
            publishedTime: yoast.article_published_time,
            modifiedTime: yoast.article_modified_time,
          }
        : { ...shared, type: "website" },
    twitter: {
      card: yoast?.twitter_card === "summary" ? "summary" : "summary_large_image",
      title: shared.title,
      description: shared.description,
      images: images.map((i) => i.url),
    },
  };
}

/**
 * Yoast's JSON-LD schema (structured data for Google), with the WordPress
 * domain replaced by the new site URL.
 */
export function yoastSchema(yoast: YoastHeadJson | undefined): Record<string, unknown> | null {
  if (!yoast?.schema) return null;
  const json = JSON.stringify(yoast.schema).split(wordpressOrigin).join(site.url);
  return JSON.parse(json);
}
