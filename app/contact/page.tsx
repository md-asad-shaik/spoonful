import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/wordpress";
import { decodeEntities, stripContactForm7, stripShortcodes } from "@/lib/html";
import { yoastToMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/ContactForm";
import { WpContent } from "@/components/WpContent";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("contact");
  return yoastToMetadata(page?.yoast_head_json, { title: "Contact", path: "/contact/" });
}

/**
 * The intro text still comes from the WordPress "Contact" page, so editors can change it.
 * The Contact Form 7 HTML inside it is removed and replaced by our React form,
 * because the CF7 form needs WordPress's JavaScript and would post back to WordPress.
 */
export default async function ContactPage() {
  const page = await getPageBySlug("contact");
  const intro = page ? stripShortcodes(stripContactForm7(page.content.rendered)) : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="mb-6 font-serif text-4xl font-bold sm:text-5xl">
        {page ? decodeEntities(page.title.rendered) : "Contact"}
      </h1>
      {intro && <WpContent html={intro} className="mb-10" />}
      <ContactForm />
    </div>
  );
}
