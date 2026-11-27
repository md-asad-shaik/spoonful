/**
 * Builds data/wordpress.json from wordpress/seed/content.json WITHOUT a running WordPress.
 *
 * The output has the exact same shape as the WordPress REST API (with ?_embed and
 * Yoast's yoast_head_json), so the Next.js app can't tell the difference.
 * It also copies the seed images into public/wp-content/uploads/, the same path
 * WordPress uses, so image URLs stay identical.
 *
 * Usage:  npm run data:sample
 * When you have a real WordPress running, use `npm run data:export` instead.
 */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const ORIGIN = "http://spoonful.local"; // the LocalWP address the seed script targets
const UPLOADS = "2026/11";

const content = JSON.parse(await readFile(path.join(root, "wordpress/seed/content.json"), "utf8"));
const siteName = content.site.name;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const iso = (d) => d.slice(0, 19);

function robots() {
  return {
    index: "index",
    follow: "follow",
    "max-snippet": "max-snippet:-1",
    "max-image-preview": "max-image-preview:large",
    "max-video-preview": "max-video-preview:-1",
  };
}

function yoast({ title, description, url, type = "website", image, published, modified, crumbs }) {
  const graph = [
    {
      "@type": "WebPage",
      "@id": url,
      url,
      name: title,
      isPartOf: { "@id": `${ORIGIN}/#website` },
      description,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      inLanguage: "en-US",
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        ...(c.url ? { item: c.url } : {}),
      })),
    },
    {
      "@type": "WebSite",
      "@id": `${ORIGIN}/#website`,
      url: `${ORIGIN}/`,
      name: siteName,
      description: content.site.tagline,
      inLanguage: "en-US",
    },
  ];
  if (type === "article") {
    graph.unshift({
      "@type": "Article",
      "@id": `${url}#article`,
      headline: crumbs.at(-1).name,
      datePublished: published,
      dateModified: modified,
      mainEntityOfPage: { "@id": url },
      image: image ? { "@id": `${url}#primaryimage` } : undefined,
      isPartOf: { "@id": url },
      inLanguage: "en-US",
    });
  }
  return {
    title,
    description,
    robots: robots(),
    canonical: url,
    og_locale: "en_US",
    og_type: type,
    og_title: title,
    og_description: description,
    og_url: url,
    og_site_name: siteName,
    ...(published ? { article_published_time: published, article_modified_time: modified } : {}),
    ...(image ? { og_image: [{ width: image.width, height: image.height, url: image.url, type: "image/jpeg" }] } : {}),
    twitter_card: "summary_large_image",
    schema: { "@context": "https://schema.org", "@graph": graph },
  };
}

// ---------- categories & tags ----------
const categories = content.categories.map((c, i) => {
  const link = `${ORIGIN}/category/${c.slug}/`;
  return {
    id: 2 + i,
    count: content.posts.filter((p) => p.category === c.slug).length,
    description: c.description,
    link,
    name: c.name,
    slug: c.slug,
    taxonomy: "category",
    parent: 0,
    yoast_head_json: yoast({
      title: c.seoTitle,
      description: c.metaDesc,
      url: link,
      crumbs: [{ name: "Home", url: `${ORIGIN}/` }, { name: c.name }],
    }),
  };
});

const tags = content.tags.map((t, i) => {
  const link = `${ORIGIN}/tag/${t.slug}/`;
  return {
    id: 10 + i,
    count: content.posts.filter((p) => p.tags.includes(t.slug)).length,
    description: "",
    link,
    name: t.name,
    slug: t.slug,
    taxonomy: "post_tag",
    parent: 0,
    yoast_head_json: yoast({
      title: `${t.name} Archives | ${siteName}`,
      description: `${t.name} recipes on ${siteName}.`,
      url: link,
      crumbs: [{ name: "Home", url: `${ORIGIN}/` }, { name: t.name }],
    }),
  };
});

// Embedded term objects in REST responses don't include yoast_head_json.
const embedTerm = ({ id, link, name, slug, taxonomy }) => ({ id, link, name, slug, taxonomy });

// ---------- posts + media ----------
function recipeHtml(r) {
  return [
    `<p>${esc(r.intro)}</p>`,
    `<p><strong>Prep:</strong> ${esc(r.prep)} &middot; <strong>Cook:</strong> ${esc(r.cook)} &middot; <strong>Serves:</strong> ${esc(r.serves)}</p>`,
    `<h2>Ingredients</h2>`,
    `<ul>${r.ingredients.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`,
    `<h2>Method</h2>`,
    `<ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`,
    `<h2>Tip</h2>`,
    `<p>${esc(r.tip)}</p>`,
  ].join("\n");
}

