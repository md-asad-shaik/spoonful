import Link from "next/link";
import { getCategories } from "@/lib/wordpress";
import { site } from "@/lib/site";
import { MobileMenu, type NavItem } from "./MobileMenu";

/**
 * Site header. A Server Component: it fetches the categories from WordPress,
 * so a new category added in WP shows up in the menu automatically.
 * Only the mobile menu toggle needs JavaScript, so that part is a separate Client Component.
 */
export async function Header() {
  const categories = await getCategories();
  const items: NavItem[] = [
    { href: "/recipes/", label: "All recipes" },
    ...categories.map((c) => ({ href: `/category/${c.slug}/`, label: c.name })),
    { href: "/about/", label: "About" },
    { href: "/contact/", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-bold text-ink">
          <span aria-hidden="true">🥄</span>
          {site.name}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-butter hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/search/"
            className="ml-2 rounded-full bg-tomato px-4 py-2 text-sm font-semibold text-white hover:bg-tomato-dark"
          >
            Search
          </Link>
        </nav>

        <MobileMenu items={items} />
      </div>
    </header>
  );
}
