const fs=require('fs');
function edit(f,fn){const s=fs.readFileSync(f,'utf8');fs.writeFileSync(f,fn(s));}
function label(f,pairs){edit(f,s=>'import { frenchLabel } from "@/lib/locale";\n'+pairs.reduce((v,[a,b])=>v.replaceAll(a,b),s));}
edit('src/lib/risks.ts',s=>s.replaceAll('"Actuel"','"Current"').replaceAll('"Périmé/résolu"','"Stale/resolved"').replaceAll('"Fermé"','"Closed"').replaceAll('"Incertain"','"Uncertain"'));
label('src/app/risks/page.tsx', [['status === "Actuel"','status === "Current"'],['status === "Incertain"','status === "Uncertain"'],['{status}','{frenchLabel(status)}'],['{before.status} → {risk.status}','{frenchLabel(before.status)} → {frenchLabel(risk.status)}']]);
label('src/app/page.tsx',[['{status}','{frenchLabel(status)}'],['{statusBefore(c.id)}','{frenchLabel(statusBefore(c.id))}'],['{a.ownerStatus}','{frenchLabel(a.ownerStatus)}'],['{a.due}','{frenchLabel(a.due)}'],['(previously ${metBefore})','(auparavant ${metBefore})']]);
label('src/app/actions/page.tsx',[['{a.ownerStatus}','{frenchLabel(a.ownerStatus)}'],['{a.due}','{frenchLabel(a.due)}'],['a.due.startsWith("TBC")','/^(TBC|À confirmer)/.test(a.due)']]);
label('src/components/ChangeSetView.tsx',[['{a.ownerStatus}','{frenchLabel(a.ownerStatus)}'],['{a.due}','{frenchLabel(a.due)}'],['|| "none"','|| "aucun"'],['n.includes("may present the proposed date")','/may present the proposed date|peut présenter la date proposée/.test(n)'],['n.includes("NOT closed")','/NOT closed|NON fermée/.test(n)'],['n.startsWith("Moved to proposals")','/^(Moved to proposals|Déplacée vers les propositions)/.test(n)']]);
label('src/components/SourceExplorer.tsx',[['{s.role.toLowerCase()}','{frenchLabel(s.role)}'],['{s.authority.toLowerCase().replace("_", " ")}','{frenchLabel(s.authority)}']]);
label('src/components/Chip.tsx',[['{data.authority.toLowerCase().replace("_", " ")}','{frenchLabel(data.authority)}'],['OPEN: "Ouvrir"','OPEN: "Ouverte"']]);
label('src/components/chat/NovaChatMessage.tsx',[['{c.authority?.toLowerCase().replaceAll("_", " ")}','{frenchLabel(c.authority)}'],['toLocaleTimeString([],','toLocaleTimeString("fr-CA",']]);
label('src/app/sources/[id]/page.tsx',[['{s.authority}','{frenchLabel(s.authority)}'],['{s.role}','{frenchLabel(s.role)}'],['{s.version}','{frenchLabel(s.version)}']]);
label('src/app/contradictions/page.tsx',[['{c.rule}','{frenchLabel(c.rule)}']]);
label('src/app/timeline/page.tsx',[['{k.goLive.status ?? "conditional"}','{frenchLabel(k.goLive.status ?? "conditional")}']]);
label('src/app/decisions/page.tsx',[['${s.stage}: ','${frenchLabel(s.stage)} : '],['cols.map((c) =>','cols.map((c, i) =>'],['${c.toLowerCase()}','${["proposed", "decided", "delivered", "validated"][i]}']]);
edit('src/app/layout.tsx',s=>s.replace('lang="en"','lang="fr"'));
edit('src/app/questions/QuestionsClient.tsx',s=>s.replace('"en-CA"','"fr-CA"').replace('"changed" : "unchanged"','"modifiée" : "inchangée"').replace(' : "in"}', ' : "dans"}'));
edit('src/lib/text.ts',s=>s.replace('"en-CA"','"fr-CA"').replace('return "row "','return "rangée "').replace('return "attachment "','return "pièce jointe "').replace('`${m[1]} ${m[2]} ¶${m[3]}`','`${m[1] === "slide" ? "diapositive" : "notes"} ${m[2]} ¶${m[3]}`').replace('`event ${m[1]}','`événement ${m[1]}').replace('return "file"','return "fichier"').replace('} ET`','} HE`').replace('`${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`','`${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`').replace('ymd ?? "TBC"','ymd ?? "À confirmer"'));
