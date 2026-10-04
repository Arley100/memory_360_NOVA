import { PageHeader } from "@/components/UI";
import { ChangeSetView } from "@/components/ChangeSetView";
import { updates } from "@/lib/store";
import { fmtDateTime } from "@/lib/text";
import { UpdateClient } from "./UpdateClient";
import { ResetButton } from "./ResetButton";

export default async function Update() {
  const ups = await updates();
  return (
    <div className="space-y-8">
      <PageHeader title="Ajouter des informations" subtitle={<>Déposez un fichier. Avec une IA configurée, Mémoire 360 distingue problèmes, décisions antérieures et propositions, puis identifie impacts et actions. Sans IA, vérifiez le texte extrait et modifiez les trois colonnes. La publication vérifie les garde-fous et crée une version ; la référence du 30 septembre est préservée.</>} />
      <UpdateClient />
      <section className="version-history space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Versions publiées</h2>
          <ResetButton count={ups.length} />
        </div>
        <p className="baseline-version"><strong>Référence</strong> · 30 sept. 2026, 9 h · 64 fichiers · figée</p>
        {ups.length === 0 && <p className="text-muted">Aucune mise à jour.</p>}
        {ups.slice().reverse().map((u) => (
          <details key={u.cs.id} className="published-version">
            <summary className="version-summary">{u.cs.id} · {u.cs.filename} <span className="text-sm font-normal text-muted">publiée {fmtDateTime(u.cs.publishedAt)}</span></summary>
            <div className="p-5"><ChangeSetView cs={u.cs} /></div>
          </details>
        ))}
      </section>
    </div>
  );
}
