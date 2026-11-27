/**
 * Helpers for the HTML strings WordPress sends us.
 * WordPress encodes characters in titles (e.g. "Mom&#8217;s"), so we decode
 * them before using a title as plain text (page <title>, alt text, etc.).
 */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’",
  ldquo: "“", rdquo: "”", middot: "·", copy: "©", deg: "°",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const num = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(num) ? String.fromCodePoint(num) : match;
    }
    return NAMED[code.toLowerCase()] ?? match;
  });
}

/** "<p>Hello &amp; welcome</p>" -> "Hello & welcome" */
export function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/**
 * Removes the Contact Form 7 markup from page content.
 * CF7 renders <div class="wpcf7 ...">...</div> with nested divs inside, so a simple
 * regex can't find the end. We walk through the tags and count opening/closing
 * <div>s until we're back at depth 0. Our own React form replaces it.
 */
export function stripContactForm7(html: string): string {
  const start = html.search(/<div[^>]*class="[^"]*\bwpcf7\b/);
  if (start === -1) return html;

  const tag = /<\/?div\b[^>]*>/gi;
  tag.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tag.exec(html))) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) {
      const end = match.index + match[0].length;
      return stripContactForm7(html.slice(0, start) + html.slice(end));
    }
  }
  return html.slice(0, start); // unbalanced HTML: drop everything after the form
}

/** Leftover shortcodes (e.g. if the CF7 plugin is disabled) -> remove them. */
export function stripShortcodes(html: string): string {
  return html.replace(/\[\/?[a-z0-9_-]+[^\]]*\]/gi, "");
}
