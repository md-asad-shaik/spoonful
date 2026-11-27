# Phase 1: WordPress setup (LocalWP)

This builds the **"before"** site: a normal WordPress recipe blog that we later migrate to Next.js.

At the end you will have:

- WordPress running at `http://spoonful.local`
- 12 recipe posts in 3 categories (Breakfast, Lunch, Desserts) with tags and featured images
- About, Contact and Privacy Policy pages
- Yoast SEO with a custom SEO title and meta description on every post
- Permalinks set to `/recipes/%postname%/`
- A Contact Form 7 form on the Contact page

---

## 1. Install LocalWP

1. Download **Local** from <https://localwp.com> (free) and install it.
2. Open Local → **+ Create a new site** → **Create a new site**.
3. Site name: `spoonful` (Local will use the domain `spoonful.local`).
4. Environment: **Preferred**.
5. WordPress username / password: choose your own (e.g. `admin` / a strong password).
6. Click **Add site** and wait until it says *Running*.
7. Click **WP Admin** to check you can log in.

> Tip: In Local, keep **SSL** off for this project. `http://spoonful.local` avoids
> self-signed certificate errors when Next.js calls the REST API.

## 2. Create the content with one script

In Local, right-click the site → **Open site shell**. This terminal already has WP-CLI.

```bash
# 1. Install and activate the two plugins
wp plugin install wordpress-seo contact-form-7 --activate

# 2. Run the seed script (use the real path to this repo on your computer)
wp eval-file "/path/to/spoonful/wordpress/seed/seed.php"
```

The script reads [`seed/content.json`](seed/content.json) and images from [`seed/images/`](seed/images/).
It is safe to run again: it updates existing posts instead of creating duplicates.

What it does, step by step:

| Step | What happens |
|---|---|
| Settings | Site title "Spoonful", 6 posts per page, permalinks `/recipes/%postname%/` |
| Clean up | Deletes "Hello world!" and "Sample Page" |
| Terms | Creates 3 categories (with Yoast SEO titles) and 8 tags |
| Posts | Creates 12 recipes, uploads the featured image with alt text, saves Yoast title + description |
| Form | Creates a Contact Form 7 form |
| Pages | Creates About, Contact (with the form shortcode) and Privacy Policy (`/privacy/`) |

## 3. Check everything worked

Open these in your browser:

| URL | You should see |
|---|---|
| `http://spoonful.local/` | The blog with the 6 newest recipes |
| `http://spoonful.local/recipes/chicken-biryani/` | A recipe with its image |
| `http://spoonful.local/category/lunch/` | 4 lunch recipes |
| `http://spoonful.local/contact/` | The contact form |
| `http://spoonful.local/wp-json/wp/v2/posts` | JSON: the REST API the Next.js site uses |
| `http://spoonful.local/wp-json/wp/v2/posts?slug=chicken-biryani` | Look for `yoast_head_json`: the SEO data |

In **WP Admin → Posts**, open any recipe and scroll to the **Yoast SEO** box: the SEO title and
meta description are already filled in.

If `yoast_head_json` shows old values, rebuild Yoast's index:

```bash
wp yoast index --reindex
```

## 4. (Optional) Do it by hand instead

The same setup without the script:

1. **Settings → Permalinks** → *Custom Structure* → `/recipes/%postname%/` → Save.
2. **Settings → Reading** → *Blog pages show at most* = 6.
3. **Posts → Categories**: add Breakfast, Lunch, Desserts.
4. **Posts → Add New**: title, content, category, tags, **Featured image** (fill in *Alt Text*),
   and fill the **Yoast SEO** box (SEO title + meta description).
5. **Contact → Add New** (Contact Form 7) → Save → copy the shortcode.
6. **Pages → Add New**: About, Contact (paste the shortcode), Privacy Policy (slug `privacy`).

## 5. Measure the "before" Lighthouse score

Before migrating, record WordPress's scores so you can compare later:

1. Open `http://spoonful.local/` in Chrome (in an Incognito window, so extensions don't affect it).
2. DevTools (F12) → **Lighthouse** tab → Mode *Navigation*, Device *Mobile* → **Analyze page load**.
3. Do the same for `http://spoonful.local/recipes/chicken-biryani/`.
4. Add the numbers to the Lighthouse table in the main [README](../README.md#lighthouse-scores).

## 6. Connect WordPress to Next.js

Export the content so the Next.js app (and Vercel) can use it without WordPress running:

```bash
# in the Next.js project folder
echo "WORDPRESS_URL=http://spoonful.local" > .env.local
npm run data:export      # writes data/wordpress.json + downloads images
```

Or keep `WORDPRESS_URL` set and run `npm run dev` to read the live REST API directly.

## 7. (Optional) Instant updates: the revalidate plugin

[`mu-plugins/spoonful-revalidate.php`](mu-plugins/spoonful-revalidate.php) tells Next.js to refresh its cache whenever
you save a post. Copy it into `wp-content/mu-plugins/` (Local: right-click site → *Go to site folder* →
`app/public/wp-content/`) and follow the comment at the top of the file.
