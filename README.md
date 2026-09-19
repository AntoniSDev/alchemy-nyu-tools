# Alchemy Nyu Tools — PROTO-004

Prototype statique de calcul de production et de chauffage pour Alchemy Factory 1.0.x. React, TypeScript strict, Vite et Vitest ; aucun serveur applicatif ni compte.

## Démarrage

Node.js 22 ou plus récent et npm sont recommandés.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Le build statique est généré dans `dist/`.

## Déploiement Cloudflare

Le dépôt est préparé pour Cloudflare Workers Static Assets, sans script Worker applicatif ni backend. `wrangler.jsonc` définit le nom `alchemy-nyu-tools`, le dossier `dist` et le fallback SPA `single-page-application` vers `index.html`.

Dans l’intégration Git Cloudflare, utiliser :

- Commande de build : `npm run build`.
- Commande de déploiement : `npx wrangler deploy` (également disponible via `npm run deploy`).

Wrangler est une dépendance de développement verrouillée dans `package-lock.json`. Installer les dépendances de développement lors du build. L’authentification de publication est gérée dans Cloudflare ; aucun identifiant n’est stocké dans le dépôt.

Validation locale sans publication, après le build :

```sh
npx wrangler deploy --dry-run
```

La base Vite est `/` pour servir les fichiers JS/CSS depuis la racine du domaine, y compris lors d’un accès direct à une URL imbriquée. Le fallback charge l’application ; il n’ajoute pas de routage client aux onglets Production et Chauffage.

