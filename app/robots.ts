import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * /robots.txt
 * - Production: allow crawling, hide API routes and search results, point to the sitemap.
 * - Vercel preview deployments: block everything, so test copies never show up in Google.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/search/"] },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
