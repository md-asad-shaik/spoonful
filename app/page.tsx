import { getCategories, getPosts, isSnapshotMode } from "@/lib/wordpress";
import { decodeEntities } from "@/lib/html";

export const revalidate = 3600;

/** Temporary page to check the data layer works. Replaced by the real home page in phase 3. */
export default async function DataCheckPage() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">Spoonful: data layer check</h1>
      <p className="mt-2">
        Source: {isSnapshotMode ? "data/wordpress.json snapshot" : "WordPress REST API"} · {posts.total} posts ·{" "}
        {posts.totalPages} pages (X-WP-TotalPages) · {categories.length} categories
      </p>
      <ul className="mt-6 list-disc space-y-1 pl-6">
        {posts.items.map((post) => (
          <li key={post.id}>
            {decodeEntities(post.title.rendered)} <code>/recipes/{post.slug}/</code>
          </li>
        ))}
      </ul>
    </main>
  );
}