Références : [configuration SPA Cloudflare](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/) et [base publique Vite](https://vite.dev/config/shared-options/#base).

## Organisation

- `src/data/prototype.ts` : objets, quatre machines, six recettes, capacité du convoyeur et entrées externes.
- `src/data/agriculture.ts`, `src/types/agriculture.ts`, `src/engine/agriculture/` : quatre engrais externes, données agricoles, calcul du débit et de la consommation.
- `src/types/production.ts` : contrat de données, requête et résultats.
- `src/engine/production/` : parcours récursif pur, contrôles, agrégation des flux et machines.
- `src/data/heating.ts` et `src/types/heating.ts` : deux générateurs, huit combustibles, règle d’efficacité, provenance et contrats de chauffage.
- `src/engine/heating/` : extraction de la charge productive pour Production, saisie manuelle et calcul pur du chauffage.
- `src/engine/transport/` : contrôle des flux par rapport à une ligne de convoyeur.
- `src/features/production/` : formulaire et résultats en français.
- `src/features/heating/` : appareils, groupes de générateurs, affectations, combustible et résultats.
- `src/data/upgrades.ts`, `src/types/upgrades.ts`, `src/engine/upgrades/` : définitions, niveaux et formules pures des quatre améliorations.
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

Une cible, une recette déterministe à sortie unique par objet, entrées externes explicites. Les recettes ambiguës, probabilistes et à plusieurs sorties sont refusées. Pas d’implantation graphique, d’optimisation, de sauvegarde ou de service distant. Les contrôles de transport portent sur les débits agrégés par objet et ne simulent aucun trajet physique.

## Chauffage

`calculateHeating(dataset, request)` est indépendant de React. Les charges importées restent la source unique de chaleur productive : les affectations contiennent seulement l’identifiant de l’appareil et son nombre physique. Cette simplification évite de dupliquer et de désynchroniser les équivalents actifs et la chaleur dans chaque groupe.

Le placement utilise les appareils construits (3 unités par creuset). Chaque groupe vérifie `quantité de générateurs × capacité`, indépendamment de la chaleur. Les groupes peuvent combiner plusieurs types de générateurs et répartir les creusets ; le contrôle est agrégé, sans simulation géométrique. Les appareils manquants provoquent un avertissement ; les doubles affectations, quantités fractionnaires d’appareils, références inconnues et valeurs numériques invalides sont refusées. Une configuration surchargée conserve une estimation théorique de consommation clairement signalée comme non réalisable.

La règle 1.0 retenue impose un coût propre de 0 P/s aux deux générateurs. Ce champ est `verified` au titre du cahier des charges fourni (provenance `spec.proto002`), sans prétendre à une vérification primaire indépendante. Les capacités de 9 et 42 unités et la règle candidate `1 + niveau × 0,10` restent `unverified` et sont signalées dans l’interface. Aucun plafond métier d’efficacité n’est imposé ; les valeurs doivent rester représentables numériquement. Les noms français non confirmés portent le marquage prévu.

### Parcours

1. Calculer une chaîne Production, puis cliquer sur **Configurer le chauffage** : tous les `HeatingLoad` sont copiés sans recalcul de leur charge productive.
2. Ajouter les groupes de générateurs, choisir leur type et leur quantité, puis affecter les appareils par nombre. Aucun nombre de fours n’est choisi automatiquement.
3. Choisir le combustible et le niveau d’efficacité ; les résultats se mettent à jour.
4. Après un nouveau calcul Production, utiliser **Importer depuis la chaîne actuelle**. L’import remplace les appareils et réinitialise les groupes, affectations et le choix du combustible, comme annoncé dans l’interface. Les niveaux globaux, dont l’efficacité du carburant, sont conservés. La simple navigation conserve les saisies. Une cible Production modifiée doit être recalculée avant import.

Le mode autonome permet de saisir la quantité totale de creusets construits et leur équivalent actif, puis d’appliquer cette configuration. Cette action remplace la liste des appareils et réinitialise leurs affectations. Une configuration vide consomme zéro ; un appareil inactif occupe toujours de la place.

### Références Chauffage

| Cas             | Placement requis / disponible | Chaleur | Énergie effective | Combustible/min | État      |
| --------------- | ----------------------------- | ------- | ----------------- | --------------- | --------- |
| H1              | 9 / 9                         | 12 P/s  | 48 P/objet        | 15              | Valide    |
| H2              | 6 / 9                         | 6 P/s   | 48 P/objet        | 7,5             | Valide    |
| H3, niveau 2    | 9 / 9                         | 12 P/s  | 57,6 P/objet      | 12,5            | Valide    |
| H4              | 12 / 9                        | 16 P/s  | 48 P/objet        | 20              | Surcharge |
| H5, 14 creusets | 42 / 42                       | 56 P/s  | 48 P/objet        | 70              | Valide    |
| H5, 15 creusets | 45 / 42                       | 60 P/s  | 48 P/objet        | 75              | Surcharge |

Ces références utilisent la poudre de charbon de bois. Les 31 tests PROTO-001 sont conservés, complétés par les références H1–H5, le transfert B/B2 et les validations du moteur Chauffage.

## Améliorations globales

Les définitions de `src/data/upgrades.ts` séparent identifiants, libellés français, statut et paramètres numériques. Toutes les règles détaillées restent `unverified`, issues des cahiers des charges PROTO-003 et PROTO-004. Les fonctions de `src/engine/upgrades/` exécutent les calculs hors React. Les niveaux sont des entiers positifs ou nuls représentables sans perte de précision ; aucun plafond de jeu arbitraire n’est ajouté.

- **Logistique** : base 60 objets/min, +15 par niveau jusqu’à 12, puis +3. La capacité effective alimente les contrôles de chaque flux.
- **Usine** : base ×1, +0,25 par niveau jusqu’à 12, puis +0,05. La durée effective est divisée par ce multiplicateur sans modifier les recettes. La chaleur instantanée de chaque appareil est multipliée par cette même valeur, puis pondérée par son nombre théorique.
- **Carburant** : base ×1, +0,10 par niveau. Le moteur Chauffage réutilise cette formule centralisée ; aucune deuxième formule n’est maintenue dans l’interface.
- **Engrais** : base ×1, +0,10 par niveau sur la valeur nutritive uniquement. Aucun effet sur le débit nutritif maximal.

`ProductionRequest.upgrades` est facultatif pour conserver les appels existants au niveau zéro. Les résultats contiennent une copie des niveaux appliqués, la capacité de convoyeur et la vitesse effective. Les `HeatingLoad` produits ajoutent le multiplicateur usine et la chaleur instantanée par appareil, sans changer le rôle de `productiveHeatPerSecond`.

Les niveaux globaux sont partagés dans `App`. Une modification valide actualise la dernière cible calculée et les flux ; une nouvelle cible nécessite toujours le bouton Calculer. Une saisie de niveau invalide conserve explicitement le dernier niveau valide. Le niveau carburant est partagé immédiatement entre Production et Chauffage, y compris après un import. Le chauffage importé conserve son instantané de vitesse, affiché en lecture seule, jusqu’à réimport explicite. Il ne remultiplie jamais la charge reçue. En mode autonome, la vitesse usine peut être réglée ; elle recalcule la chaleur des appareils saisis à équivalent actif constant.

| Cas | Résultat                                                                                    |
| --- | ------------------------------------------------------------------------------------------- |
| U1  | Logistique 0/4/12/13 : 60/120/240/243 objets/min                                            |
| U2  | Usine 0/4/12/13 : ×1/×2/×4/×4,05                                                            |
| U3  | 20 poudres/min, usine 4 : broyeur et creuset à 1,5 théorique, 2 construits, 75 %            |
| U4  | 8 P/s par creuset actif × 1,5 = 12 P/s productifs                                           |
| U5  | Poudre de charbon de bois, carburant 0/5 : 48/72 P par objet, consommation 15/10 par minute |
| U6  | Flux de 100/min, logistique 0/4 : 2/1 lignes nécessaires                                    |

Les tests vérifient également les niveaux 1 et 20, l’invariance de 36 P par poudre produite à plusieurs vitesses, l’immutabilité du dataset, les niveaux invalides et le chauffage autonome. La configuration Cloudflare reste inchangée.

## Agriculture automatisée

La chaîne agricole est Pépinière → Lin → Broyeur → Fibre de lin. La recette du lin porte `nutrientCostPerOutput: 24` et aucun `cycleTimeSeconds`. La fibre consomme un lin et utilise un cycle standard de 3 secondes. Une recette ne peut pas mélanger cycle fixe et timing nutritif.

`calculateNurseryOutputRate` calcule `(débit nutritif maximal / coût nutritif) × 60 × vitesse usine`, puis limite le résultat à la capacité du convoyeur par pépinière. Les nombres théoriques, construits et l’utilisation réutilisent les règles existantes. `calculateFertilizerLoad` calcule `production demandée × coût nutritif`, puis divise ce besoin par `valeur nutritive × (1 + niveau engrais × 0,10)`.

Le moteur reçoit `selectedFertilizerId` avec la requête. Ce choix est obligatoire lorsqu’une recette agricole est rencontrée. L’engrais reste externe même si une recette de fabrication existe dans un dataset : aucune production interne n’est recherchée. Sa consommation est agrégée par engrais dans `fertilizerLoads`, ajoutée aux entrées externes et aux flux transportés. Les `nurseryLoads` regroupent les besoins par recette et exposent le débit maximal et la limitation par convoyeur.

Les engrais disponibles sont l’engrais basique (144 V, 12 V/s), l’engrais avancé (720 V, 144 V/s), la potion de croissance (6480 V, 2160 V/s) et la panacée (200000 V, 20000 V/s). Ces valeurs viennent de PROTO-004 et restent `unverified`. Les noms français sont marqués « FR À CONFIRMER ». La valeur nutritive de la panacée est indépendante de son énergie de combustible.

Dans Production, choisir Fibre de lin et l’engrais, puis calculer. Le bloc Agriculture affiche les pépinières, leurs cadences, les valeurs nutritives et la consommation. Un changement d’engrais ou de niveau actualise la cible calculée. Les autres chaînes conservent leur fonctionnement. À cible fixe, la vitesse usine ne change pas le besoin total en nutriments. L’efficacité de l’engrais ne change pas la vitesse maximale de la pépinière.

| Référence | Résultat                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| A1        | Engrais basique : maximum de 30 lin/min                                                                      |
| A2        | 20 lin/min : 480 V/min et 3,333333 engrais/min                                                               |
| A3        | 0,666667 pépinière théorique, 1 construite, 66,6667 % d’utilisation                                          |
| A4        | Engrais avancé : 360 lin/min avant plafond, 60/min après convoyeur                                           |
| A5        | Même engrais, logistique 4 : maximum de 120/min                                                              |
| A6        | Engrais basique, usine 4 : maximum de 60/min                                                                 |
| A7        | 30 lin/min, efficacité engrais 0/5 : 5/3,333333 engrais/min ; valeur effective 144/216 V ; vitesse inchangée |

La cible de 20 fibres de lin/min nécessite 1 broyeur et 0,666667 pépinière théorique (1 construite), 20 lin/min et 3,333333 engrais basiques/min. Aucun chauffage. Les tests existants sont conservés ; les nouveaux tests couvrent aussi l’agrégation, l’immuabilité, les engrais inconnus et les valeurs invalides. Aucun recyclage, culture manuelle ou choix automatique d’engrais n’est ajouté.
