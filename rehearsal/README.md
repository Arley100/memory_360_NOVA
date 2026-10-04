# Fichiers de répétition (simulations, sans valeur factuelle pour NOVA)

Utilisez ces fichiers pour répéter l’étape « Ajouter une information » en direct. Ne les présentez jamais comme de véritables informations du projet.

| Fichier | Ce qu’il vérifie | Résultat attendu |
|---|---|---|
| `R1_retest_SEC-210_echec.eml` | Échec du nouvel essai de sécurité et proposition du 5 novembre par le fournisseur | SEC-210 reste ouvert ; la décision du 22 octobre reste en vigueur ; le 5 novembre reste une proposition non approuvée et est signalé comme postérieur à la fin du contrat, le 31 octobre |
| `R2_Teams_ACC-303_valide.txt` | Mélissa ferme ACC-303 | Condition 2 remplie, avec citation de la responsable de validation ; conditions 1 et 3 inchangées |
| `formats/cr.docx` | Compte rendu du comité approuvant un report au 29 octobre | Une nouvelle décision n’est acceptée que si l’approbation est citée ; sinon elle reste une proposition |
| `formats/invite.ics` | Invitation à une réunion du comité | Lecture des champs de l’événement : titre, début, organisateur, description |
| `formats/teams_export.json` | Export Teams où Mélissa ferme ACC-303 | Lecture sous la forme « heure - auteur : message » |
| `formats/deck.pptx` | Diapositive d’état avec notes de présentation | Lecture du texte et des notes ; la mention du 29 octobre reste une proposition |
| `formats/plan_v4.xls` | Plan actualisé avec mise en production le 2026-10-22 | Le plan correspond désormais à la date approuvée ; la contradiction C1 est résolue pour la suite |
| `formats/html_only.eml` | Courriel dont le corps est uniquement en HTML | Lecture correcte du corps |
| `formats/notes_win.txt` | Texte français enregistré en Windows-1252 | Lecture correcte des accents |
| `formats/page.html`, `formats/note.rtf` | Page web et texte enrichi | Lecture correcte du texte |

Pour plusieurs fichiers, sélectionnez-les ou déposez-les ensemble, ou regroupez-les dans une archive `.zip`.
