/**
 * Prints structured data (JSON-LD) for Google, e.g. Yoast's Article + Breadcrumb schema.
 * "<" is escaped so the JSON can never close the <script> tag early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
