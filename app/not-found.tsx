import Link from "next/link";
import { getPosts } from "@/lib/wordpress";
import { RecipeGrid } from "@/components/RecipeGrid";
import { SearchForm } from "@/components/SearchForm";

/**
 * Custom 404 page. Shown for unknown URLs and whenever a page calls notFound().
 * Instead of a dead end, it offers search and the latest recipes.
 */
export default async function NotFound() {
  const latest = await getPosts({ perPage: 3 });

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-xl text-center">
        <p className="font-serif text-7xl font-bold text-tomato">404</p>
        <h1 className="mt-4 font-serif text-3xl font-bold">This recipe isn&apos;t on the menu</h1>
        <p className="mt-3 text-muted">The page may have moved or never existed. Try a search, or start from the home page.</p>
        <div className="mt-8 flex justify-center">
          <SearchForm />
        </div>
        <Link href="/" className="mt-6 inline-block font-semibold text-tomato hover:underline">
          ← Back to home
        </Link>
      </div>
      <section className="mt-16">
        <h2 className="mb-6 font-serif text-2xl font-bold">Latest recipes</h2>
        <RecipeGrid posts={latest.items} />
      </section>
    </div>
  );
}
