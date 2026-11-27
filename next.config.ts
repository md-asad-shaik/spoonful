import type { NextConfig } from "next";
import { buildRedirects } from "./lib/redirects";

const WORDPRESS_URL = (process.env.WORDPRESS_URL || "").replace(/\/$/, "");
const wp = WORDPRESS_URL ? new URL(WORDPRESS_URL) : null;
// LocalWP sites (spoonful.local) resolve to 127.0.0.1. next/image refuses to fetch from
// local IPs unless we allow it. Only allowed for local WordPress, never for a public one.
const isLocalWordPress = !!wp && /(^localhost$|\.local$|^127\.)/.test(wp.hostname);

const nextConfig: NextConfig = {
  // WordPress URLs end with a slash (/recipes/pancakes/). Keeping that means every
  // old URL stays exactly the same, so no redirects and no lost SEO for normal pages.
  trailingSlash: true,

  images: {
    // Allow next/image to optimise images from the WordPress media library.
    remotePatterns: wp ? [new URL(`${wp.origin}/wp-content/uploads/**`)] : [],
    dangerouslyAllowLocalIP: isLocalWordPress,
  },

  // Old WordPress URLs -> new URLs (301). See lib/redirects.ts.
  async redirects() {
    const rules = await buildRedirects();
    if (wp) {
      // Editors still have bookmarks to /wp-admin. Send them to the real WordPress admin.
      rules.push(
        { source: "/wp-admin/:path*", destination: `${wp.origin}/wp-admin/:path*`, statusCode: 302 },
        { source: "/wp-login.php", destination: `${wp.origin}/wp-login.php`, statusCode: 302 },
      );
    }
    return rules;
  },

  // Image URLs on Google, Pinterest and other sites point at /wp-content/uploads/... on our
  // domain. In snapshot mode those files are in /public. In live mode, proxy them to WordPress.
  async rewrites() {
    if (!wp) return [];
    return [{ source: "/wp-content/uploads/:path*", destination: `${wp.origin}/wp-content/uploads/:path*` }];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