const media = [];
const posts = content.posts.map((r, i) => {
  const id = 101 + i;
  const mediaId = 201 + i;
  const link = `${ORIGIN}/recipes/${r.slug}/`;
  const file = `${UPLOADS}/${r.image}`;
  const sourceUrl = `${ORIGIN}/wp-content/uploads/${file}`;
  const m = {
    id: mediaId,
    date: iso(r.date),
    slug: r.slug + "-image",
    type: "attachment",
    link: `${link}${r.slug}-image/`,
    title: { rendered: r.title },
    alt_text: r.imageAlt,
    media_type: "image",
    mime_type: "image/jpeg",
    media_details: { width: 1200, height: 800, file, sizes: {} },
    source_url: sourceUrl,
  };
  media.push(m);

  const cat = categories.find((c) => c.slug === r.category);
  const postTags = tags.filter((t) => r.tags.includes(t.slug));
  const published = `${iso(r.date)}+00:00`;

  return {
    id,
    date: iso(r.date),
    date_gmt: iso(r.date),
    modified: iso(r.date),
    modified_gmt: iso(r.date),
    slug: r.slug,
    status: "publish",
    type: "post",
    link,
    title: { rendered: esc(r.title) },
    content: { rendered: recipeHtml(r), protected: false },
    excerpt: { rendered: `<p>${esc(r.excerpt)}</p>\n`, protected: false },
    author: 1,
    featured_media: mediaId,
    categories: [cat.id],
    tags: postTags.map((t) => t.id),
    yoast_head_json: yoast({
      title: r.seoTitle,
      description: r.metaDesc,
      url: link,
      type: "article",
      image: { url: sourceUrl, width: 1200, height: 800 },
      published,
      modified: published,
      crumbs: [{ name: "Home", url: `${ORIGIN}/` }, { name: r.title }],
    }),
    _embedded: {
      "wp:featuredmedia": [m],
      "wp:term": [[embedTerm(cat)], postTags.map(embedTerm)],
    },
  };
});
// The REST API returns newest first.
posts.sort((a, b) => b.date.localeCompare(a.date));

// ---------- pages ----------
// This is roughly what Contact Form 7 renders inside page content.
const cf7Html = (pageId) =>
  `<div class="wpcf7 no-js" id="wpcf7-f5-p${pageId}-o1" lang="en-US" dir="ltr">
<div class="screen-reader-response"><p role="status" aria-live="polite" aria-atomic="true"></p> <ul></ul></div>
<form action="/contact/#wpcf7-f5-p${pageId}-o1" method="post" class="wpcf7-form init" novalidate="novalidate" data-status="init">
<p><label> Your name<br /><span class="wpcf7-form-control-wrap" data-name="your-name"><input size="40" class="wpcf7-form-control wpcf7-text" type="text" name="your-name" /></span></label></p>
<p><input class="wpcf7-form-control wpcf7-submit" type="submit" value="Submit" /></p>
</form>
</div>`;

const pages = content.pages.map((p, i) => {
  const id = 301 + i;
  const link = `${ORIGIN}/${p.slug}/`;
  return {
    id,
    date: "2026-10-01T09:00:00",
    modified: "2026-10-01T09:00:00",
    slug: p.slug,
    status: "publish",
    type: "page",
    link,
    title: { rendered: esc(p.title) },
    content: { rendered: p.content.replace("[contact-form]", cf7Html(id)), protected: false },
    excerpt: { rendered: "", protected: false },
    parent: 0,
    menu_order: 0,
    featured_media: 0,
    yoast_head_json: yoast({
      title: p.seoTitle,
      description: p.metaDesc,
      url: link,
      crumbs: [{ name: "Home", url: `${ORIGIN}/` }, { name: p.title }],
    }),
  };
});

// ---------- write ----------
const snapshot = {
  generatedAt: new Date().toISOString(),
  source: "sample",
  wordpressOrigin: ORIGIN,
  posts,
  pages,
  categories,
  tags,
  media,
};

await mkdir(path.join(root, "data"), { recursive: true });
await writeFile(path.join(root, "data/wordpress.json"), JSON.stringify(snapshot, null, 2) + "\n");

const uploadDir = path.join(root, "public/wp-content/uploads", UPLOADS);
await mkdir(uploadDir, { recursive: true });
for (const r of content.posts) {
  await copyFile(path.join(root, "wordpress/seed/images", r.image), path.join(uploadDir, r.image));
}

console.log(`Wrote data/wordpress.json: ${posts.length} posts, ${pages.length} pages, ${categories.length} categories, ${tags.length} tags`);
console.log(`Copied ${content.posts.length} images to public/wp-content/uploads/${UPLOADS}/`);
