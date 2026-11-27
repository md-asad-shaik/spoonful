/** Shown instantly while a recipe page loads (e.g. the first visit to a brand-new recipe). */
export default function LoadingRecipe() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading recipe">
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <div className="mx-auto h-6 w-24 rounded-full bg-butter" />
        <div className="mx-auto h-12 w-3/4 rounded-lg bg-butter" />
        <div className="mx-auto h-5 w-1/2 rounded bg-butter" />
      </div>
      <div className="mx-auto mt-8 aspect-[3/2] max-w-4xl rounded-3xl bg-butter" />
      <div className="mx-auto mt-10 max-w-3xl space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-butter" />
        ))}
      </div>
    </div>
  );
}
