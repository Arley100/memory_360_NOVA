import { PageHeader } from "@/components/UI";
import { SourceExplorer } from "@/components/SourceExplorer";
import { allSegments, allSources, updates } from "@/lib/store";

export default async function Sources() {
  const ups = await updates();
  return (
    <div className="space-y-4">
      <PageHeader title="Sources" subtitle={<>Les 64 fichiers du corpus, classés par autorité et rôle, et les fichiers ajoutés depuis la référence. Doublons et bruit masqués par défaut.</>} />
      <SourceExplorer sources={await allSources(ups)} segments={await allSegments(ups)} />
    </div>
  );
}
