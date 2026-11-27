import Image from "next/image";
import Link from "next/link";
import parse, { Element, attributesToProps, domToReact, type DOMNode, type HTMLReactParserOptions } from "html-react-parser";
import { mediaSrc, wordpressOrigin } from "@/lib/wordpress";

/**
 * Renders HTML from the WordPress editor as React.
 *
 * Instead of dumping raw HTML with dangerouslySetInnerHTML, we parse it and swap two tags:
 *   <img> -> next/image   (lazy loading, modern formats, correct sizes = better Lighthouse score)
 *   <a>   -> next/link    (internal links navigate instantly without a full page reload)
 *
 * The HTML comes from our own WordPress editors, so we trust it.
 */
const options: HTMLReactParserOptions = {
  replace(node: DOMNode) {
    if (!(node instanceof Element)) return;

    if (node.name === "img") {
      const { src, alt = "", width, height } = node.attribs;
      // next/image needs the size. WordPress adds width/height to images it inserts.
      if (!src || !width || !height) return;
      return (
        <Image
          src={mediaSrc(src)}
          alt={alt}
          width={Number(width)}
          height={Number(height)}
          sizes="(min-width: 768px) 720px, 100vw"
          className="rounded-xl"
        />
      );
    }

    if (node.name === "a") {
      const href = node.attribs.href ?? "";
      // Links that point at the old WordPress domain become links on this site.
      const internal = href.startsWith(wordpressOrigin) ? href.slice(wordpressOrigin.length) || "/" : href;
      if (internal.startsWith("/") && !internal.startsWith("/wp-content/")) {
        const props = attributesToProps(node.attribs);
        delete props.href;
        return (
          <Link {...props} href={internal}>
            {domToReact(node.children as DOMNode[], options)}
          </Link>
        );
      }
    }
  },
};

export function WpContent({ html, className = "" }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-ink prose-a:text-tomato prose-li:marker:text-tomato ${className}`}
    >
      {parse(html, options)}
    </div>
  );
}
