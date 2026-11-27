/**
 * Exports a real WordPress site into data/wordpress.json + public/wp-content/uploads/.
 *
 * Why: once the content is exported, the Next.js site can be deployed to Vercel
 * WITHOUT a public WordPress server. Just leave WORDPRESS_URL empty in production
 * and the app reads this snapshot instead of calling the REST API.
 *
 * Usage:  WORDPRESS_URL=http://spoonful.local npm run data:export
 *         (or put WORDPRESS_URL in .env.local and run `npm run data:export`)
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const origin = (process.env.WORDPRESS_URL || "").replace(/\/$/, "");
if (!origin) {
  console.error("Set WORDPRESS_URL first, e.g. WORDPRESS_URL=http://spoonful.local npm run data:export");
  process.exit(1);
}
const api = `${origin}/wp-json/wp/v2`;

/** Fetch every page of a REST collection (the API returns max 100 items per request). */
async function fetchAll(endpoint, params = "") {
  const items = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = `${api}/${endpoint}?per_page=100&page=${page}${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    totalPages = Number(res.headers.get("X-WP-TotalPages") || 1);
    items.push(...(await res.json()));
    page++;
  } while (page <= totalPages);
  console.log(`  ${endpoint}: ${items.length}`);
  return items;
}

console.log(`Exporting from ${origin}`);
const [posts, pages, categories, tags, media] = await Promise.all([
  fetchAll("posts", "&_embed=wp:featuredmedia,wp:term"),
  fetchAll("pages"),
  fetchAll("categories", "&hide_empty=true"),
  fetchAll("tags", "&hide_empty=true"),
  fetchAll("media"),
]);

// Find every uploaded file we need: featured images + any image used inside content.
const uploadUrls = new Set(media.map((m) => m.source_url));
const uploadPattern = new RegExp(`${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/wp-content/uploads/[^"'\\s)]+`, "g");
for (const item of [...posts, ...pages]) {
  for (const match of item.content.rendered.matchAll(uploadPattern)) uploadUrls.add(match[0]);
}

console.log(`Downloading ${uploadUrls.size} files into public/wp-content/uploads/`);
for (const url of uploadUrls) {
  const relative = new URL(url).pathname; // /wp-content/uploads/2026/11/x.jpg (same path as WordPress)
  const target = path.join(root, "public", decodeURIComponent(relative));
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  skipped ${url} (${res.status})`);
    continue;
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await res.arrayBuffer()));
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  source: "export",
  wordpressOrigin: origin,
  posts,
  pages,
  categories,
  tags,
  media,
};
await mkdir(path.join(root, "data"), { recursive: true });
await writeFile(path.join(root, "data/wordpress.json"), JSON.stringify(snapshot, null, 2) + "\n");
console.log("Done. Wrote data/wordpress.json");
