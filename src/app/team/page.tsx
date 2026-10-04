import { PageHeader } from "@/components/UI";
import { kb } from "@/lib/store";

export default function Team() {
  return (
    <div className="space-y-6">
      <PageHeader title="Team" subtitle={<>All people and organizations are fictional.</>} />
      <ul className="panel team-roster">
        {kb().people.map((p) => (
          <li key={p.name} className="roster-row">
            <span className="initials" aria-hidden="true">{p.name.split(" ").map((n) => n[0]).slice(0,2).join("")}</span><div><p className="text-sm font-semibold">{p.name}</p>
            <p>{p.role}{p.since !== "—" ? ` · ${p.since}` : ""}</p>
            <p className="mt-1 text-xs text-muted">{p.owns}</p></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
