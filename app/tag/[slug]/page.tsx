import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPosts, getTagBySlug, getTags } from "@/lib/wordpress";
import { decodeEntities } from "@/lib/html";
import { yoastToMetadata } from "@/lib/seo";
import { ArchivePage } from "@/components/ArchivePage";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

/** /tag/vegetarian/ etc. WordPress creates these URLs for every tag, so we keep them too. */
export async function generateStaticParams() {
  const tags = await getTags();
  return tags.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tag = await getTagBySlug((await params).slug);
  if (!tag) return {};
  return yoastToMetadata(tag.yoast_head_json, {
    title: `${decodeEntities(tag.name)} Recipes`,
    path: `/tag/${tag.slug}/`,
  });
}

export default async function TagPage({ params }: Props) {
  const tag = await getTagBySlug((await params).slug);
  if (!tag) notFound();

  // Tags have few recipes, so one page of up to 100 is enough here.
  const posts = await getPosts({ tag: tag.id, perPage: 100 });
  return <ArchivePage eyebrow="Tag" title={`#${decodeEntities(tag.name)}`} posts={posts} basePath={`/tag/${tag.slug}/`} />;
}
