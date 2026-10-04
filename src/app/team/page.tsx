import { PageHeader } from "@/components/UI";
import { getKB } from "@/lib/store";

export default async function Team() {
  const k = await getKB();
  return (
    <div className="space-y-6">
      <PageHeader title="Équipe" subtitle={<>Toutes les personnes et organisations sont fictives.</>} />
      <ul className="panel team-roster">
        {k.people.map((p) => (
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
