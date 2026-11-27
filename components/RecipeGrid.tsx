import type { Post } from "@/lib/wordpress";
import { RecipeCard } from "./RecipeCard";

/** Responsive grid: 1 column on phones, 2 on tablets, 3 on desktop. */
export function RecipeGrid({ posts, preloadFirst = 0 }: { posts: Post[]; preloadFirst?: number }) {
  if (posts.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">No recipes found.</p>;
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post, i) => (
        <RecipeCard key={post.id} post={post} preload={i < preloadFirst} />
      ))}
    </div>
  );
}
