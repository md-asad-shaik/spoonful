# Migration: WordPress → Next.js (headless)

This document explains how Spoonful moved from a classic WordPress theme to a Next.js frontend
**without breaking anything**: same URLs, same SEO, same images, working forms.

WordPress is still the CMS. Editors keep writing in WP Admin. Next.js reads the content through
the **WordPress REST API** (`/wp-json/wp/v2/...`) and renders the public site.

```
 Editor ──► WordPress (WP Admin, Yoast, Media Library)
                 │  REST API: /wp-json/wp/v2/posts?_embed
                 ▼
          lib/wordpress.ts  ──(cache: ISR, 1 hour, tag "wordpress")──►  Next.js pages  ──► Visitor
                 ▲
   data/wordpress.json (snapshot, used when WORDPRESS_URL is empty, e.g. on Vercel)
```

## Summary checklist

| # | Item | Status | Where |
|---|---|---|---|
| 1 | Every WordPress URL works at the same path | ✅ | `app/` routes + `trailingSlash: true` |
| 2 | 301 redirects for old URL formats | ✅ | `lib/redirects.ts`, `next.config.ts`, `proxy.ts` |
| 3 | Yoast title, description, Open Graph via `generateMetadata` | ✅ | `lib/seo.ts` |
| 4 | Images through `next/image`, WP media domain allowed, alt text | ✅ | `next.config.ts`, `RecipeCard`, `WpContent` |
| 5 | Contact form rebuilt with a validated route handler + email | ✅ | `components/ContactForm.tsx`, `app/api/contact/route.ts` |
| 6 | `sitemap.ts`, `robots.ts`, canonical URLs | ✅ | `app/sitemap.ts`, `app/robots.ts`, `lib/seo.ts` |
| 7 | Static generation with ISR | ✅ | `export const revalidate = 3600` + `app/api/revalidate` |
| 8 | Lighthouse scores | ✅ Next.js measured (WordPress comparison optional) | [README](README.md#lighthouse-scores) |

---

## 1. URLs: same path for every page

**Goal:** every link that exists today (in Google, on Pinterest, in old emails) must keep working.

First I listed every URL type the WordPress site produces, then built a Next.js route for each one at the **same path**:

| WordPress URL | Next.js route file |
|---|---|
| `/` | `app/page.tsx` |
| `/recipes/{slug}/` (permalink `/recipes/%postname%/`) | `app/recipes/[slug]/page.tsx` |
| `/category/{slug}/` | `app/category/[slug]/page.tsx` |
| `/category/{slug}/page/2/` | `app/category/[slug]/page/[page]/page.tsx` |
| `/tag/{slug}/` | `app/tag/[slug]/page.tsx` |
| `/about/`, `/privacy/` (any page) | `app/[slug]/page.tsx` |
| `/contact/` | `app/contact/page.tsx` (own route because it has the React form) |
| `/feed/` (RSS) | `app/feed/route.ts` |
| `/wp-content/uploads/...` (images) | `public/wp-content/uploads/` (snapshot) or a rewrite to WordPress (live) |

New URLs that did not exist before: `/recipes/` (all recipes, page 1), `/recipes/page/2/` and `/search/`.

**Trailing slashes.** WordPress URLs end with `/`. Next.js by default removes it. I set
`trailingSlash: true` in `next.config.ts`, so `/recipes/chicken-biryani/` is the real URL (not a redirect),
exactly like before. `/recipes/chicken-biryani` (no slash) gets a 308 redirect to the slash version, which is also what WordPress does.

**Pagination uses the REST API headers.** WordPress returns `X-WP-Total` and `X-WP-TotalPages` with every
list request. `lib/wordpress.ts` reads them into a `Paginated<T>` object, and `generateStaticParams`
uses `totalPages` to pre-build `/recipes/page/2/` … `/recipes/page/N/`. Asking for a page after the last one returns
WordPress's `rest_post_invalid_page_number` error, which we turn into a 404.

**Posts per page match.** The seed sets WordPress's "Blog pages show at most" to 6, and `PER_PAGE = 6` in
Next.js, so `/category/x/page/2/` shows the same posts on both sites.

## 2. Redirects (301)

URLs that **can't** stay at the same path get a permanent redirect. I used **301** (`statusCode: 301`) rather than
Next.js's default 308 because 301 is what SEO tools and migration guides expect. For GET pages they behave the same.

### a) Pattern rules: `lib/redirects.ts` → `next.config.ts`

| Old URL | New URL | Why |
|---|---|---|
| `/2024/05/12/chicken-biryani/` | `/recipes/chicken-biryani/` | old date-based permalink |
| `/2024/05/chicken-biryani/` | `/recipes/chicken-biryani/` | old month-based permalink |
| `/page/2/` | `/recipes/page/2/` | WordPress blog pagination |
| `/recipes/page/1/`, `/category/x/page/1/`, `/tag/x/page/1/` | archive root | page 1 has no `/page/1/` URL |
| `/category/parent/child/` | `/category/child/` | nested category URLs |
| `/privacy-policy/` | `/privacy/` | WordPress's default privacy slug |
| `/author/admin/` | `/about/` | single-author blog |
| `/chicken-biryani/` | `/recipes/chicken-biryani/` | the old `/%postname%/` permalink (one rule per post, built from the post list) |
| `/wp-admin/*`, `/wp-login.php` | the real WordPress admin (302) | editors' bookmarks |

`next.config.ts` can be `async`, so `redirects()` calls `buildRedirects()`, which fetches the post list
(through `lib/wordpress.ts`, so the fetching code isn't duplicated). If WordPress is down at build time, the
pattern rules still apply and the build does not fail.

> **Note on `/category/x/page/2/`:** the task listed this as a redirect example. I kept it at the **same path**
> instead (a real page), because a URL that never changes is better for SEO than a redirect. Only `/page/1/`
> URLs redirect.

### b) Query-string rules: `proxy.ts`

| Old URL | New URL |
|---|---|
| `/?p=106` | `/recipes/chicken-biryani/` |
| `/?page_id=301` | `/about/` |
| `/?cat=3` | `/category/lunch/` |
| `/?s=paneer` | `/search/?q=paneer` |

I first put these in `next.config.ts` using `has: [{ type: "query", key: "p" }]`. Testing showed a problem:
**Next.js always copies the original query string onto the destination**, so `/?p=106` went to
`/recipes/chicken-biryani/?p=106` (I confirmed this in Next's source: `prepare-destination.js` merges `args.query`).
That leaves a messy URL in Google.

So I moved them to `proxy.ts` (the new name for middleware in Next.js 16). It builds the clean URL itself and
returns a 301. Its `matcher` only runs on `/` when one of those query keys exists, so normal requests skip it.
Extra benefit: it looks the ID up live (`getPostById`), so posts published **after** the last build also redirect.

### How I tested

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000/?p=106"
# 301 http://localhost:3000/recipes/chicken-biryani/
```

| Request | Result |
|---|---|
| `/?p=106` | 301 → `/recipes/chicken-biryani/` |
| `/?p=999` (unknown ID) | 200, home page |
| `/2024/05/12/chicken-biryani/` | 301 → `/recipes/chicken-biryani/` |
| `/page/2/` | 301 → `/recipes/page/2/` |
| `/privacy-policy/` | 301 → `/privacy/` |
| `/recipes/nope/` | 404 (custom page) |

## 3. Metadata: Yoast → `generateMetadata`

Yoast SEO adds a `yoast_head_json` object to every post, page, category and tag in the REST API:

```json
"yoast_head_json": {
  "title": "Easy Chicken Biryani at Home (Step-by-Step) | Spoonful",
  "description": "Fragrant layered chicken biryani with ...",
  "canonical": "http://spoonful.local/recipes/chicken-biryani/",
  "og_type": "article",
  "og_image": [{ "url": "http://spoonful.local/wp-content/uploads/2026/11/chicken-biryani.jpg", "width": 1200, "height": 800 }],
  "schema": { "@graph": [ ... ] }
}
```

`lib/seo.ts` → `yoastToMetadata()` turns it into a Next.js `Metadata` object, used in every
`generateMetadata()`:

- `title` uses `{ absolute: ... }` because Yoast's title already ends with "| Spoonful" (otherwise the layout's
  title template would add it twice).
- `description`, `robots` (Yoast's noindex/nofollow), `openGraph` (type article + published/modified time) and
  `twitter` are mapped field by field.
- **Domain fix:** Yoast builds `canonical`, `og:url` and schema URLs with the *WordPress* domain. Pointing the
  canonical at the old/CMS domain would tell Google the real page is somewhere else. `toSitePath()` strips the WordPress
  origin and `metadataBase` (in `app/layout.tsx`) adds the new site URL.
- Yoast's **JSON-LD schema** (Article, BreadcrumbList, WebSite) is printed with `<JsonLd>`, also with the domain replaced.
- Fallbacks: if Yoast data is missing, the post title and excerpt are used.

Result for `/recipes/chicken-biryani/`:

```html
<title>Easy Chicken Biryani at Home (Step-by-Step) | Spoonful</title>
<meta name="description" content="Fragrant layered chicken biryani with marinated chicken, ...">
<link rel="canonical" href="https://YOUR-SITE/recipes/chicken-biryani/">
<meta property="og:type" content="article">
<meta property="og:image" content="https://YOUR-SITE/wp-content/uploads/2026/11/chicken-biryani.jpg">
```

## 4. Images

- **Allowed domain:** `next.config.ts` builds `images.remotePatterns` from `WORDPRESS_URL`, limited to
  `/wp-content/uploads/**`. next/image refuses any other host, so nobody can use our optimiser for random images.
- **LocalWP:** `spoonful.local` resolves to `127.0.0.1`. Next.js 16 blocks optimising images from local IPs by default
  (a security protection called SSRF protection). `dangerouslyAllowLocalIP` is turned on **only** when the WordPress host is `localhost`, `*.local` or `127.*`.
- **Featured images** use `<Image fill sizes="...">`, so phones download small files. The recipe hero image
  uses `preload` because it's the largest element on screen (LCP).
- **Images inside post content** are converted too: `components/WpContent.tsx` parses the HTML with
  `html-react-parser` and replaces every `<img width height>` with `next/image` and internal `<a>` with `next/link`.
- **Alt text** comes from the Media Library's *Alt Text* field (`alt_text` in the REST API), falling back to the
  post title. The seed script sets a descriptive alt text on every image.
- **Same image URLs:** old image links (Google Images, Pinterest) point to `/wp-content/uploads/...`. In snapshot
  mode the export script downloads files to `public/wp-content/uploads/` at the **same path**. In live mode a
  rewrite proxies that path to WordPress. Either way the old URL still returns the image.

## 5. Forms: Contact Form 7 → route handler

Contact Form 7 can't work on the Next.js site: it needs WordPress's JavaScript and posts back to WordPress.

1. `app/contact/page.tsx` still reads the **Contact page from WordPress** (so editors can change the intro text) and
   removes the CF7 markup with `stripContactForm7()` (`lib/html.ts`). It counts nested `<div>`s to find where the form ends, because
   a simple regex can't handle nested tags.
2. `components/ContactForm.tsx` (Client Component) shows the form, validates in the browser for instant feedback,
   and shows loading ("Sending…"), success and error states.
3. It POSTs JSON to `app/api/contact/route.ts`, which:
   - validates again with the **same** function (`lib/contact.ts`). The browser check can be skipped, so the server check is the one that matters
   - returns `400` with field errors if invalid
   - ignores spam: a hidden **honeypot** field (`website`) that only bots fill in
   - sends the email through **Resend's REST API** if `RESEND_API_KEY` and `CONTACT_TO_EMAIL` are set, with
     `reply_to` set to the visitor, otherwise logs the message to the server console

Tested:

```bash
curl -X POST localhost:3000/api/contact/ -H 'Content-Type: application/json' -d '{"name":"A","email":"bad","message":"hi"}'
# 400 {"message":"Please fix the highlighted fields.","errors":{"name":...,"email":...,"message":...}}
```

*Alternative:* CF7 has its own REST endpoint (`/wp-json/contact-form-7/v1/contact-forms/{id}/feedback`). I chose
a Next.js route handler so the form keeps working even when WordPress is replaced by the static snapshot.

## 6. SEO files

- **`app/sitemap.ts`** → `/sitemap.xml`: home, recipe index + pages, every recipe (with `lastModified` from WordPress's
  `modified` date), categories, tags and pages. Regenerated with ISR every hour.
  After launch, submit it in Google Search Console (Yoast's old sitemap was `/sitemap_index.xml`).
- **`app/robots.ts`** → `/robots.txt`: allows everything except `/api/` and `/search/`, links the sitemap.
  On **Vercel preview deployments** (`VERCEL_ENV=preview`) it blocks all crawlers so test copies never get indexed.
- **Canonical URLs** on every page via `alternates.canonical` (from Yoast, rewritten to our domain).
- **Search results** are `noindex, follow`: endless search pages are thin, duplicate content for Google.
- **RSS** at the same `/feed/` URL, linked in `<head>` with `alternates.types`.

## 7. Performance: static generation + ISR

Every content page is **pre-rendered as static HTML at build time** and refreshed in the background:

```ts
export const revalidate = 3600; // in each page: rebuild at most once per hour
export async function generateStaticParams() { ... } // which slugs to build ahead of time
```

and every REST request in `lib/wordpress.ts` uses:

```ts
fetch(url, { next: { revalidate: 3600, tags: ["wordpress"] } })
```

- **How ISR works:** the first visitor after an hour still gets the fast cached page, while Next.js fetches fresh
  data in the background. The next visitor sees the update. Pages are fast, and WordPress isn't called on every visit.
- **New posts** (`dynamicParams = true`): a recipe published after the build is rendered on its first visit, then
  cached like the others.
- **Instant updates (on-demand ISR):** `app/api/revalidate/route.ts` calls `revalidateTag("wordpress", { expire: 0 })`.
  The tiny WordPress plugin `wordpress/mu-plugins/spoonful-revalidate.php` calls it on every save, protected by
  `REVALIDATE_SECRET`. Editors see their change right away without waiting an hour.
- Only `/search/` is dynamic (it depends on `?q=`), and it streams results inside `<Suspense>` with a skeleton.

Build output:

```
○ /                                1h   (static, revalidates every hour)
● /recipes/[slug]  (12 paths)      1h   (static via generateStaticParams)
● /category/[slug] (3 paths)       1h
ƒ /search                               (dynamic: depends on the query)
ƒ Proxy (Middleware)                    (only for /?p= style links)
```

> **Why not `"use cache"`?** Next.js 16 also has *Cache Components* (`cacheComponents: true`, `"use cache"`,
> `cacheLife`). I turned it off and used the route-segment `revalidate` model because it maps 1-to-1 to "ISR",
> and both are fully supported in Next 16. Moving to Cache Components later would mean adding `"use cache"`
> + `cacheLife("hours")` to the functions in `lib/wordpress.ts`.

## 8. Lighthouse

See the [Lighthouse table in the README](README.md#lighthouse-scores).

---

## Production: where does the data come from?

| Option | How | Good for |
|---|---|---|
| **A. Static JSON snapshot** (default) | `npm run data:export` → commit `data/wordpress.json` + `public/wp-content/uploads/`, leave `WORDPRESS_URL` empty on Vercel | Free, fast, nothing to keep online. Re-export + push to publish new content. |
| **B. Hosted WordPress** | Host WP on InstaWP / any host, set `WORDPRESS_URL` on Vercel | Real headless CMS: editors publish, ISR/webhook updates the site |

The app switches automatically: `isSnapshotMode = WORDPRESS_URL === ""` in `lib/wordpress.ts`.
Both sources have the **same JSON shape** (the snapshot is a saved copy of REST API responses), so no page
code changes.

## Things I would do next on a real project

- Crawl the old site (e.g. Screaming Frog) and diff every URL against the new site before switching DNS.
- Monitor 404s in Vercel logs / Search Console for a few weeks after launch and add redirects for anything missed.
- Add rate limiting to `/api/contact/` (e.g. Upstash) on top of the honeypot.
- Use WordPress Application Passwords + draft mode to preview unpublished posts.
