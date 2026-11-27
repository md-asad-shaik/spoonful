import Form from "next/form";

/**
 * A normal GET form: submitting it goes to /search/?q=pancakes.
 * next/form makes that a fast client-side navigation, and it still works without JavaScript.
 */
export function SearchForm({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <Form action="/search/" role="search" className="flex w-full max-w-xl gap-2">
      <label htmlFor="search-q" className="sr-only">
        Search recipes
      </label>
      <input
        id="search-q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="Search recipes, e.g. paneer"
        className="min-w-0 flex-1 rounded-full border border-line bg-white px-5 py-3 text-ink placeholder:text-muted/70"
      />
      <button type="submit" className="rounded-full bg-tomato px-6 py-3 font-semibold text-white hover:bg-tomato-dark">
        Search
      </button>
    </Form>
  );
}
