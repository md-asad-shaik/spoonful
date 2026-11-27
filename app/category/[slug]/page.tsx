import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getCategoryBySlug, getPosts } from "@/lib/wordpress";
import { decodeEntities } from "@/lib/html";
import { yoastToMetadata } from "@/lib/seo";
import { ArchivePage } from "@/components/ArchivePage";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

/** /category/breakfast/, /category/lunch/, /category/desserts/ — same URLs as WordPress. */
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) return {};
  return yoastToMetadata(category.yoast_head_json, {
    title: `${decodeEntities(category.name)} Recipes`,
    description: category.description,
    path: `/category/${category.slug}/`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) notFound();

  const posts = await getPosts({ category: category.id, page: 1 });
  return (
    <ArchivePage
      eyebrow="Category"
      title={decodeEntities(category.name)}
      description={category.description}
      posts={posts}
      basePath={`/category/${category.slug}/`}
    />
  );
}
