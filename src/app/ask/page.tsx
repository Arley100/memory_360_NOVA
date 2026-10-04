import { PageHeader } from "@/components/UI";
import { AskClient } from "./AskClient";

export default async function Ask({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <div className="space-y-4">
      <PageHeader title="Ask the project" subtitle={<>Answers come only from the NOVA files. Every citation is checked against the source text; anything that can&apos;t be found is removed.</>} />
      <AskClient initial={q} />
    </div>
  );
}
