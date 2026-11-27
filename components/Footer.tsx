import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-butter/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-serif text-xl font-bold">🥄 {site.name}</p>
          <p className="mt-2 text-sm text-muted">{site.tagline}</p>
        </div>
        <nav aria-label="Footer" className="text-sm">
          <p className="font-semibold">Explore</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li><Link href="/recipes/" className="hover:text-tomato">All recipes</Link></li>
            <li><Link href="/search/" className="hover:text-tomato">Search</Link></li>
            <li><Link href="/about/" className="hover:text-tomato">About</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal" className="text-sm">
          <p className="font-semibold">Info</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li><Link href="/contact/" className="hover:text-tomato">Contact</Link></li>
            <li><Link href="/privacy/" className="hover:text-tomato">Privacy policy</Link></li>
            <li><Link href="/feed/" prefetch={false} className="hover:text-tomato">RSS feed</Link></li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {site.name}. Content managed in WordPress, served by Next.js.
      </p>
    </footer>
  );
}
