# Code walkthrough (interview prep)

A simple, file-by-file explanation of the project, plus questions you may be asked and short answers.
Read it in this order: it follows how a request travels through the app.

---

## The big picture in 4 sentences

1. WordPress stores the content and exposes it as JSON at `/wp-json/wp/v2/...` (the REST API).
2. `lib/wordpress.ts` is the only file that calls that API. Every page asks it for data.
3. Each page in `app/` is a **Server Component**: it runs on the server, fetches data, and sends finished HTML to the browser.
4. Pages are built **ahead of time** (static) and refreshed every hour (**ISR**), so they're fast but still update.

---

## 1. Configuration

### `next.config.ts`
Settings for the whole app.
- `trailingSlash: true`: URLs end with `/`, like WordPress, so old links keep the exact same URL.
- `images.remotePatterns`: the list of domains `next/image` may load images from (our WordPress uploads folder only).
- `dangerouslyAllowLocalIP`: needed only for LocalWP, because `spoonful.local` is our own computer (127.0.0.1).
- `redirects()`: returns the list of 301 redirects from `lib/redirects.ts`. It's `async`, so it can fetch posts at build time.
- `rewrites()`: in live mode, `/wp-content/uploads/...` on our domain is fetched from WordPress behind the scenes
  (the URL in the browser doesn't change). A redirect would change the URL. A rewrite doesn't.

### `.env.example` / `.env.local`
Settings that change per environment (local vs production) and secrets. `.env.local` is in `.gitignore` so secrets
are never pushed. `.env.example` is committed so others know which variables exist.

### `proxy.ts`
Runs **before** a page is rendered (it used to be called middleware). Here it only handles links like `/?p=123`:
it looks up post 123, finds its slug and redirects to `/recipes/slug/`. The `matcher` makes it run only on `/` when
`p`, `page_id`, `cat` or `s` is in the query, so it doesn't slow down other pages.

---

## 2. The data layer: `lib/`

### `lib/wordpress.ts` ⭐ (the most important file)
- **Types** (`Post`, `Page`, `Category`, `Tag`, `Media`, `YoastHeadJson`, `Paginated<T>`): describe the JSON WordPress
  returns, so TypeScript catches mistakes like `post.titel`.
- **Two data sources, one API:**
  - `WORDPRESS_URL` set → `wpFetch()` calls the REST API.
  - `WORDPRESS_URL` empty → read `data/wordpress.json` (a saved copy of REST responses).
  Pages don't know or care which one is used.
- **`wpFetch()`**: builds the URL, calls `fetch` with `next: { revalidate: 3600, tags: ["wordpress"] }`
  (cache for 1 hour, label the cache "wordpress" so we can clear it on demand), reads the
  `X-WP-Total` / `X-WP-TotalPages` headers, and throws a clear `WordPressError` if WordPress is down.
- **`?_embed=wp:featuredmedia,wp:term`**: asks WordPress to include the featured image and categories/tags inside
  each post, so we need 1 request instead of 3.
- **Functions**: `getPosts()` (with page, category, tag, search, exclude), `getAllPosts()` (loops 100 at a time,
  the API maximum), `getPostBySlug()`, `getPostById()`, `getRelatedPosts()`, `getPageBySlug()`,
  `getCategories()`, `getTagBySlug()`…
- **Helpers**: `getFeaturedImage()`, `getPostCategories()`, `getPostTags()` read the embedded data.
  `mediaSrc()` turns a WordPress image URL into the right URL for the current mode.

### `lib/seo.ts`
`yoastToMetadata()` converts Yoast's `yoast_head_json` into the `Metadata` object Next.js wants.
Key detail: Yoast's URLs contain the WordPress domain. `toSitePath()` replaces it with a path on our site, otherwise
Google would think the real page lives on the CMS domain. `yoastSchema()` does the same for JSON-LD.

### `lib/redirects.ts`
The list of 301 redirects (date-based permalinks, `/page/2/`, `/privacy-policy/`, old `/slug/` links…).
`patternRedirects` = fixed rules. `contentRedirects()` = one rule per post, built from WordPress data.

### `lib/html.ts`
WordPress sends HTML and encoded characters (`&#8217;` = `’`).
- `decodeEntities()`: turns codes back into characters (for page titles and alt text).
- `htmlToText()`: removes tags (for excerpts and meta descriptions).
- `stripContactForm7()`: removes the CF7 form from the Contact page HTML by counting `<div>`/`</div>`.

### `lib/contact.ts`
Contact form validation used in **both** the browser and the API route, so the rules are written once.

### `lib/site.ts`, `lib/params.ts`
Site name/URL settings, and a safe parser for the page number in `/recipes/page/2/`.

---

## 3. Pages: `app/`

In the App Router, **folders are URLs** and `page.tsx` is the page. `[slug]` means "any value", available in `params`.

| File | What it does |
|---|---|
| `layout.tsx` | Wraps every page: `<html>`, fonts, Header, Footer, default metadata, `metadataBase` |
| `page.tsx` | Home: hero, latest 6 recipes, category cards. Uses `Promise.all` to fetch both at once |
| `recipes/page.tsx` | All recipes, page 1 |
| `recipes/page/[page]/page.tsx` | Page 2+. `generateStaticParams` pre-builds pages 2…N from `totalPages` |
| `recipes/[slug]/page.tsx` | One recipe. `generateStaticParams` builds all recipes at build time. `generateMetadata` reads Yoast. `notFound()` if the slug doesn't exist |
| `category/[slug]/…`, `tag/[slug]/…` | Archives filtered by category/tag ID |
| `[slug]/page.tsx` | Any WordPress page at the root (`/about/`, `/privacy/`) |
| `contact/page.tsx` | WordPress intro text + our React form |
| `search/page.tsx` | Reads `?q=` from `searchParams` (so it's dynamic), shows a skeleton inside `<Suspense>` while results load |
| `loading.tsx` | Automatic loading screen (Next.js wraps pages in Suspense) |
| `error.tsx` | Automatic error screen with a "Try again" button (`retry()`). Must be a Client Component |
| `not-found.tsx` | Custom 404 with search and latest recipes |
| `api/contact/route.ts` | `POST` handler: parse JSON → validate → honeypot check → send with Resend or log |
| `api/revalidate/route.ts` | `POST` handler WordPress calls on save: checks the secret, then `revalidateTag("wordpress")` |
| `sitemap.ts`, `robots.ts` | Generate `/sitemap.xml` and `/robots.txt` from code |
| `feed/route.ts` | RSS feed at `/feed/`, same URL as WordPress |

**Two special exports you'll see in pages:**
```ts
export const revalidate = 3600;              // ISR: rebuild this page at most once per hour
export async function generateStaticParams() // which [slug] values to build at build time
```

---

## 4. Components: `components/`

| Component | Type | Purpose |
|---|---|---|
| `Header` | Server | Logo + nav. Fetches categories, so new WP categories appear in the menu automatically |
| `MobileMenu` | **Client** (`"use client"`) | Hamburger toggle, needs `useState`, so it's the only interactive part of the header |
| `Footer` | Server | Links |
| `RecipeCard` | Server | Image (`next/image` with `sizes`), category badge, title, excerpt |
| `RecipeGrid` | Server | 1 / 2 / 3 columns (`sm:grid-cols-2 lg:grid-cols-3`), empty state |
| `Pagination` | Server | Page links using the same URL format as WordPress. `aria-current` on the current page |
| `CategoryBadge` | Server | Pill linking to `/category/{slug}/` |
| `ArchivePage` | Server | Shared layout for recipe, category and tag lists |
| `WpContent` | Server | Turns WordPress HTML into React: `<img>` → `next/image`, internal `<a>` → `next/link` |
| `ContactForm` | **Client** | Form state, browser validation, loading/success/error messages |
| `SearchForm` | Server | `next/form` GET form → `/search/?q=…` (works without JavaScript too) |
| `RecipeGridSkeleton` | Server | Grey placeholder cards for loading states |
| `JsonLd` | Server | Prints structured data for Google |

**Rule of thumb:** everything is a Server Component unless it needs state, effects or event handlers
(`onClick`, `onSubmit`). Then it's a Client Component. Less JavaScript sent to the browser = faster site.

---

## 5. WordPress side: `wordpress/` and `scripts/`

| File | Purpose |
|---|---|
| `wordpress/seed/content.json` | The 12 recipes, 3 categories, 8 tags, 3 pages, with SEO titles/descriptions |
| `wordpress/seed/seed.php` | Run with `wp eval-file`. Creates all content in WordPress, uploads images, sets Yoast meta, permalinks, CF7 form |
| `wordpress/seed/images/` | Featured images |
| `wordpress/mu-plugins/spoonful-revalidate.php` | On `save_post`, POSTs to `/api/revalidate/` so the Next.js site updates instantly |
| `scripts/export-wordpress.mjs` | Downloads all content + images from WordPress into `data/wordpress.json` and `public/wp-content/uploads/` |
| `scripts/generate-sample-data.mjs` | Builds the same JSON from `content.json` without WordPress (used for the demo) |

---

## Likely interview questions

**Why headless WordPress instead of just a WordPress theme?**
Editors keep the WordPress admin they know, but the public site gets React, static pages, better performance
and security (the WordPress server isn't exposed to visitors, and it can even be turned off thanks to the snapshot).

**How did you make sure no URL broke?**
I listed every URL type WordPress creates and made a Next.js route at the same path, with `trailingSlash: true`.
Anything that couldn't stay (old permalinks, `/?p=`) gets a 301. I tested each one with `curl` and checked the status
code and `Location` header.

**What is ISR?**
Incremental Static Regeneration: pages are built as static HTML, and after the `revalidate` time the next visit
triggers a background rebuild. Visitors always get a fast cached page, and content stays fresh. I also added
on-demand revalidation: WordPress calls `/api/revalidate/` when a post is saved.

**Why did you move `/?p=123` redirects to `proxy.ts`?**
next.config redirects copy the original query string onto the new URL, so the result was `/recipes/slug/?p=123`.
In proxy I build the URL myself, so it's clean, and the lookup is live, so new posts work too.

**How does SEO carry over?**
Yoast data is in the REST API as `yoast_head_json`. `generateMetadata` maps it to title, description, canonical,
Open Graph and Twitter tags, and I print Yoast's JSON-LD. I rewrite the WordPress domain to the new domain, add a
sitemap and robots.txt, and keep image URLs the same.

**301 vs 302 vs 308?**
301/308 = permanent (search engines move ranking to the new URL). 302/307 = temporary. 307/308 also guarantee the
HTTP method stays the same (a POST stays a POST). I used 301 for pages (all GET) and 302 for `/wp-admin` because
that's not a permanent content move.

**Why validate the form on the server if you already validate in the browser?**
Browser checks are for user experience. Anyone can skip them with `curl`. The server check is the real protection.
Both use the same function, so the rules never drift apart.

**What happens if WordPress is down?**
Already-built pages are still served from cache. A page that must fetch fresh data throws a `WordPressError`, and
`error.tsx` shows a friendly message with "Try again". At build time, redirects fall back to pattern rules only.
In production you can avoid the dependency entirely with the snapshot.

**Server vs Client Components?**
Server Components run on the server and send HTML (no JS for that component). Client Components (`"use client"`)
run in the browser too and can use state and events. Only `MobileMenu`, `ContactForm` and `error.tsx` are client components here.

**How does pagination work?**
WordPress returns the totals in the `X-WP-Total` and `X-WP-TotalPages` response headers. I read them in `wpFetch`,
use `totalPages` to pre-build `/recipes/page/2/` etc., and render links with the `Pagination` component.

**What would you improve?**
Draft previews with Next.js draft mode, rate limiting on the contact API, a crawl-based URL diff before launch,
and 404 monitoring after launch.
