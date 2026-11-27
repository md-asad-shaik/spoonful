import type { Metadata } from "next";
import { getPosts } from "@/lib/wordpress";
import { ArchivePage } from "@/components/ArchivePage";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All Recipes",
  description: "Browse every Spoonful recipe: breakfast, lunch and desserts.",
  alternates: { canonical: "/recipes/" },
};

/** /recipes/ = page 1. Page 2+ lives at /recipes/page/2/ (see page/[page]/page.tsx). */
export default async function RecipesPage() {
  const posts = await getPosts({ page: 1 });
  return <ArchivePage eyebrow="Recipe index" title="All recipes" posts={posts} basePath="/recipes/" />;
}
