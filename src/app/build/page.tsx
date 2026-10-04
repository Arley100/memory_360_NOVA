import { llmProvider } from "@/lib/llm";
import { getKB } from "@/lib/store";
import { BuildClient } from "./BuildClient";
import { PageHeader } from "@/components/UI";

export default async function Build() {
  const k = await getKB();
  return (
    <div className="space-y-6">
      <PageHeader title="Build from sources" subtitle={<>
          Mémoire 360 reads all the project files, answers the questions listed in the dossier&apos;s README, works out the current state,
          rebuilds the timeline, resolves contradictions, plans the actions and writes the brief. Every citation is checked against the files,
          and the result is scored against a hand-curated answer key.
      </>} />
      <BuildClient current={{ source: k.meta?.source ?? "curated", meta: k.meta }} hasKey={Boolean(llmProvider())} />
    </div>
  );
}
