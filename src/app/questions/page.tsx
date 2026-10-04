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
      <PageHeader title="Questions" subtitle={<>Project answers with evidence from the NOVA files. Ask another question to add its answer below; click a citation to open the exact passage.</>} />
      <div className="panel p-4 text-xs text-muted">
        {meta?.source === "ai" ? <><strong className="text-ink">AI analysis of the raw files</strong> · {meta.citations?.verified} citations verified · Dossier answer-key score: <strong className="text-ink">{meta.answerKey?.score ?? "Not scored"}</strong>. <Link className="text-primary underline" href="/build">Rebuild from sources</Link></> : <>Showing the hand-curated answer key. <Link className="text-primary underline" href="/build">Build from sources</Link> to see the system&apos;s own analysis.</>}
      </div>
      <QuestionsWorkspace initial={q} questions={rows.map((row) => ({ id: row.id, question: row.question }))}>
        <QuestionsClient initialRows={rows} />
      </QuestionsWorkspace>
    </div>
  );
}
