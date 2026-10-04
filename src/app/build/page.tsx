import { llmProvider } from "@/lib/llm";
import { getKB } from "@/lib/store";
import { BuildClient } from "./BuildClient";

export default async function Build() {
  const k = await getKB();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Build the memory from the raw files</h1>
        <p className="max-w-3xl text-muted">
          Mémoire 360 reads all the project files, answers the questions listed in the dossier&apos;s README, works out the current state,
          rebuilds the timeline, resolves contradictions, plans the actions and writes the brief. Every citation is checked against the files,
          and the result is scored against a hand-curated answer key.
        </p>
      </div>
      <BuildClient current={{ source: k.meta?.source ?? "curated", meta: k.meta }} hasKey={Boolean(llmProvider())} />
    </div>
  );
}
