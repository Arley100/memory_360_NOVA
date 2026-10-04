"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./UI";
const GROUPS = [
  {
    title: "Projet",
    items: [
      ["/", "Vue d’ensemble", "overview"],
      ["/brief", "Fiche de passation", "file"],
      ["/questions", "Questions", "questions"],
      ["/timeline", "Chronologie", "timeline"],
      ["/decisions", "Décisions", "decisions"],
      ["/contradictions", "Contradictions", "contradictions"],
    ],
  },
  {
    title: "Opérations",
    items: [
      ["/build", "Reconstruire depuis les sources", "sources"],
      ["/actions", "Actions", "actions"],
      ["/risks", "Risques", "warning"],
      ["/sources", "Sources", "sources"],
      ["/team", "Équipe", "team"],
      ["/update", "Ajouter des informations", "upload"],
    ],
  },
  { title: "Aide", items: [["/guide", "Guide d’utilisation", "guide"]] },
];
export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Navigation principale" className="main-nav">
      {GROUPS.map((g) => (
        <div key={g.title} className="nav-group">
          <p className="nav-label">{g.title}</p>
          {g.items.map(([href, label, icon]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`nav-link ${active ? "is-active" : ""}`}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
