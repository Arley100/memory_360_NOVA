import { kb } from "@/lib/store";

export default function Team() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Team</h1>
      <p className="text-muted">All people and organizations are fictional.</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {kb().people.map((p) => (
          <li key={p.name} className="rounded-lg border border-line bg-surface p-4">
            <p className="text-lg font-semibold">{p.name}</p>
            <p>{p.role}{p.since !== "—" ? ` · ${p.since}` : ""}</p>
            <p className="text-muted">{p.owns}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
