import { llmProvider } from "@/lib/llm";
import { getKB } from "@/lib/store";
import { BuildClient } from "./BuildClient";
import { PageHeader } from "@/components/UI";

export default async function Build() {
  const k = await getKB();
  return (
    <div className="space-y-6">
      <PageHeader title="Reconstruire depuis les sources" subtitle={<>
          Mémoire 360 lit les fichiers du projet, répond aux questions du README du dossier, établit l’état actuel, reconstitue la chronologie, résout les contradictions, planifie les actions et rédige la fiche de passation. Chaque citation est vérifiée et les résultats sont comparés aux faits requis validés par l’équipe.
      </>} />
      <BuildClient current={{ source: k.meta?.source ?? "curated", meta: k.meta }} hasKey={Boolean(llmProvider())} />
    </div>
  );
}
