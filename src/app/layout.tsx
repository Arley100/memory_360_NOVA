import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Icon } from "@/components/UI";
import { Nav } from "@/components/Nav";
import { updates } from "@/lib/store";
import { llmProvider, modelFor } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mémoire 360 · NOVA", description: "Operational memory of project NOVA" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ups = await updates();
  const last = ups.at(-1)?.cs.id;
  const ai = llmProvider();
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" />
      </head>
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 bg-white p-2 z-50">Skip to content</a>
        <div className="app-shell">
          <aside className="no-print sidebar">
            <Link href="/" className="brand">
              <span className="nova-mark" aria-hidden="true"><i /><i /><i /></span>
              <span><span className="block text-lg font-semibold tracking-tight">NOVA 360</span><span className="block text-[10px] text-white/55">Mémoire 360 · Operational memory</span></span>
            </Link>
            <Nav />
            <div className="sidebar-footer"><p className="section-label text-white/40">Version reference</p><p>Baseline · Sept 30, 09:00</p><span>{ups.length ? `${ups.length} published update(s) · ${last}` : "Original project baseline"}</span></div>
          </aside>
          <div className="workspace">
            <header className="no-print workspace-header">
              <form action="/ask" className="header-search" role="search">
                <Icon name="search" />
                <label htmlFor="q" className="sr-only">Ask a question about NOVA</label>
                <input id="q" name="q" placeholder="Ask a question about NOVA (EN or FR)…"
                  className="min-w-0 flex-1 bg-transparent text-sm" />
                <button className="search-submit">Ask</button>
              </form>
              <div className="ai-status"
                title={ai ? `Ask: ${modelFor("ask")} · Update: ${modelFor("update")}. Run npm run check to test the connection.` : "No API key: evidence, search and manual updates still work."}>
                <span className={`h-2.5 w-2.5 rounded-full ${ai ? "bg-validation" : "bg-muted"}`} aria-hidden />
                {ai ? <span>AI configured</span> : <span>AI off · evidence-only mode</span>}
              </div>
              <div className="version-status">
                <div className="font-semibold">{last ? `Current state · after ${last}` : "Baseline state"}</div>
                <div className="text-muted">Baseline: Sept 30, 2026, 09:00 (Montréal){ups.length ? ` · ${ups.length} update(s)` : ""}</div>
              </div>
            </header>
            <main id="main" tabIndex={-1} className="workspace-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
