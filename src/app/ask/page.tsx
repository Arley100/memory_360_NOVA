import { AskClient } from "./AskClient";

export default async function Ask({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Ask the project</h1>
      <p className="text-muted">Answers come only from the NOVA files. Every citation is checked against the source text; anything that can&apos;t be found is removed.</p>
      <AskClient initial={q} />
    </div>
  );
}
