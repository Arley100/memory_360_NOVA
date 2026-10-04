"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./UI";
const GROUPS = [
  {
    title: "Project",
    items: [
      ["/", "Overview", "overview"],
      ["/brief", "Handover brief", "file"],
      ["/questions", "Questions", "questions"],
      ["/timeline", "Timeline", "timeline"],
      ["/decisions", "Decisions", "decisions"],
      ["/contradictions", "Contradictions", "contradictions"],
    ],
  },
  {
    title: "Operations",
    items: [
      ["/build", "Build from sources", "sources"],
      ["/actions", "Actions", "actions"],
      ["/risks", "Risks", "warning"],
      ["/sources", "Sources", "sources"],
      ["/team", "Team", "team"],
      ["/update", "Add new information", "upload"],
    ],
  },
  { title: "Support", items: [["/guide", "Usage guide", "guide"]] },
];
export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="main-nav">
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
