import { redirect } from "next/navigation";

export default async function Ask({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  redirect(q ? `/questions?q=${encodeURIComponent(q)}` : "/questions");
}
