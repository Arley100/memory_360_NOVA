import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-2l2 2M18 17a7 7 0 0 1-12 2l-2-2" /></>,
  overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  file: <><path d="M14 2H5v20h14V7zM14 2v5h5M8 12h8M8 16h6" /></>,
  questions: <><circle cx="12" cy="12" r="9" /><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01" /></>,
  timeline: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  decisions: <><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="6" r="2" /><path d="M6 7v10M8 17c7 0 10-4 10-9" /></>,
  contradictions: <><path d="M12 3v18M5 6h14M5 6l-4 8h8zM19 6l-4 8h8zM8 21h8" /></>,
  actions: <><path d="m3 5 2 2 3-4M11 5h10M3 12h5M11 12h10M3 19h5M11 19h10" /></>,
  sources: <><path d="M3 7V4h6l2 3h10v13H3z" /><circle cx="12" cy="13" r="3" /><path d="m14 15 3 3" /></>,
  team: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3" /></>,
  upload: <><path d="M12 16V3m-4 4 4-4 4 4M3 15v6h18v-6" /></>,
  guide: <><path d="M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1zm0 0v16" /></>,
  search: <><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></>,
  link: <><path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m7 12 3 3 7-7" /></>,
  warning: <><path d="m12 3 10 18H2zM12 9v5M12 17h.01" /></>,
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">{paths[name] ?? paths.file}</svg>;
}
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return <div className="page-header"><div><p className="section-label mb-2">Projet NOVA / Mémoire opérationnelle</p><h1>{title}</h1>{subtitle && <p className="mt-2 max-w-4xl text-muted">{subtitle}</p>}</div>{children}</div>;
}
export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="section-header"><h2>{title}</h2>{children}</div>;
}
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function MetricCell({ label, value, children }: { label: string; value: ReactNode; children?: ReactNode }) {
  return <div className="metric-cell"><p className="section-label">{label}</p><div className="metric-value">{value}</div>{children && <div className="mt-1 text-xs text-muted">{children}</div>}</div>;
}
