import { Chips } from "@/components/Chip";
import { kb, resolver, updates } from "@/lib/store";

export default function Questions() {
  const k = kb();
  const r = resolver();
  const ups = updates();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">The ten questions</h1>
      <p className="text-muted">Answered as of the baseline (Sept 30, 2026, 09:00). Each answer cites at least two distinct sources; click a chip to open the exact passage.</p>
      {k.answers.map((a) => {
        const changes = ups.filter((u) => u.cs.affected.answers.includes(a.id));
        return (
          <section key={a.id} id={a.id} className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-xl font-bold"><span className="text-muted">{a.id}.</span> {a.question_en}</h2>
            <p className="quote text-muted italic">{a.question_fr}</p>
            <p className="mt-3 text-[17px] leading-relaxed">{a.answer_en}</p>
            <p className="mt-2 text-muted"><span className="font-semibold">FR :</span> {a.answer_fr}</p>
            <div className="mt-3"><Chips cites={a.citations.map(r)} /></div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-primary">Traps avoided</summary>
              <ul className="mt-1 list-disc pl-5 text-sm">{a.traps.map((t) => <li key={t}>{t}</li>)}</ul>
            </details>
            {changes.map((u) => (
              <div key={u.cs.id} className="mt-3 rounded-md border border-marker bg-marker/30 p-3 text-sm">
                <strong>Affected by {u.cs.id}</strong> ({u.cs.filename}): {u.cs.summary} The baseline answer above is preserved.
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
