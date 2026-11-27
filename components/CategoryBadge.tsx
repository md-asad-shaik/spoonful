import Link from "next/link";
import type { Category } from "@/lib/wordpress";
import { decodeEntities } from "@/lib/html";

/** Small pill that links to a category page, e.g. [Breakfast] -> /category/breakfast/ */
export function CategoryBadge({ category }: { category: Pick<Category, "name" | "slug"> }) {
  return (
    <Link
      href={`/category/${category.slug}/`}
      className="inline-block rounded-full bg-butter px-3 py-1 text-xs font-semibold uppercase tracking-wide text-tomato-dark hover:bg-tomato hover:text-white"
    >
      {decodeEntities(category.name)}
    </Link>
  );
}
