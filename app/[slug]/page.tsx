import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPages, getPageBySlug } from "@/lib/wordpress";
import { decodeEntities, stripShortcodes } from "@/lib/html";
import { yoastToMetadata } from "@/lib/seo";
import { WpContent } from "@/components/WpContent";

/**
 * WordPress pages at the root: /about/, /privacy/ (and any page added later).
 * /contact/ has its own folder because it needs the React contact form.
 */
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const pages = await getAllPages();
  return pages.filter((p) => p.slug !== "contact").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPageBySlug((await params).slug);
  if (!page) return {};
  return yoastToMetadata(page.yoast_head_json, {
    title: decodeEntities(page.title.rendered),
    path: `/${page.slug}/`,
  });
}

export default async function WordPressPage({ params }: Props) {
  const page = await getPageBySlug((await params).slug);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="mb-8 font-serif text-4xl font-bold sm:text-5xl">{decodeEntities(page.title.rendered)}</h1>
      <WpContent html={stripShortcodes(page.content.rendered)} />
    </article>
  );
}
