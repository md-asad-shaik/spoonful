import Image from "next/image";
import Link from "next/link";
import { getFeaturedImage, getPostCategories, mediaSrc, type Post } from "@/lib/wordpress";
import { decodeEntities, htmlToText } from "@/lib/html";
import { CategoryBadge } from "./CategoryBadge";

interface Props {
  post: Post;
  /** Load this image first (use for cards visible without scrolling). */
  preload?: boolean;
}

/** Card used in every recipe list: image, category, title, short excerpt. */
export function RecipeCard({ post, preload = false }: Props) {
  const title = decodeEntities(post.title.rendered);
  const image = getFeaturedImage(post);
  const category = getPostCategories(post)[0];
  const href = `/recipes/${post.slug}/`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[3/2] bg-butter">
        {image ? (
          <Image
            src={mediaSrc(image.source_url)}
            alt={image.alt_text || title}
            fill
            // Tells the browser how wide the image is at each screen size,
            // so it downloads a small file on phones and a bigger one on desktop.
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            preload={preload}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-5xl" aria-hidden="true">🍽️</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        {category && (
          <div>
            <CategoryBadge category={category} />
          </div>
        )}
        <h3 className="font-serif text-xl font-semibold leading-snug">
          <Link href={href} className="hover:text-tomato">
            {title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted">{htmlToText(post.excerpt.rendered)}</p>
      </div>
    </article>
  );
}
