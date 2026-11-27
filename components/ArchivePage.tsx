import type { Paginated, Post } from "@/lib/wordpress";
import { Pagination } from "./Pagination";
import { RecipeGrid } from "./RecipeGrid";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  posts: Paginated<Post>;
  basePath: string;
}

/** Shared layout for /recipes/, /category/x/ and /tag/x/ (and their /page/N/ versions). */
export function ArchivePage({ eyebrow, title, description, posts, basePath }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-10 max-w-2xl">
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-widest text-tomato">{eyebrow}</p>}
        <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">{title}</h1>
        {description && <p className="mt-4 text-lg text-muted">{description}</p>}
        <p className="mt-2 text-sm text-muted">
          {posts.total} {posts.total === 1 ? "recipe" : "recipes"}
          {posts.totalPages > 1 && ` · Page ${posts.page} of ${posts.totalPages}`}
        </p>
      </header>
      <RecipeGrid posts={posts.items} preloadFirst={3} />
      <Pagination currentPage={posts.page} totalPages={posts.totalPages} basePath={basePath} />
    </div>
  );
}
