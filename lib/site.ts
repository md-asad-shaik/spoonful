/** Site-wide settings. The public URL is used for canonical URLs, Open Graph and the sitemap. */

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  // Vercel sets this automatically for production deployments.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export const site = {
  name: "Spoonful",
  tagline: "Simple home cooking, one spoonful at a time",
  description:
    "Spoonful is a recipe blog with simple, tested recipes for breakfast, lunch and dessert.",
  url: getSiteUrl(),
};
