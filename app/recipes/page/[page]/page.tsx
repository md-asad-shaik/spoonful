import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPosts } from "@/lib/wordpress";
import { parsePageNumber } from "@/lib/params";
import { ArchivePage } from "@/components/ArchivePage";

export const revalidate = 3600;

type Props = { params: Promise<{ page: string }> };

/** Pre-build /recipes/page/2/ ... /recipes/page/N/ using X-WP-TotalPages from WordPress. */
export async function generateStaticParams() {
  const { totalPages } = await getPosts({ page: 1 });
  return Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => ({ page: String(i + 2) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `All Recipes – Page ${page}`,
    alternates: { canonical: `/recipes/page/${page}/` },
  };
}

export default async function RecipesPagedPage({ params }: Props) {
  const page = parsePageNumber((await params).page);
  if (!page) notFound();

  const posts = await getPosts({ page });
  if (posts.items.length === 0) notFound(); // e.g. /recipes/page/99/

  return <ArchivePage eyebrow="Recipe index" title="All recipes" posts={posts} basePath="/recipes/" />;
}
