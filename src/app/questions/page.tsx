import { QuestionsWorkspace } from "./QuestionsWorkspace";
import { PageHeader } from "@/components/UI";
import { QuestionsClient } from "./QuestionsClient";
import { getQuestionViews } from "@/lib/questionComputations";
import Link from "next/link";
import { getKB } from "@/lib/store";

export default async function Questions({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = await getQuestionViews();
  const meta = (await getKB()).meta;
  return (
    <div className="space-y-6">
      <PageHeader title="Questions" subtitle={<>Réponses fondées sur les fichiers NOVA. Posez une autre question pour ajouter sa réponse ; cliquez sur une citation pour ouvrir le passage exact.</>} />
      <div className="panel p-4 text-xs text-muted">
        {meta?.source === "ai" ? <><strong className="text-ink">Analyse par IA des fichiers sources</strong> · {meta.citations?.verified} citations vérifiées · Couverture des faits requis : <strong className="text-ink">{meta.answerKey?.score ?? "Non évaluée"}</strong>. <Link className="text-primary underline" href="/build">Reconstruire depuis les sources</Link></> : <>Affichage des faits vérifiés par l’équipe. <Link className="text-primary underline" href="/build">Reconstruire depuis les sources</Link> pour consulter l’analyse du système.</>}
      </div>
      <QuestionsWorkspace initial={q} questions={rows.map((row) => ({ id: row.id, question: row.question }))}>
        <QuestionsClient initialRows={rows} />
      </QuestionsWorkspace>
    </div>
  );
}
