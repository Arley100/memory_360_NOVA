import { PageHeader } from "@/components/UI";
import { Chips } from "@/components/Chip";
import Link from "next/link";
import { currentAnswers, getKB, resolver, updates } from "@/lib/store";

export default async function Questions() {
  const ups = await updates();
  const r = await resolver([], ups);
  const rows = await currentAnswers(ups);
  const meta = (await getKB()).meta;
  const keyOf = (id: string) => meta?.answerKey?.details.find((d) => d.id === id);
  return (
    <div className="space-y-6">
      <PageHeader title="The ten questions" subtitle={<>Answered as of the baseline (Sept 30, 2026, 09:00). The questions come from the dossier&apos;s README; click a chip to open the exact passage.</>} />
      <div className="panel p-4 text-xs text-muted">
        {meta?.source === "ai" ? <><strong className="text-ink">AI analysis of the raw files</strong> · {meta.citations?.verified} citations verified · Answer key: <strong className="text-ink">{meta.answerKey?.score ?? "Not scored"}</strong>. <Link className="text-primary underline" href="/build">Rebuild from sources</Link></> : <>Showing the hand-curated answer key. <Link className="text-primary underline" href="/build">Build from sources</Link> to see the system&apos;s own analysis.</>}
      </div>
      <div className="questions-workspace">
      <nav aria-label="Question index" className="question-index"><p className="section-label mb-3">Answer index</p>{rows.map(({ item }) => <a key={item.id} href={`#${item.id}`}><span>{item.id}</span><span>{item.question_en}</span></a>)}</nav>
      <div className="answer-document">
      {rows.map(({ item: a, current }) => {
        const changes = ups.filter((u) => u.cs.affected.answers.includes(a.id) && !u.cs.revisedAnswers?.some((x) => x.id === a.id));
        return (
          <section key={a.id} id={a.id} className="question-section">
            <h2 className="text-lg font-semibold"><span className="text-muted">{a.id}.</span> {a.question_en}</h2>
            <p className="quote text-muted italic">{a.question_fr}</p>
            {current && (
              <div className="answer-delta mt-3">
                <p className="text-sm font-semibold">Current answer · changed in {current.changedIn}</p>
                <p className="mt-1 text-[14px] leading-relaxed">{current.text}</p>
                <div className="mt-2"><Chips cites={current.citations.map(r)} /></div>
              </div>
            )}
            {current && <p className="mt-3 text-sm font-semibold text-muted">Baseline answer (Sept 30, 2026, 09:00), preserved</p>}
            <p className={`mt-1 leading-relaxed ${current ? "text-muted" : "text-[14px]"}`}>{a.answer_en}</p>
            <p className="mt-2 text-muted"><span className="font-semibold">FR :</span> {a.answer_fr}</p>
            <div className="mt-3"><Chips cites={a.citations.map(r)} /></div>
            {keyOf(a.id) && (
              <p className={`mt-2 text-sm ${keyOf(a.id)!.pass ? "text-validation" : "text-delivery"}`}>
                {keyOf(a.id)!.pass ? "✓ Contains every key fact of the curated answer key" : `△ Missing compared with the answer key: ${keyOf(a.id)!.missing.length} fact(s)`}
              </p>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-primary">Traps avoided</summary>
              <ul className="mt-1 list-disc pl-5 text-sm">{a.traps.map((t) => <li key={t}>{t}</li>)}</ul>
            </details>
            {changes.map((u) => (
              <div key={u.cs.id} className="answer-delta mt-3 text-sm">
                <strong>Affected by {u.cs.id}</strong> ({u.cs.filename}): {u.cs.summary} The baseline answer above is preserved.
              </div>
            ))}
          </section>
        );
      })}
      </div></div>
    </div>
  );
}
