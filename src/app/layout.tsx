import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NovaChatProvider } from "@/components/chat/NovaChatProvider";
import { NovaChatWidget } from "@/components/chat/NovaChatWidget";
import { GlobalAskBar } from "@/components/chat/GlobalAskBar";
import { chatMeta } from "@/lib/chat";
import { Nav } from "@/components/Nav";
import { updates } from "@/lib/store";
import { llmProvider, modelFor } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mémoire 360 · NOVA", description: "Mémoire opérationnelle du projet NOVA" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ups = await updates();
  const last = ups.at(-1)?.cs.id;
  const ai = llmProvider();
  return (
    <html lang="fr">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" />
      </head>
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 bg-white p-2 z-50">Aller au contenu</a>
        <NovaChatProvider initialMeta={await chatMeta(ups)}>
        <div className="app-shell">
          <aside className="no-print sidebar">
            <Link href="/" className="brand">
              <span className="nova-mark" aria-hidden="true"><i /><i /><i /></span>
              <span><span className="block text-lg font-semibold tracking-tight">NOVA 360</span><span className="block text-[10px] text-white/55">Mémoire 360 · Mémoire opérationnelle</span></span>
            </Link>
            <Nav />
            <div className="sidebar-footer"><p className="section-label text-white/40">Version de référence</p><p>Référence · 30 sept., 9 h</p><span>{ups.length ? `${ups.length} mise(s) à jour publiée(s) · ${last}` : "Référence initiale du projet"}</span></div>
          </aside>
          <div className="workspace">
            <header className="no-print workspace-header">
              <GlobalAskBar />
              <div className="ai-status"
                title={ai ? `Questions : ${modelFor("ask")} · Mise à jour : ${modelFor("update")}. Exécutez npm run check pour tester la connexion.` : "Aucun fournisseur d’IA : consultation, preuves, recherche, téléversement, vérification et publication restent disponibles. L’édition manuelle couvre trois colonnes de texte ; l’analyse des impacts et le recalcul nécessitent une IA."}>
                <span className={`h-2.5 w-2.5 rounded-full ${ai ? "bg-validation" : "bg-muted"}`} aria-hidden />
                {ai ? <span>IA configurée</span> : <span>Sans IA · vérification manuelle</span>}
              </div>
              <div className="version-status" title={`Référence : 30 sept. 2026, 9 h (Montréal)${last ? ` · État actuel après ${last} · ${ups.length} mise(s) à jour publiée(s)` : ""}`}>
                <span className="font-semibold">{last ? `Actuel · ${last}` : "Référence"}</span>
                <span className="text-muted">{last ? "Référence · " : ""}30 sept. 2026 · 9 h HE</span>
                {ups.length > 0 && <span className="text-muted">· {ups.length} mise(s) à jour</span>}
              </div>
            </header>
            <main id="main" tabIndex={-1} className="workspace-content">{children}</main>
          </div>
        </div>
        <NovaChatWidget />
        </NovaChatProvider>
      </body>
    </html>
  );
}
