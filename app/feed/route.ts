import { getPosts } from "@/lib/wordpress";
import { decodeEntities, htmlToText } from "@/lib/html";
import { site } from "@/lib/site";

export const revalidate = 3600;

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * /feed/ — RSS feed at the same URL WordPress used, so feed readers and
 * email newsletter tools that pull from it keep working after the move.
 */
export async function GET() {
  const { items } = await getPosts({ perPage: 20 });

  const entries = items
    .map((post) => {
      const link = `${site.url}/recipes/${post.slug}/`;
      return `    <item>
      <title>${escapeXml(decodeEntities(post.title.rendered))}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(post.date + "Z").toUTCString()}</pubDate>
      <description>${escapeXml(htmlToText(post.excerpt.rendered))}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${site.url}/</link>
    <description>${escapeXml(site.tagline)}</description>
    <language>en-US</language>
    <atom:link href="${site.url}/feed/" rel="self" type="application/rss+xml" />
${entries}
  </channel>
</rss>`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
