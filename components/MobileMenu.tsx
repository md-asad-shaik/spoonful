"use client";

import Link from "next/link";
import { useState } from "react";

export interface NavItem {
  href: string;
  label: string;
}

/** Hamburger menu for phones and tablets. Hidden on large screens (lg:hidden). */
export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="rounded-lg p-2 text-ink hover:bg-butter"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="absolute inset-x-0 top-16 border-b border-line bg-cream px-4 pb-4 shadow-lg"
        >
          <ul className="flex flex-col">
            {[...items, { href: "/search/", label: "Search" }].map((item) => (
              <li key={item.href}>
                {/* Close the menu when a link is tapped */}
                <Link href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 font-medium text-ink hover:bg-butter">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
