import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { updates } from "@/lib/store";
import { llmProvider, modelFor } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mémoire 360 · NOVA", description: "Operational memory of project NOVA" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ups = updates();
  const last = ups.at(-1)?.cs.id;
  const ai = llmProvider();
  const short = (m: string) => m.replace(/^claude-/, "").replace(/-(\d)-(\d)$/, " $1.$2");
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" />
      </head>
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 bg-white p-2 z-50">Skip to content</a>
        <div className="flex min-h-screen">
          <aside className="no-print w-60 shrink-0 border-r border-line bg-surface p-4 flex flex-col gap-6 sticky top-0 h-screen overflow-y-auto">
            <Link href="/" className="block">
              <span className="block text-xl font-bold tracking-tight">Mémoire 360</span>
              <span className="block text-sm text-muted">Project NOVA · Projet 360</span>
            </Link>
            <Nav />
          </aside>
          <div className="flex-1 min-w-0">
            <header className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-surface/95 px-6 py-3 backdrop-blur">
              <form action="/ask" className="flex flex-1 min-w-[260px] gap-2" role="search">
                <label htmlFor="q" className="sr-only">Ask a question about NOVA</label>
                <input id="q" name="q" placeholder="Ask a question about NOVA (EN or FR)…"
                  className="flex-1 rounded-md border border-line bg-canvas px-3 py-2 text-[15px]" />
                <button className="rounded-md bg-primary px-4 py-2 font-semibold text-white">Ask</button>
              </form>
              <div className="flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs"
                title={ai ? `Ask: ${modelFor("ask")} · Update: ${modelFor("update")}. Run npm run check to test the connection.` : "No API key: evidence, search and manual updates still work."}>
                <span className={`h-2.5 w-2.5 rounded-full ${ai ? "bg-validation" : "bg-muted"}`} aria-hidden />
                {ai ? <span>AI configured · {short(modelFor("ask"))} / {short(modelFor("update"))}</span> : <span>AI off · evidence-only mode</span>}
              </div>
              <div className="text-sm text-right leading-tight">
                <div className="font-semibold">{last ? `Current state · after ${last}` : "Baseline state"}</div>
                <div className="text-muted">Baseline: Sept 30, 2026, 09:00 (Montréal){ups.length ? ` · ${ups.length} update(s)` : ""}</div>
              </div>
            </header>
            <main id="main" className="mx-auto max-w-6xl px-6 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
