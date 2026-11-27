import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllPosts,
  getFeaturedImage,
  getPostBySlug,
  getPostCategories,
  getPostTags,
  getRelatedPosts,
  mediaSrc,
} from "@/lib/wordpress";
import { decodeEntities, htmlToText } from "@/lib/html";
import { yoastSchema, yoastToMetadata } from "@/lib/seo";
import { CategoryBadge } from "@/components/CategoryBadge";
import { JsonLd } from "@/components/JsonLd";
import { RecipeGrid } from "@/components/RecipeGrid";
import { WpContent } from "@/components/WpContent";

// ISR: each recipe is static HTML, refreshed at most once an hour.
export const revalidate = 3600;
// A recipe published after the last build isn't in generateStaticParams. It is rendered
// on its first visit and then cached like the others (this is the default, shown for clarity).
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

/** Build every recipe page at build time: /recipes/fluffy-buttermilk-pancakes/ ... */
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

/** SEO title, description, canonical and Open Graph come from Yoast in WordPress. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return yoastToMetadata(post.yoast_head_json, {
    title: decodeEntities(post.title.rendered),
    description: htmlToText(post.excerpt.rendered),
    path: `/recipes/${post.slug}/`,
  });
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const title = decodeEntities(post.title.rendered);
  const image = getFeaturedImage(post);
  const categories = getPostCategories(post);
  const tags = getPostTags(post);
  const related = await getRelatedPosts(post);
  const published = new Date(post.date).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <JsonLd data={yoastSchema(post.yoast_head_json)} />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-tomato">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/recipes/" className="hover:text-tomato">Recipes</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{title}</span>
      </nav>

      <header className="mx-auto max-w-3xl text-center">
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <CategoryBadge key={c.id} category={c} />
          ))}
        </div>
        <h1 className="mt-4 font-serif text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg text-muted">{htmlToText(post.excerpt.rendered)}</p>
        <p className="mt-3 text-sm text-muted">
          Published <time dateTime={post.date}>{published}</time>
        </p>
      </header>

      {image && (
        <div className="relative mx-auto mt-8 aspect-[3/2] max-w-4xl overflow-hidden rounded-3xl bg-butter shadow-md">
          <Image
            src={mediaSrc(image.source_url)}
            alt={image.alt_text || title}
            fill
            // This is the biggest thing on screen (the LCP element), so load it first.
            preload
            sizes="(min-width: 1024px) 896px, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="mx-auto mt-10 max-w-3xl">
        <WpContent html={post.content.rendered} />

        {tags.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-line pt-6">
            <span className="text-sm font-semibold">Tags:</span>
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}/`}
                className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:border-tomato hover:text-tomato"
              >
                #{decodeEntities(tag.name)}
              </Link>
            ))}
          </div>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-line pt-12">
          <h2 className="mb-8 font-serif text-3xl font-bold">You might also like</h2>
          <RecipeGrid posts={related} />
        </section>
      )}
    </article>
  );
}
