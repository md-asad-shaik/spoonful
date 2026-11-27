import Link from "next/link";
import type { Metadata } from "next";
import { getCategories, getPosts } from "@/lib/wordpress";
import { decodeEntities } from "@/lib/html";
import { site } from "@/lib/site";
import { RecipeGrid } from "@/components/RecipeGrid";
import { SearchForm } from "@/components/SearchForm";

// ISR: build this page as static HTML, then rebuild it in the background
// at most once an hour so new WordPress posts appear without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: `${site.name} | ${site.tagline}` },
  alternates: { canonical: "/" },
};

const categoryEmoji: Record<string, string> = { breakfast: "🥞", lunch: "🥗", desserts: "🍰" };

export default async function HomePage() {
  // Both requests run at the same time instead of one after the other.
  const [latest, categories] = await Promise.all([getPosts({ perPage: 6 }), getCategories()]);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-linear-to-b from-butter to-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:py-24">
          <p className="rounded-full bg-white px-4 py-1 text-sm font-semibold text-tomato shadow-sm">
            {latest.total} tested recipes
          </p>
          <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            Simple home cooking, <span className="text-tomato">one spoonful</span> at a time.
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            Easy breakfasts, lunches that pack well and desserts for every skill level. Every recipe is tested in a
            normal home kitchen.
          </p>
          <SearchForm />
        </div>
      </section>

      {/* Latest recipes */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl font-bold">Latest recipes</h2>
          <Link href="/recipes/" className="font-semibold text-tomato hover:underline">
            View all →
          </Link>
        </div>
        <RecipeGrid posts={latest.items} preloadFirst={3} />
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-8 font-serif text-3xl font-bold">Browse by category</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}/`}
              className="group rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-tomato"
            >
              <span className="text-4xl" aria-hidden="true">{categoryEmoji[category.slug] ?? "🍽️"}</span>
              <h3 className="mt-3 font-serif text-2xl font-semibold group-hover:text-tomato">
                {decodeEntities(category.name)}
              </h3>
              <p className="mt-1 text-sm text-muted">{category.description}</p>
              <p className="mt-3 text-sm font-semibold text-tomato">{category.count} recipes →</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
