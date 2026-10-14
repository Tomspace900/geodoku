---
constraint_id: political_opec
status: active
checked_at: 2026-10-14
review_after: 2027-02-28
---

# political_opec

## Définition

États membres de l'**Organisation des pays exportateurs de pétrole (OPEP)** retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `opec`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Les Émirats arabes unis ont quitté l'OPEP au 1ᵉʳ mai 2026 (retrait confirmé : annonce du 28 avril 2026, relayée par l'agence WAM — [Enerdata](https://www.enerdata.net/publications/daily-energy-news/uae-announces-exit-opec-effective-1-may-2026-after-59-years.html), [AP](https://abcnews.com/Business/wireStory/united-arab-emirates-leave-opec-effective-1-132450136?rand=1513)). REST Countries v5 les liste encore : un delta `membershipsRemove: ["opec"]` sur `ARE` dans `countryPatches.ts` les retire, à retirer quand la source rattrape. Les anciens membres (Équateur, Indonésie, Qatar) et les pays de la coalition « OPEP+ » non membres sont exclus. Une adhésion suspendue est arbitrée explicitement.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).

Revue 2026-10-14 (#129) — deux relectures externes demandaient d'**ajouter** les Émirats ; elles se trompaient, le retrait du 1ᵉʳ mai 2026 faisant foi. Liste inchangée, à onze membres.
