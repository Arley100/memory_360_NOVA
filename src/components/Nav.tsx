"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["/", "Overview", "Vue d'ensemble"],
  ["/build", "Build from sources", "Construire la mémoire"],
  ["/brief", "Handover brief", "Brief de reprise"],
  ["/questions", "Ten questions", "Questions"],
  ["/timeline", "Timeline", "Chronologie"],
  ["/decisions", "Decisions", "Décisions"],
  ["/contradictions", "Contradictions", "Contradictions"],
  ["/actions", "Actions", "Tâches"],
  ["/sources", "Sources", "Documents"],
  ["/team", "Team", "Équipe"],
  ["/update", "Add new information", "Mise à jour"],
  ["/guide", "Usage guide", "Mode d'emploi"],
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {ITEMS.map(([href, en, fr]) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 leading-tight ${active ? "bg-primary text-white" : "text-ink hover:bg-primary/10"}`}>
            <span className="block text-[15px] font-semibold">{en}</span>
            <span className={`block text-xs ${active ? "text-white/80" : "text-muted"}`}>{fr}</span>
          </Link>
        );
      })}
    </nav>
  );
}
