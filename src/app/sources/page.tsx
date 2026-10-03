import { SourceExplorer } from "@/components/SourceExplorer";
import { allSegments, allSources, updates } from "@/lib/store";

export default async function Sources() {
  const ups = await updates();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Sources</h1>
      <p className="text-muted">All 64 corpus files, classified by authority and role, plus any file added after the baseline. Duplicates and noise are hidden by default.</p>
      <SourceExplorer sources={await allSources(ups)} segments={await allSegments(ups)} />
    </div>
  );
}
