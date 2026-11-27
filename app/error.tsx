"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * error.tsx = automatic error state. If a page throws (e.g. WordPress is down),
 * Next.js shows this instead of crashing, and the header/footer still work.
 * It must be a Client Component because it has a "Try again" button.
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl" aria-hidden="true">🍳💥</p>
      <h1 className="mt-6 font-serif text-3xl font-bold">Something burnt in the kitchen</h1>
      <p className="mt-3 text-muted">
        We couldn&apos;t load this page. The recipe server may be busy. Please try again in a moment.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={() => retry()} className="rounded-full bg-tomato px-6 py-3 font-semibold text-white hover:bg-tomato-dark">
          Try again
        </button>
        <Link href="/" className="rounded-full border border-line px-6 py-3 font-semibold hover:bg-butter">
          Go home
        </Link>
      </div>
    </div>
  );
}
