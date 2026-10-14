---
constraint_id: physical_crosses_equator
status: active
checked_at: 2026-10-14
review_after: 2027-01-21
---

# physical_crosses_equator

## Définition

Pays dont l'équateur coupe les terres émergées **ou traverse directement un archipel** : les eaux entre les îles d'un même archipel du pays.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief) (Natural Earth).
- Liste établie par revue cartographique du tracé.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `equator_crosser`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le critère porte sur le **territoire**, pas sur le centre : un pays dont l'équateur ne coupe qu'une pointe y figure.

**Règle (révision 2026-10-14, #129).** La ligne coupe une terre émergée, **ou** passe dans les eaux entre les îles d'un même archipel du pays. Les **Maldives** (chenal Addu Kandu, entre les atolls Huvadhu et Addu) et **Kiribati** (entre Aranuka et Nonouti) y entrent à ce titre. Sao Tomé-et-Principe y figurait déjà.

La **Guinée équatoriale** reste exclue : la ligne passe entre le bloc continental et Bioko, au nord, et l'île d'Annobón, au sud. Annobón n'appartient pas au même archipel que le reste du pays — Sao Tomé-et-Principe s'interpose — et aucune terre n'est coupée. Les deux conditions de la règle manquent.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).

Revue 2026-10-09 (#122) — même règle que la Guinée équatoriale : la ligne ne coupe aucune terre émergée des **Maldives** (chenal Addu Kandu, entre Huvadhu et Addu) ni de **Kiribati** (entre Aranuka et Nonouti). Retraits : MDV, KIR. Restent les onze États dont la ligne coupe la terre (Wikipédia, *Equator*).

Revue 2026-10-14 (#129) — **arbitrage du 2026-10-09 inversé** : la règle de la terre émergée seule est élargie aux eaux entre les îles d'un même archipel du pays (voir Cas limites). Réintégrations : **MDV**, **KIR** (11 → 13). La Guinée équatoriale reste exclue, motif écrit plus haut.
