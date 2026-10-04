import { PageHeader } from "@/components/UI";
import { SourceExplorer } from "@/components/SourceExplorer";
import { allSegments, allSources, updates } from "@/lib/store";

export default async function Sources() {
  const ups = await updates();
  return (
    <div className="space-y-4">
      <PageHeader title="Sources" subtitle={<>All 64 corpus files, classified by authority and role, plus any file added after the baseline. Duplicates and noise are hidden by default.</>} />
      <SourceExplorer sources={await allSources(ups)} segments={await allSegments(ups)} />
    </div>
  );
}
