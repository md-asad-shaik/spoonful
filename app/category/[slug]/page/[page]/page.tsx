import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getCategoryBySlug, getPosts } from "@/lib/wordpress";
import { decodeEntities } from "@/lib/html";
import { parsePageNumber } from "@/lib/params";
import { ArchivePage } from "@/components/ArchivePage";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string; page: string }> };

/** /category/lunch/page/2/ — kept at the same path as WordPress, so no redirect is needed. */
export async function generateStaticParams() {
  const categories = await getCategories();
  const params: { slug: string; page: string }[] = [];
  for (const category of categories) {
    const { totalPages } = await getPosts({ category: category.id });
    for (let page = 2; page <= totalPages; page++) params.push({ slug: category.slug, page: String(page) });
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: `${decodeEntities(category.name)} Recipes – Page ${page}`,
    alternates: { canonical: `/category/${slug}/page/${page}/` },
  };
}

export default async function CategoryPagedPage({ params }: Props) {
  const { slug, page: rawPage } = await params;
  const page = parsePageNumber(rawPage);
  const category = await getCategoryBySlug(slug);
  if (!page || !category) notFound();

  const posts = await getPosts({ category: category.id, page });
  if (posts.items.length === 0) notFound();

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
