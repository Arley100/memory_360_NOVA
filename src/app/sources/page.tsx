import { SourceExplorer } from "@/components/SourceExplorer";
import { allSegments, allSources } from "@/lib/store";

export default function Sources() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Sources</h1>
      <p className="text-muted">All 64 corpus files, classified by authority and role, plus any file added after the baseline. Duplicates and noise are hidden by default.</p>
      <SourceExplorer sources={allSources()} segments={allSegments()} />
    </div>
  );
}
