import type { NextConfig } from "next";

const WORDPRESS_URL = (process.env.WORDPRESS_URL || "").replace(/\/$/, "");
const wp = WORDPRESS_URL ? new URL(WORDPRESS_URL) : null;
const isLocalWordPress = !!wp && /(^localhost$|\.local$|^127\.)/.test(wp.hostname);

const nextConfig: NextConfig = {
  // Keep WordPress-style URLs that end with a slash.
  trailingSlash: true,
  images: {
    remotePatterns: wp ? [new URL(`${wp.origin}/wp-content/uploads/**`)] : [],
    dangerouslyAllowLocalIP: isLocalWordPress,
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
