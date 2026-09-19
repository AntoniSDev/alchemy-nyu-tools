# Alchemy Nyu Tools — PROTO-001

Prototype statique de calcul de production pour Alchemy Factory 1.0.x. React, TypeScript strict, Vite et Vitest ; aucun serveur applicatif ni compte.

## Démarrage

Node.js 22 ou plus récent et npm sont recommandés.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Le build statique est généré dans `dist/`. Aucun déploiement n’est configuré.

## Organisation

- `src/data/prototype.ts` : six objets, trois machines, quatre recettes, capacité du convoyeur et entrées externes.
- `src/types/production.ts` : contrat de données, requête et résultats.
- `src/engine/production/` : parcours récursif pur, contrôles, agrégation des flux et machines.
- `src/engine/heating/` : extraction de la charge productive uniquement.
- `src/engine/transport/` : contrôle des flux par rapport à une ligne de convoyeur.
- `src/features/production/` : formulaire et résultats en français.
- `src/app/` : entrée React et styles adaptatifs.
- `tests/` : références métier et cas unitaires/erreurs.

L’API `calculateProduction(dataset, request)` reçoit une cible et les identifiants des entrées externes. Elle retourne l’arbre, les flux agrégés, les besoins machines, les entrées externes, les charges thermiques et les contrôles de transport. Elle lève une erreur explicite en cas de donnée invalide rencontrée. Le moteur ne dépend pas de React et ne modifie pas les arguments.

Les besoins sont regroupés par recette avant arrondi ; les machines de recettes distinctes restent dédiées, puis sont regroupées par type pour l’affichage. La tolérance absolue d’arrondi est de `1e-10`. Une demande nulle est acceptée et produit zéro appareil et zéro utilisation.

## Références

| Cas | Cible par minute         | Appareils théoriques / construits | Entrée par minute | Chaleur productive |
| --- | ------------------------ | --------------------------------- | ----------------- | ------------------ |
| A   | 15 petits engrenages     | Processeur 1/1 ; broyeur 0,5/1    | 5 planches        | Aucune             |
| A2  | 30 petits engrenages     | Processeur 2/2 ; broyeur 1/1      | 10 planches       | Aucune             |
| B   | 20 poudres de chaux vive | Broyeur 3/3 ; creuset 3/3         | 20 pierres        | 12 P/s             |
| B2  | 10 poudres de chaux vive | Broyeur 1,5/2 ; creuset 1,5/2     | 10 pierres        | 6 P/s              |

Les noms français ci-dessus sont **FR À CONFIRMER**. Les valeurs sont transcrites du cahier des charges fourni, sans vérification indépendante dans le jeu. Leur statut de traduction et les références de preuve sont stockés avec les noms.

Temps en secondes, débits en objets/min, charge thermique en P/s. Le chauffage dépend du nombre théorique d’appareils ; B2 utilise chaque type à 75 %. Tous les flux des références tiennent sur une ligne de 60 objets/min.

## Limites assumées

Une cible, une recette déterministe à sortie unique par objet, entrées externes explicites. Les recettes ambiguës, probabilistes et à plusieurs sorties sont refusées. Pas de choix de four, combustible, implantation, optimisation, sauvegarde ou service distant. Le bouton de chauffage reste désactivé. Les contrôles de transport portent sur les débits agrégés par objet et ne simulent aucun trajet physique.
