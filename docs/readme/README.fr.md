<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

**À propos de Desktop 0.8.5 :** L’application autonome OpenQuantum pour macOS sur Apple Silicon retrouve l’interface simple de DSH Desktop 2.0.0 / Harness 0.1.0-rc.6. L’interface propose pour le moment le chinois et l’anglais ; les traductions et les README existants sont conservés. Les indications ci-dessous concernant la version 0.8.4 décrivent la version précédente. Consultez le [guide d’installation](../DESKTOP_INSTALLERS.md) pour la procédure actuelle et les limites de la signature. Le plugin Codex publié reste en version 0.8.4.

<p align="center">
  <strong>OpenQuantum — Construisons ensemble une IA de confiance pour la recherche quantique.</strong><br />
  <sub>L’expertise de la recherche quantique réunie dans OpenQuantum</sub>
</p>

<p align="center">
  <a href="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml"><img src="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml/badge.svg" alt="État de la CI" /></a>
  <a href="../../THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/licenses-MIT%20%2B%20component%20licenses-111111.svg" alt="Licence MIT et licences des composants" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a.svg" alt="Node.js 24 ou ultérieur" />
</p>

OpenQuantum est une plateforme d’IA pour la recherche quantique, open source et ouverte à la collaboration. Elle rassemble les logiciels, les algorithmes et les travaux publiés par la communauté open source pour que l’IA puisse analyser votre question de recherche, choisir des méthodes, exécuter des calculs et vérifier les résultats. L’expertise partagée devient une capacité de recherche réellement utilisable.

Partez d’une question de recherche, d’un article ou d’un programme existant, et associez l’IA à votre investigation. Les programmes, les paramètres et les vérifications sont conservés : chaque investigation devient le point de départ de la suivante.

Choisissez l’accès qui vous convient ; tous deux partagent les mêmes fonctionnalités spécialisées. Le **[plugin Codex](../integrations/CODEX_PLUGIN.md)** apporte les Skills quantiques et les Tools scientifiques dans les conversations natives de Codex, avec une page de paramètres pour activer les fonctionnalités, gérer les connexions MCP et les jetons. **Desktop** comprend l’environnement de recherche et l’application distincte Quantum Learning, avec des services de modèles que vous configurez vous-même.

**[Installer le plugin Codex](#codex)** · [Installer Desktop](#desktop-installer) · [Voir les calculs et les résultats](#use-and-inspect-results) · [Visiter le site web](https://xi-zhao.github.io/OpenQuantum/)

**Commencez par les cas mesurés :** un [commutateur de Pauli avec PennyLane](#pennylane-rust-case) est **5,09×** plus rapide en appel complet, et un [calcul de fonction de Wigner avec QuTiP](#qutip-rust-case) **5,69×** plus rapide. Les deux conservent les comparaisons de performances, les vérifications des résultats et les traces de reproduction.

**Version actuelle 0.8.4 :** [téléchargement et notes de version de Desktop](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) · [téléchargement et notes de version du plugin Codex](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4). Les deux partagent la même version produit.

- **Des fonctionnalités plus faciles à trouver :** Tools, MCP et Skills sont classés en huit catégories d’usage, avec recherche et filtres d’état.
- **Une seule icône de lancement :** `OpenQuantum.app` sur Mac et `OpenQuantum.lnk` sur Windows utilisent l’icône OpenQuantum, tout en conservant l’interface d’origine de DSH Desktop, Quantum Learning et l’accès aux mises à jour.

<p align="center">
  <a href="#why-openquantum">Pourquoi OpenQuantum</a> ·
  <a href="#optimization-cases">Optimisations mesurées</a> ·
  <a href="#what-you-can-do">Fonctionnalités</a> ·
  <a href="#codex">Plugin Codex</a> ·
  <a href="#quick-start">Démarrage rapide</a> ·
  <a href="#use-and-inspect-results">Résultats</a> ·
  <a href="#extend-the-platform">Étendre</a> ·
  <a href="#roadmap-and-rsi">Feuille de route et RSI</a> ·
  <a href="#documentation-and-support">Contribuer</a> ·
  <a href="#license-and-acknowledgments">Open source</a>
</p>

<p align="center">
  <img src="../images/openquantum-desktop-20261013.jpg" width="100%" alt="Environnement de recherche OpenQuantum dans le client d’origine DSH Desktop : marque, nouvelle session, Quantum Learning et invitation à ajouter votre propre modèle" /><br />
  <sub>L’interface d’origine de Desktop, inchangée. Ajoutez votre propre service de modèles dans les paramètres pour ouvrir une nouvelle session.</sub>
</p>

<details>
<summary><strong>Voir les paramètres Tools, MCP et Skills classés par catégorie</strong></summary>

Dépliez le groupe qui vous intéresse, puis affinez avec la recherche ou le filtre d’état d’activation. Tools liste les actions appelables, MCP gère les connexions aux services et Skills sélectionne les méthodes et guides de travail.

![Connexions MCP regroupées par usage, avec recherche et filtres d’état, dans Desktop](../images/openquantum-settings-categories-20261013.jpg)

La capture a été réalisée le 2026-10-13 lors de la vérification des catégories dans le client d’origine ; voir les [notes sur les images](../images/README.md). Un paramètre activé ne signifie pas que le service est en ligne.

</details>

<a id="why-openquantum"></a>

## Pourquoi OpenQuantum

### Une large couverture laisse de l’espace aux idées de recherche

Des algorithmes quantiques et de la simulation de circuits à la chimie quantique, aux calculs à N corps et à la correction d’erreurs, OpenQuantum s’étend continuellement à de nouveaux domaines spécialisés et relie les outils aux méthodes. Les chercheurs consacrent moins de temps à préparer leurs outils et davantage à explorer leurs questions. Des projets communautaires comme Qiskit, PennyLane, QuTiP, PyZX, TeNPy et Stim / PyMatching apportent l’expertise qui sous-tend ces domaines.

### Des calculs plus rapides pour tester davantage d’idées

Nous optimisons en continu les étapes de calcul clés pour réduire l’attente et laisser place à davantage de comparaisons. Dans des cas d’optimisation ciblée, les appels complets d’un [commutateur de Pauli avec PennyLane](#pennylane-rust-case) et d’une [fonction de Wigner avec QuTiP](#qutip-rust-case) sont devenus respectivement **5,09×** et **5,69×** plus rapides. Les deux résultats ont été vérifiés par rapport à la bibliothèque d’origine et à des calculs de référence indépendants.

### Une collaboration ouverte qui fait grandir les capacités de recherche

Nous intégrons continuellement des projets open source et des méthodes publiées de valeur, et les améliorons par l’adaptation, l’optimisation et l’usage réel. OpenQuantum construit autour de ce travail des flux de travail pour agents, des interfaces de calcul et des traces de vérification, afin que les nouveaux outils, méthodes et retours d’expérience fassent grandir la plateforme. Chacun est invité à [participer](#documentation-and-support) pour transformer l’expertise de la communauté en une IA pour la recherche quantique que les chercheurs peuvent utiliser, vérifier et à laquelle ils peuvent se fier.

### Partir de votre travail

| Votre travail | La difficulté | Ce qu’apporte OpenQuantum |
| --- | --- | --- |
| **Recherche et travail algorithmique** | Tester une idée nouvelle impose souvent de réimplémenter des méthodes, de trouver des références et de revérifier sans cesse les résultats. | Partez d’exemples d’algorithmes et de SDK spécialisés, modifiez les entrées, construisez des comparaisons, utilisez les vérifications indépendantes disponibles et conservez des programmes et résultats réutilisables. Voir les [résultats](#use-and-inspect-results). |
| **Développement d’applications et d’agents** | Vous voulez intégrer le calcul quantique dans une application existante, mais il vous manque des méthodes spécialisées et un chemin d’appel utilisable. | Connectez les Skills, Tools et SDK natifs existants pour que votre application exploite des logiciels spécialisés tout en gardant sa propre interface et son propre flux de travail. Voir [étendre la plateforme](#extend-the-platform). |
| **R&D industrielle et évaluation technologique** | Vous avez une piste d’application et avez besoin d’éléments pour choisir des méthodes, estimer des ressources et planifier une feuille de route. | Réalisez des premières comparaisons sur les tâches prises en charge et examinez les conditions des méthodes, les hypothèses sur les ressources et l’origine des résultats. Voir [références et sélection](#reference-material-and-selection). |
| **Enseignement et conception de cours** | Transformer des concepts abstraits en cours pratiques est difficile quand supports, expériences et diapositives sont dispersés. | Concevez des expériences à partir d’exemples ouverts et organisez supports et contenus de cours avec Quantum Learning. Voir [Quantum Learning](#quantum-learning) pour les fonctionnalités et l’avancement des cours. |
| **Apprendre en pratiquant** | Vous comprenez les concepts, mais pas encore comment exécuter un algorithme, modifier les entrées et interpréter les résultats. | Exécutez des exemples, modifiez les paramètres et appuyez-vous sur les guides et les résultats de référence disponibles pour comprendre pourquoi une méthode s’applique et où elle s’arrête. Voir les [exemples d’algorithmes](#algorithm-learning-and-method-comparison). |
| **Logiciels et écosystèmes de recherche** | Vous avez une méthode publiée, du code de recherche ou un SDK, et il vous faut des flux de travail, des interfaces et des exemples pour que d’autres puissent l’utiliser. | Décrivez la méthode dans un Skill, connectez les actions exécutables comme Tools ou intégrez une application complète, en conservant les sources et la reconnaissance des auteurs. Voir [étendre la plateforme](#extend-the-platform). |

### Open source : la maîtrise reste entre vos mains

Vous pouvez lire le code de la plateforme et des intégrations, voir d’où vient chaque méthode, et modifier, déployer et maintenir votre propre combinaison selon les licences applicables. Services de modèles et backends de calcul sont choisis séparément, et vous décidez de partager ou non vos données de recherche. Auteurs, licences et reconnaissance des contributions restent visibles, afin que les travaux existants se prolongent avec le projet.

### Complet : davantage de méthodes pour une même question

OpenQuantum réunit logiciels et méthodes de recherche pour les algorithmes, la compilation, la simulation, l’information quantique, la chimie et la physique à N corps, l’optimisation, la correction d’erreurs, la dynamique, le contrôle et les réseaux. Des guides et exemples ouverts aux SDK natifs et Tools de calcul, vous pouvez choisir ce dont une tâche a besoin ou combiner des outils pour de nouvelles comparaisons. Entrées, préparation et périmètre pris en charge figurent dans le [catalogue des fonctionnalités](#what-you-can-do).

Par exemple, optimisez un circuit avec PyZX, vérifiez son équivalence avec QCEC et étudiez son comportement bruité avec un simulateur de bruit pour savoir si un circuit plus simple est aussi plus performant. Combiner des outils impose toujours d’aligner modèles, unités, ordre des bits et budgets ; voir le périmètre actuel dans le [guide de calcul](../integrations/SCALABLE_BRIDGES.md).

<a id="give-ai-access-to-specialist-research-capabilities"></a>

### Donner à l’IA accès à des capacités de recherche spécialisées

Les agents savent lire des documents, écrire des programmes et appeler des outils. Une fois OpenQuantum installé, vous préparez les dépendances et les paramètres de service nécessaires à une tâche prise en charge, et l’IA peut utiliser des méthodes quantiques et des capacités de calcul. Les Skills décrivent méthodes et étapes, les Tools exécutent des actions précises, et les SDK natifs restent utilisables via les outils de code de l’hôte.

Programmes, résultats et vérifications applicables sont enregistrés, de sorte que les travaux suivants disposent d’une base. Les résultats négatifs bien étayés méritent aussi d’être conservés : ils montrent quand une méthode s’applique et quand il faut emprunter une autre voie. Les échecs de programme et les résultats scientifiques sont des issues distinctes ; les traces servent à la [relecture et à la réutilisation](#execution-records-and-scientific-acceptance), tandis que le jugement scientifique revient à l’utilisateur.

**Transformer les bibliothèques open source et les méthodes publiées en fonctionnalités utilisables par les agents est le travail continu qui sous-tend la plateforme.** Nous organisons les méthodes, écrivons les flux de travail, connectons les logiciels et conservons sources et conditions d’utilisation. Vous pouvez apporter vos propres méthodes, programmes ou applications complètes, de sorte qu’un développement devienne le point de départ de nombreuses personnes.

Ce travail accumulé prépare aussi le terrain pour [améliorer la prochaine génération de capacités de recherche](#research-that-improves-how-research-is-done), décrite dans la feuille de route à long terme.

**[Lancer une première tâche](#quick-start)** · [Apporter vos méthodes](#extend-the-platform)

<a id="optimization-cases"></a>
<a id="pennylane-rust-case"></a>

## Cas mesuré : un calcul PennyLane 5,09× plus rapide

**Fixer une tâche de recherche, recevoir un résultat exécutable et vérifiable.** Nous avons confié une tâche à OpenQuantum : optimiser de façon ciblée un calcul de recherche PennyLane, mesurer le gain de vitesse réel et vérifier les résultats. Le 2026-10-20, l’expérience a été menée à bien dans Codex avec OpenQuantum 0.8.4, produisant un programme optimisé, une comparaison de performances, des vérifications d’exactitude et des traces de reproduction.

| Calcul | Appel complet |
| --- | ---: |
| PennyLane natif | 30,62 ms |
| Après optimisation par OpenQuantum | **6,02 ms** |

**Un appel complet 5,09× plus rapide.** La tâche mesurée est un calcul de commutateur de Pauli dans un modèle local à 32 qubits. Les durées sont les médianes de neuf séries à chaud sur un Apple M4 avec PennyLane 0.45.1. Elles incluent la conversion des entrées et des sorties, et excluent la préparation de l’environnement et la compilation.

**Les résultats ont aussi été vérifiés.** Les sorties des neuf entrées du banc d’essai coïncident exactement, terme à terme, avec les sorties de référence de PennyLane. Des matrices exhaustives indépendantes ont vérifié **4 368 paires de chaînes de Pauli** et 40 sommes d’opérateurs aléatoires à coefficients complexes, avec une erreur absolue maximale sur les matrices de **1,42 · 10⁻¹⁴**. Calculs et mesures de temps ont été relus de façon indépendante, et les **405 échantillons de temps bruts** ainsi que l’ensemble des entrées et sorties sont conservés.

Le facteur 5,09× est le gain mesuré pour ce calcul. Le rapport du cas présente l’ensemble des résultats, des méthodes et du périmètre pris en charge.

[Cas complet et étapes de reproduction](../../experiments/pennylane-rust-commutator/README.md) · [Temps bruts](../../experiments/pennylane-rust-commutator/results/raw-timings.csv) · [Vérifications des résultats](../../experiments/pennylane-rust-commutator/results/validation.json) · [Relecture indépendante](../../experiments/pennylane-rust-commutator/results/review.md)

<a id="qutip-rust-case"></a>

## Cas mesuré : un calcul QuTiP 5,69× plus rapide

**Transformer une méthode spécialisée en un calcul plus rapide et vérifiable.** Dans Codex avec OpenQuantum 0.8.4, nous avons optimisé de façon ciblée le calcul de la fonction de Wigner de QuTiP et produit un programme exécutable, la sortie complète dans l’espace des phases, une comparaison de performances et des vérifications indépendantes.

| Calcul | Appel complet |
| --- | ---: |
| Méthode QuTiP par défaut | 171,77 ms |
| Après optimisation par OpenQuantum | **30,18 ms** |

**Un appel complet 5,69× plus rapide.** La tâche calcule la fonction de Wigner d’une matrice densité dans un **espace de Fock monomode de dimension 64 sur une grille d’espace des phases de 201×201**. Les durées sont les médianes de neuf séries à chaud entrelacées sur un Apple M4 avec QuTiP 5.3.1 et un réglage monothread. Elles incluent la lecture, la conversion et la validation des entrées ainsi que la sortie complète en double précision ; la préparation de l’environnement, la compilation et les vérifications des résultats sont hors de la zone chronométrée.

**Les 272 vérifications des résultats sont toutes passées.** Sur quatre tailles, l’écart absolu maximal par rapport à la sortie QuTiP par défaut est de **6,52 · 10⁻¹⁶**, et de **6,33 · 10⁻¹⁵** par rapport à des sommes indépendantes de polynômes de Laguerre et à des formules analytiques. Les vérifications couvrent des matrices densité complexes aléatoires, l’état du vide et des états de Fock, des superpositions avec cohérences complexes et des entrées rejetées. Les **144 échantillons de temps bruts** ainsi que l’ensemble des entrées et sorties sont conservés et ont été relus de façon indépendante.

[Cas complet et étapes de reproduction](../../experiments/qutip-rust-wigner/README.md) · [Temps bruts](../../experiments/qutip-rust-wigner/results/raw-timings.csv) · [Vérifications des résultats](../../experiments/qutip-rust-wigner/results/validation.json) · [Relecture indépendante](../../experiments/qutip-rust-wigner/results/review.md)

<a id="what-you-can-do"></a>

## Ce que vous pouvez faire

Choisissez un domaine et indiquez à l’environnement de recherche votre question, vos entrées et les résultats que vous souhaitez voir vérifiés. L’agent OpenQuantum suit la méthode du Skill concerné et appelle le Tool correspondant pour calculer ; Quantum Learning offre une interface pédagogique distincte.

[Algorithmes](#algorithm-learning-and-method-comparison) · [Circuits et information quantique](#circuits-and-quantum-information) · [États fondamentaux, chimie et optimisation](#ground-states-chemistry-and-optimization) · [Atténuation et correction d’erreurs](#error-mitigation-and-error-correction) · [Simulation hamiltonienne et systèmes ouverts](#hamiltonian-simulation-and-open-systems) · [Expériences et matériel](#experiment-simulation-and-hardware) · [Photonique et réseaux](#photonics-and-quantum-networks) · [Références](#reference-material-and-selection) · [Quantum Learning](#quantum-learning)

Les calculs locaux peuvent commencer sans compte de cloud quantique. Le matériel réel et les services payants se configurent à la demande ; le domaine d’entrée, la préparation et l’état de vérification de chaque méthode sont consignés dans le catalogue détaillé.

Les sources actuelles offrent un accès complet aux API natives de **115 environnements SDK ou sources**, dont 26 issus de la dernière [extension de l’écosystème](../integrations/SDK_ECOSYSTEM_2026-10-14.md) livrée avec 0.8.4. Les agents peuvent écrire leurs propres programmes, combiner les API publiques et conserver les résultats complets, au-delà des cas prédéfinis des Tools de commodité.

SlowQuant ajoute la réponse linéaire moléculaire et les propriétés de transition via un SDK source figé. [Installation et limites de validation](../integrations/SLOWQUANT.md) ; qLR moléculaire avec Qiskit et matériel restent non validés.

**Mathématiques et physique formelles :** [Lean 4, mathlib et physlib](../../.agents/skills/lean-physics/SKILL.md) permettent de vérifier des preuves et leurs axiomes dans un projet fixé à Lean 4.35.0. La préparation explicite construit le petit exemple de Pauli et ses imports ; les autres modules sont préparés selon le besoin. La vérification n’installe aucune dépendance. Une preuve porte sur les définitions et hypothèses énoncées, pas sur la validité physique du modèle ni sur son acceptation scientifique.

**Diagnostic des DEM :** [emlint](../../.agents/skills/emlint-dem-audit/SKILL.md) analyse les modèles d’erreurs de détecteurs Stim dans un environnement SDK préparé explicitement. Les rapports conservent les contre-exemples, les vérifications ignorées et les résultats indéterminés ou vacants. Ces vérifications structurelles ne prouvent ni la distance du code, ni la correction du décodage, ni la validité scientifique.

Chaque environnement se prépare explicitement pour chaque tâche, et les limites de plateforme, de compte, de licence et de backend optionnel restent applicables. Les vérifications d’ingénierie de chaque bibliothèque figurent dans le [registre d’accès complet aux SDK](../integrations/FULL_SDK_ACCESS.md) ; ces environnements n’ont pas encore fait l’objet d’une acceptation scientifique (le constat, fondé sur des vérifications indépendantes et une traçabilité complète des sources, qu’un résultat est scientifiquement fiable) sur de véritables tâches de recherche, et leur statut scientifique reste `not_evaluated`.

Les SDK d’entreprises et d’instituts intégrés dans v0.6.0 couvrent les circuits différentiables, l’estimation de ressources tolérantes aux fautes, la photonique, la compilation d’impulsions et les réseaux quantiques. Les trois lots sont [17 SDK de fournisseurs](../integrations/VENDOR_SDKS.md), [20 fonctionnalités d’entreprises et d’instituts](../integrations/SDK_EXPANSION.md) et [15 interfaces réseau, contrôle et cloud](../integrations/SDK_GAPS.md), auxquels s’ajoute [QuEra Bloqade Analog](../integrations/BLOQADE_ANALOG.md). Chaque adaptateur n’expose que ses actions documentées ; les utilisateurs configurent comptes, identifiants, autorisations de service et licences applicables.

<a id="algorithm-learning-and-method-comparison"></a>

### Apprentissage des algorithmes et comparaison de méthodes

Partez d’exemples d’algorithmes exécutables, modifiez les entrées et vérifiez les résultats numériques, puis transposez la méthode à votre propre problème. Les **66 guides quantum-skills** d’UnitaryLab sont adaptés en Skills natifs : **49 fournissent des exemples exécutables** couvrant l’ensemble des **39 modules** de la bibliothèque d’algorithmes d’origine ainsi que des méthodes propres aux guides ; les autres servent à la classification des algorithmes, au choix du backend et à la migration.

| Domaine | Méthodes et exemples exécutables |
| --- | --- |
| Fondements et recherche | QFT, QPE, test de Hadamard, amplification et estimation d’amplitude, Grover, Shor, Simon, logarithme discret et marches sur graphes |
| Systèmes linéaires et méthodes matricielles | HHL, VQLS, résolution linéaire par QSVT, résolution adiabatique, LCU et QSP, avec des références classiques de calcul de valeurs propres |
| Simulation hamiltonienne | Trotter–Suzuki, qDrift, QSP, LCU de Taylor et un exemple de Cartan avec substitutions signalées |
| Calcul variationnel et apprentissage automatique | VQE, VQD, QAOA, VQC, QCBM, CVQNN, gradients et information de Fisher quantique |
| Préparation d’états et N corps | Préparation d’états de Möttönen, MPS, par isométrie et variationnelle ; DMRG moléculaire, VQE de Fermi–Hubbard et évolution d’Ising |
| Construction de codes et équations différentielles | Construction de codes qLDPC et syndromes ; exemples de schrödingérisation pour les équations de la chaleur 1D et 2D et l’advection périodique |

Les exemples utilisent des backends ouverts comme Qiskit, PennyLane, quimb, PySCF et NumPy/SciPy. Exécutez-les directement ou laissez l’agent les appeler via les outils de code existants. Les paramètres par défaut sont des cas pédagogiques ; vérifiez les entrées réelles, les erreurs par rapport à la référence et la convergence pour chaque tâche.

L’adaptation conserve les sources et licences d’origine et ne dépend pas du runtime propriétaire d’UnitaryLab. La couverture des flux de travail ne signifie pas une compatibilité complète avec l’API Python, les optimiseurs ou les backends d’origine ; les différences concernant Cartan, CVQNN, DMRG et d’autres figurent dans la [table de couverture par méthode](../integrations/UNITARYLAB_OPEN_COVERAGE.md) et le [guide des exemples](../../examples/quantum-algorithms/README.md).

[Exécuter un exemple d’algorithme](#run-an-algorithm-example-directly) · [Choisir entre des méthodes voisines](../integrations/CAPABILITY_SELECTION.md)

<a id="circuits-and-quantum-information"></a>

### Circuits et information quantique

| Domaine | Tâches possibles | Résultats à examiner |
| --- | --- | --- |
| Circuits quantiques | Analyser ou convertir des circuits OpenQASM / QPY, comparer des transpilations, vérifier l’équivalence, simuler des circuits | Structure du circuit, sortie transpilée, résultat d’équivalence, vecteur d’état ou distribution d’échantillons |
| Compilation et simulation locales | Compiler ou placer des circuits avec TKET, QSteed ou MQT QMAP ; simuler localement avec Braket LocalSimulator, QCompute, Qibo et d’autres | Jeux de portes et placement, vecteurs d’état ou probabilités, selon la convention d’ordre des bits de chaque SDK |
| Programmes différentiables et hybrides | Valeurs moyennes et gradients avec PennyLane, DeepQuantum, TensorCircuit, MindQuantum ou VQNet ; mesure, réinitialisation et rétroaction classique avec Guppy / Selene | Gradients des paramètres, probabilités et résultats des programmes |
| Ressources tolérantes aux fautes | Estimations de ressources physiques avec Microsoft QDK, ressources en portes pour un Bloq donné avec Qualtran | Qubits, durée d’exécution ou nombre de portes, avec les hypothèses matérielles et de décomposition |
| Interopérabilité Qiskit / Cirq | Convertir des circuits unitaires pris en charge par un chemin OpenQASM 2 fixe avec qBraid | Circuit converti avec numérotation des qubits et qubits inactifs préservés ; comparaison optionnelle de l’unitaire complet |
| Optimisation de circuits et calcul fondé sur les mesures | Réécriture et extraction ZX avec PyZX ; conversion et simulation de motifs MBQC avec Graphix | Circuits et nombre de portes avant et après, graphes de ressources et motifs de mesure ; comparaison indépendante optionnelle |
| Optimisation et découpe de circuits | Optimiser des séquences de portes avec Compact ; découper des circuits et reconstruire des valeurs moyennes avec QCut | Circuits avant et après avec vérification indépendante de l’équivalence ; surcoût de découpe, échantillons effectifs et référence optionnelle sans découpe |
| Échantillonnage bruité Clifford+T | Étudier l’interférence des portes T et le bruit avec Clifft, ou échantillonner des circuits au format Stim pris en charge | Comptages des chaînes de bits finales et référence optionnelle par matrice densité ; mesures en cours de circuit et parités brutes des détecteurs / observables |
| États et mesures | Auditer matrices densité et mesures d’intrication ; simuler localement des mesures randomisées sur des états produits / GHZ connus | Mesures d’état avec vérifications indépendantes ; estimations de pureté de sous-systèmes avec erreur d’échantillonnage fini |

<a id="ground-states-chemistry-and-optimization"></a>

### États fondamentaux, chimie et optimisation

| Domaine | Tâches possibles | Résultats à examiner |
| --- | --- | --- |
| Résolution et validation d’états fondamentaux | Exécuter un VQE sur un Hamiltonien de Pauli réel à deux qubits dans un secteur de particules fixé, et le vérifier par rapport à une référence exacte | Énergie, trace de convergence, vérifications indépendantes et, dans le flux complet, un rapport d’acceptation scientifique |
| Chimie quantique et états fondamentaux à N corps | Étudier des molécules et des espaces actifs avec SQD, ou les états fondamentaux de chaînes de spins XYZ avec TeNPy | Énergie SQD et occupation des orbitales ; énergie DMRG, aimantation, entropie d’intrication et convergence ; référence exacte optionnelle |
| Apprentissage de paramètres variationnels | Entraîner Flow-VQE sur un Hamiltonien de Pauli pour apprendre des paramètres de circuit de basse énergie | Apprentissage par flot comparé à une recherche aléatoire à budget d’évaluations égal |
| États excités et classification à noyau | Rechercher plusieurs états de basse énergie avec le VQD d’OpenQARP, ou entraîner un QSVM avec un noyau angulaire de cqlib | Énergies, résidus, orthogonalité et spectre exact optionnel ; classification sur données réservées, noyau analytique et référence classique |
| Symétries et algèbre de contrôle | Réduire le nombre de qubits dans un secteur de symétrie choisi avec Symmer ; analyser des générateurs de Pauli avec PauLie | Hamiltonien réduit, classification et dimension de l’algèbre de Lie ; comparaison optionnelle du spectre ou de la clôture |
| Optimisation combinatoire | Construire et résoudre des problèmes d’optimisation locaux avec QPanda, Ocean ou Kaiwu ; évaluer des paramètres QAOA donnés avec Qcover | Solution, vérification des contraintes, énergies et corrélations, avec comparaison classique lorsque l’interface la fournit |
| Opérateurs de chimie et données existantes | Transformer des opérateurs fermioniques avec OpenFermion / pyChemiQ ; interroger à la demande des enregistrements QCArchive existants de calculs en un point via QCPortal | Termes de Pauli ; molécule, énergie, méthode et source, avec unités et champs manquants conservés |

<a id="error-mitigation-and-error-correction"></a>

### Atténuation et correction d’erreurs

| Domaine | Tâches possibles | Résultats à examiner |
| --- | --- | --- |
| Atténuation des erreurs | Exécuter ZNE, REM, PEC ou CDR avec Mitiq et comparer résultats bruts et atténués à budget d’échantillonnage égal | Référence idéale, biais empirique, variance et RMSE, ainsi que coûts de calibration, d’entraînement et d’échantillonnage |
| Correction d’erreurs quantiques | Mener des expériences de mémoire sur le code de surface avec Stim / PyMatching, construire des patchs rectangulaires avec Deltakit, ou décoder avec BP+LSD | Circuits bruités effectifs, taux d’erreur logique et intervalles à nombre de tirs fixé ; vérification de cohérence des syndromes pour LSD |

<a id="hamiltonian-simulation-and-open-systems"></a>

### Simulation hamiltonienne et systèmes ouverts

| Domaine | Tâches possibles | Résultats à examiner |
| --- | --- | --- |
| Simulation hamiltonienne | Construire des circuits d’évolution ou des états finaux pour un Hamiltonien de Pauli réel avec Trotter–Suzuki ou qDrift | Circuits, métriques de ressources, vecteurs d’état et référence matricielle indépendante optionnelle ; nombre de pas, ordre, durée et graine configurables |
| Dynamique des systèmes ouverts | Chaînes d’Ising ouvertes avec TJM, balayages de pilotage et gradients d’un qubit avec Dynamiqs, mémoire environnementale avec OQuPy | Trajectoires d’observables, références indépendantes, gradients, pas de temps et coupures de mémoire |

<a id="experiment-simulation-and-hardware"></a>

### Simulation d’expériences et matériel

| Domaine | Tâches possibles | Résultats à examiner |
| --- | --- | --- |
| Expériences supraconductrices et atomiques | Simuler des procédures de calibration, les contraintes des portes natives et les fuites des transmons ; étudier les réseaux d’atomes et impulsions pris en charge avec Bloqade Analog / Pulser | Données synthétiques, trajectoires dynamiques, populations par atome et probabilités finales |
| Programmes d’impulsions et contrôle | Construire, ordonnancer et compiler des programmes hors ligne avec QUA, LabOne Q, Qblox Scheduler, Qililab ou OQC QAT | Programmes, chronologie, instructions cibles ou formes d’onde ; ces adaptateurs ne pilotent pas d’appareils de laboratoire |
| Accès au matériel quantique | Découvrir des backends et vérifier topologie et identifiants ; activer à la demande la consultation, la soumission et l’annulation de tâches dans le cloud | Dispositifs candidats et conditions d’utilisation ; résultats et état issus des interfaces de tâches activées |
| Interface de dispositif local | Interroger un pilote C configuré via QDMI | Dispositifs, qubits, portes et couplages signalés par le pilote ; le pilote d’exemple officiel valide l’interface et n’est pas une QPU en ligne |

<a id="photonics-and-quantum-networks"></a>

### Photonique et réseaux quantiques

| Domaine | Tâches possibles | Résultats à examiner |
| --- | --- | --- |
| Circuits photoniques et apprentissage | Calculer les sorties d’optique linéaire avec Perceval et Lightworks ; inférence par lots et gradients des déphaseurs avec MerLin ; modèles gaussiens MrMustard optionnels | Probabilités de Fock, gradients ou moments optiques, avec ordre des modes et coupures explicites |
| Modélisation et programmes réseau | Simuler pertes et décohérence d’un lien unique avec SimQN ; générer des programmes à deux nœuds avec NetQASM | Statistiques de lien et programmes compilés ; la simulation SquidASM nécessite un environnement NetSquid sous licence séparée |

<a id="reference-material-and-selection"></a>

### Références et sélection

| Domaine | Tâches possibles | Résultats à examiner |
| --- | --- | --- |
| Références d’algorithmes et choix des outils | Rechercher dans les 66 guides d’algorithmes Quantum-Practices, comparer des SDK quantiques et réutiliser des étapes de recherche | Références figées, hypothèses et conseils de sélection |
| Bancs d’essai publics de dispositifs | Interroger 410 enregistrements historiques figés de Metriq par fournisseur, dispositif ou type de banc d’essai | Paramètres d’origine, métriques, dates, sources et licences, avec mention conservée des simulateurs |

### Quantum Learning

Supports, contenus de cours et classes réunis en un seul lieu : les apprenants pratiquent, et les enseignants organisent leurs propres contenus pédagogiques.

| Apprentissage et enseignement | Fonctionnalités disponibles |
| --- | --- |
| Préparer les supports | Page d’accueil, bibliothèque de cours, pièces jointes, import de cours et import PPTX |
| Construire des cours | Aperçu des cours, éditeur de contenus et environnement Pro |
| Apprendre en classe | Diapositives, quiz, questions-réponses interactives et apprentissage par projet |
| Poursuivre l’apprentissage | Cours, tâches et supports locaux, historique d’apprentissage côté serveur, avec migration depuis les classes précédentes |

L’objectif est de couvrir des bases du secondaire jusqu’à la recherche de pointe, en niveaux débutant, intermédiaire et avancé, avec la possibilité d’apprendre d’un niveau à l’autre. Les ressources publiques sont encore en cours d’organisation, et le cursus complet n’est pas encore produit ni publié. L’assemblage de l’application, le démarrage et la persistance locale sont vérifiés ; la construction de cours, les questions-réponses et l’édition avec une IA réelle en ligne attendent encore une acceptation complète.

Les tâches pédagogiques Pro utilisent les outils et l’historique propres à l’application d’origine et ne sont pas encore reliées aux outils quantiques de l’environnement de recherche. Les médias, la voix et la recherche optionnels nécessitent leurs propres services. Installation, sauvegarde, migration et vérification sont décrites dans le [guide d’intégration de Quantum Learning](../integrations/OPENMAIC.md).

<p align="center">
  <img src="../images/openquantum-learning-20260912.jpg" width="100%" alt="Quantum Learning : supports de cours, classes et édition des contenus" />
</p>

[Installer Quantum Learning et ouvrir une classe](#set-up-quantum-learning).

### Desktop, messageries et langues

**Desktop.** L’application de bureau OpenQuantum offre une fenêtre native, une icône dans la barre système, un terminal et des notifications, et réutilise les modèles, Skills quantiques, outils de calcul et traces d’exécution de l’environnement de recherche. Elle s’appuie sur le client tiers d’origine DSH Desktop et sur un paquet de fonctionnalités OpenQuantum livré séparément, sur Mac (Apple Silicon / Intel), Windows et depuis les sources. [Installer Desktop](#desktop-installer) · [Compiler Desktop depuis les sources](#desktop-from-source).

**Messageries.** Avec CC Connect, vous pouvez lancer des tâches depuis WeChat, Feishu, DingTalk, Slack, Telegram, Discord et d’autres canaux, en réutilisant les Skills, Tools et traces d’exécution de l’environnement de recherche. [Configurer les canaux de messagerie](#messaging-channels).

<p align="center">
  <img src="../images/openquantum-wechat-chat.jpg" width="380" alt="Démonstration existante d’une conversation avec OpenQuantum via WeChat ClawBot" /><br />
  <sub>Une tâche et sa réponse dans le canal WeChat.</sub>
</p>

**Langues de l’interface.** Dans **Paramètres → Général → Langue**, choisissez le chinois simplifié, l’anglais, le japonais, le coréen, l’espagnol, le français, l’allemand, le portugais, le russe ou l’arabe. Le choix est conservé, Quantum Learning le suit, et l’arabe s’affiche de droite à gauche.

![Choix de la langue dans l’application OpenQuantum Desktop en cours d’exécution](../images/openquantum-languages-20260919.jpg)

La langue de l’interface ne réécrit pas les conversations existantes, les supports de cours, les Skills de l’utilisateur ni les sorties des outils. Certains dialogues natifs du système reviennent à l’anglais en dehors du chinois et de l’anglais.

<a id="quick-start"></a>

## Démarrage rapide

Choisissez un mode d’accès : installer le plugin dans Codex, utiliser le client Desktop avec son paquet de fonctionnalités, ou exécuter l’environnement de recherche depuis les sources. Desktop et l’environnement de recherche depuis les sources sont destinés à un usage local individuel ; choisissez les sources pour développer ou pour utiliser les fonctionnalités de `main`.

<a id="codex"></a>

### Plugin Codex : installation et utilisation

Une seule installation du plugin OpenQuantum enregistre ensemble **les Skills, les services MCP locaux, les Tools scientifiques et la page de paramètres OpenQuantum**. Vous continuez à poser vos questions, gérer vos projets et lire les résultats dans les conversations natives de Codex ; la page de paramètres configure les fonctionnalités d’OpenQuantum.

**Laissez Codex l’installer pour vous :** ouvrez Codex, démarrez une nouvelle conversation et collez la demande ci-dessous.

```text
Please install the OpenQuantum Codex plugin 0.8.4. First read the installation guide:
https://github.com/xi-zhao/OpenQuantum/blob/codex-v0.8.4/docs/integrations/CODEX_AGENT_INSTALL.md
Download the complete installer and SHA256SUMS from https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4,
verify the checksum, check Codex, Node.js 24+ and npm, and install with the bundled installer.
Keep existing plugins and user settings, and check the Skills, MCP tools and the global "OpenQuantum settings" entry.
Tell me exactly what to do if the app needs reloading. Finally, report what was actually verified and which scientific dependencies still need preparation.
```

Le paquet de fonctionnalités Desktop, le plugin Codex et l’installateur utilisent tous **OpenQuantum 0.8.4**. Ce plugin comprend 168 Skills et 87 Tools scientifiques, ajoute 26 Skills de SDK natifs et unifie les onglets Status, MCP, Skills et Service keys ; les 16 nouveaux Tools de services nécessitant des identifiants sont désactivés par défaut. L’étiquette de version est `codex-v0.8.4` ; les pièces jointes et le périmètre de vérification sont ceux indiqués dans la Release.

**[Télécharger l’installateur complet du plugin Codex 0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.4/openquantum-0.8.4-codex-install.zip)** ([notes de version et SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4)).

L’installateur contient le ZIP du plugin, le script d’installation et le fichier de verrouillage des dépendances ; aucune copie des sources n’est nécessaire. Il requiert Node.js 24+, npm et une version de Codex prenant en charge les plugins et les pages de paramètres globales ; un agent peut vérifier et traiter ces prérequis à l’aide du [guide d’installation](../integrations/CODEX_AGENT_INSTALL.md). L’installation locale est vérifiée sur macOS ; vérifiez la compatibilité sur les autres plateformes et versions de l’hôte.

**Après l’installation :**

1. Rechargez Codex lorsque cela vous est demandé, puis ouvrez une nouvelle conversation pour charger les nouveaux Skills et outils.
2. Posez directement votre question, par exemple : « Utilise OpenQuantum pour trouver des méthodes de correction d’erreurs quantiques et recommande une première expérience. »
3. Ouvrez **« … » → « OpenQuantum settings »** et gérez les fonctionnalités dans les onglets **Status / MCP / Skills / Service keys** ; les interrupteurs des Tools se trouvent sous **Status → Tools**. Les services intégrés sont préconfigurés avec le plugin ; pour ajouter votre propre serveur MCP, saisissez ses informations de connexion et enregistrez les jetons via la boîte de dialogue dédiée aux identifiants.

Le plugin installe le code des fonctionnalités et la page de configuration ; certains calculs nécessitent encore Python, des SDK quantiques ou des comptes tiers préparés à la demande. Voir le [guide du plugin](../integrations/CODEX_PLUGIN.md).

<details>
<summary><strong>Installation manuelle (optionnelle)</strong></summary>

Téléchargez et vérifiez l’installateur complet, extrayez-le et exécutez ce qui suit dans son répertoire (Node.js 24+, npm et une CLI Codex prenant en charge les plugins sont requis) :

```sh
npm ci --ignore-scripts
npm run plugin:install
```

Si l’installateur ne trouve pas la CLI de l’application Codex actuelle, définissez `OPENQUANTUM_CODEX_CLI` avec son chemin. Avec un ZIP de plugin existant, utilisez `npm run plugin:install -- /full/path/plugin.zip`. L’installation, la gestion des échecs et les vérifications pas à pas sont décrites dans le [guide d’installation par agent](../integrations/CODEX_AGENT_INSTALL.md).

</details>

<a id="desktop-installer"></a>

### Programme d’installation de bureau

La version de bureau actuelle associe le [client d’origine DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7) à un paquet de fonctionnalités OpenQuantum distinct. Le client d’origine conserve son nom et sa version ; le paquet de fonctionnalités embarque Node / uv et fournit l’accès complet aux SDK, les Skills quantiques, les Tools et la configuration. L’installateur crée un lanceur avec l’icône OpenQuantum (`OpenQuantum.app` sur Mac, `OpenQuantum.lnk` sur Windows).

Installez d’abord le client d’origine DSH Desktop, puis choisissez le paquet de fonctionnalités adapté à votre plateforme :

| Plateforme | Téléchargement OpenQuantum 0.8.4 | À lancer après extraction |
| --- | --- | --- |
| Mac Apple Silicon | [Paquet darwin-arm64](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-darwin-arm64.tar.gz) | `install.command` |
| Mac Intel | [Paquet darwin-x64](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-darwin-x64.tar.gz) | `install.command` |
| Windows x64 | [Paquet win32-x64](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-win32-x64.tar.gz) | `install.cmd` |

Vérifiez le téléchargement à l’aide des [SHA256SUMS de la Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) avant l’extraction. Les mises à niveau conservent les paramètres existants ; voir le [guide d’installation et de migration](../DESKTOP_INSTALLERS.md). Le paquet de fonctionnalités et le plugin Codex sont tous deux en `0.8.4`, et Harness reste en `0.1.5-rc.1`. Environnements de calcul, comptes et licences se préparent toujours fonctionnalité par fonctionnalité.

### Installer depuis les sources

Préparez Git et Node.js 24 ; les outils quantiques Python nécessitent aussi [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/). Les autres dépendances varient selon la fonctionnalité, par exemple Julia 1.12.7 pour RandomMeas.

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
```

Sans clé de modèle, vous pouvez déjà exécuter l’[exemple local fixe](#no-model-key-needed-recompute-a-fixed-case). Pour lancer des tâches via l’agent, choisissez un mode de lancement de l’environnement de recherche et configurez un modèle.

### Choisir le mode de lancement de l’environnement de recherche

Web et Desktop lancés depuis la même copie des sources partagent les mêmes paramètres de modèles, fonctionnalités quantiques et traces d’exécution dans `.openquantum/dsh`. Quittez l’environnement en cours d’exécution avant d’en changer.

**Environnement de recherche Web**

```bash
npm run dev
```

Ouvrez l’adresse avec le jeton de connexion affiché par le lanceur ; après authentification, l’environnement de recherche est accessible à <http://127.0.0.1:3000>.

<a id="desktop"></a>
<a id="desktop-from-source"></a>

<details>
<summary><strong>Compiler et lancer Desktop depuis les sources</strong></summary>

Après avoir installé les dépendances des sources et préparé Corepack ainsi que les outils de compilation C++ du système :

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop -- --source
```

`desktop:setup` compile les sources amont figées, télécharge Electron et compile les modules natifs sans modifier les interfaces ni les ressources tierces. Utilisez la commande de lancement du dépôt pour que les paramètres de modèles et de fonctionnalités quantiques soient chargés. Les prérequis de plateforme figurent dans le [guide de déploiement](../DEPLOYMENT.md).

</details>

<a id="configure-a-model"></a>

### Configurer un modèle

Une nouvelle installation de Desktop a une liste de modèles vide. Dans **Paramètres → Modèles**, ajoutez un fournisseur avec un point d’accès OpenAI-compatible Chat Completions, un nom de modèle et une clé API, et conservez OpenQuantum comme Agent Preset par défaut. **Le modèle doit prendre en charge Tool Calling pour appeler les outils de calcul quantique.** Cela ne configure que le service de modèles ; les identifiants de cloud quantique se configurent avec leurs backends.

<details>
<summary><strong>Configuration avancée des modèles et diagnostics en ligne de commande</strong></summary>

Les sources contiennent des exemples de débogage optionnels `openquantum-public` / `openquantum-private` dont les adresses sont des espaces réservés `.invalid`. Ils ne sont pas préremplis dans la liste de modèles d’une nouvelle installation de Desktop et ne nécessitent de vraies adresses et identifiants que pour les diagnostics ci-dessous.

Les surcharges de routes enregistrées dans l’interface sont écrites dans `$DSH_HOME/settings.yaml`, ignoré par Git ; les clés restent dans l’environnement local ou le magasin d’identifiants de Harness, et la configuration du projet ne contient que des références aux identifiants. Pour utiliser `.env`, exécutez `cp .env.example .env` sur macOS ou `Copy-Item .env.example .env` dans Windows PowerShell, puis complétez-le selon les commentaires. `.env` ne remplace pas les noms de modèles ; configurez les autres noms de modèles sous **Paramètres → Modèles**.

La commande ci-dessous vérifie la route publique définie dans `.env` ou dans les variables d’environnement avec les noms de modèles fixes du script, `kimi-k2.7-code` et `glm5.2`, en testant la génération de texte et Tool Calling. Elle ne lit pas les surcharges de routes enregistrées dans l’interface ; vérifiez les autres modèles avec la tâche de l’environnement de recherche présentée plus loin.

```bash
npm run models:probe -- --provider openquantum-public
```

</details>

### Préparer les environnements de calcul selon la tâche

Les outils de calcul Python locaux utilisent des dépendances figées, préparées explicitement. Après `npm ci`, exécutez depuis la racine du dépôt la commande de préparation de la fonctionnalité dont vous avez besoin. La préparation peut télécharger et compiler ; les appels de calcul n’installent plus de dépendances automatiquement.

| À préparer | Commande ou emplacement |
| --- | --- |
| La première expérience d’état de Bell | `node scripts/setup-paper-tools.mjs fatqat-workbench` |
| Interaction statique d’une paire d’atomes de Rb | `npm run capability:pairinteraction:setup` ; [gouvernance des modèles et des versions](../integrations/PAIRINTERACTION.md) |
| Simulation hamiltonienne Trotter / qDrift | `npm run capability:hamiltonian:setup` |
| Échantillonnage Clifft et conversion de circuits qBraid | `npm run capability:interop:setup` |
| Toute autre fonctionnalité Python | `node scripts/setup-paper-tools.mjs <capability-id>`, par exemple `qec-memory-experiment` ; chaque Skill indique sa propre commande |
| Exemples d’algorithmes | Partir de l’[environnement minimal](#run-an-algorithm-example-directly) et ajouter les groupes gradients, PennyLane, tenseurs ou chimie selon les besoins |

Préparation de l’environnement, activation des connexions et configuration du modèle sont des étapes indépendantes. Même une connexion activée par défaut nécessite que ses dépendances soient préparées avant la première utilisation ; si un environnement manque ou si son fichier de verrouillage a changé, le Tool renvoie la commande de préparation exacte. Julia, les pilotes QDMI et les services MCP amont suivent leurs propres guides ; voir les [environnements locaux](../integrations/LOCAL_ENVIRONMENTS.md).

### Lancer une première tâche

<a id="no-model-key-needed-recompute-a-fixed-case"></a>

#### Sans clé de modèle : recalculer un cas fixe

Avec en entrée le [Hamiltonien de Pauli à deux qubits](../../.agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json) fixé dans le dépôt, le Tool natif `solve_and_validate_ground_state` exécute un VQE sans bruit dans le secteur de particules spécifié et vérifie le résultat par un calcul indépendant en forme close. Après `git clone` et `npm ci`, exécutez ceci dans le dépôt ; aucune clé de modèle ni aucun identifiant de cloud quantique n’est nécessaire :

```bash
npm run demo:quantum-ground-state
```

<table>
  <tr>
    <td align="center"><strong>−1,85727503 Ha</strong><br /><sub>Énergie VQE</sub></td>
    <td align="center"><strong>−1,85727503 Ha</strong><br /><sub>Référence exacte indépendante</sub></td>
    <td align="center"><strong>4,44 · 10⁻¹⁶ Ha</strong><br /><sub>Écart d’énergie</sub></td>
    <td align="center"><strong>15 réussies</strong><br /><sub>Vérifications du calcul local</sub></td>
  </tr>
</table>

Ces valeurs proviennent d’une **réexécution locale du 2026-09-12** ; la [sortie brute et la trace d’exécution](../examples/quantum-ground-state-local-demo-2026-09-12.json) contiennent les valeurs complètes, l’état des vérifications, l’horodatage, le commit source, l’empreinte des entrées et la version de Node.js.

<details>
<summary><strong>Ce que cette exécution a vérifié, et ce qui manque encore</strong></summary>

Dans cette trace, 15 vérifications du calcul local sont passées et 1 vérification de provenance de session n’a pas été exécutée : il n’existe donc pas de conclusion d’acceptation scientifique complète. L’écart d’énergie montre l’accord avec la référence exacte pour ce cas numérique ; la portée scientifique se limite au Hamiltonien et au secteur de particules donnés.

Une acceptation scientifique complète exige en outre d’exécuter la tâche via Harness, d’enregistrer les fichiers de résultats et la provenance de session, et de produire un rapport d’acceptation relisible. Les étapes de vérification après configuration d’un modèle figurent dans [développement et vérification](#development-and-verification).

</details>

<a id="let-the-agent-run-a-task-prepare-and-sample-a-bell-state"></a>

#### Confier une tâche à l’agent : préparer et échantillonner un état de Bell

Après avoir configuré un modèle et préparé FatQat avec `node scripts/setup-paper-tools.mjs fatqat-workbench`, ouvrez une nouvelle session et envoyez :

> Avec FatQat, pars de l’état à deux qubits tout à zéro, applique H à q0, puis CX avec q0 comme contrôle et q1 comme cible. Renvoie les probabilités exactes sans bruit et compare-les à 1024 échantillons avec seed=7.

L’agent peut appeler l’outil de circuits de FatQat, et l’environnement de recherche conserve l’entrée de l’outil et le résultat renvoyé. Examinez les probabilités exactes et les comptages, puis poursuivez :

> Garde le circuit et la graine, passe le nombre d’échantillons à 8192, et compare l’écart des fréquences des deux exécutions par rapport aux probabilités exactes.

Les probabilités idéales sont de 50 % chacune pour `00` et `11` ; les fréquences sur un échantillon fini fluctuent. La comparaison des deux exécutions met en évidence cette fluctuation ; une seule augmentation du nombre d’échantillons ne garantit pas que chaque fréquence se rapproche de la valeur idéale. Sans modèle prenant en charge Tool Calling, l’agent ne peut pas appeler les Tools de calcul. Les détails de l’interface et la vérification locale figurent dans le [guide FatQat](../integrations/FATQAT.md).

<a id="run-an-algorithm-example-directly"></a>

#### Exécuter directement un exemple d’algorithme

Aucune clé de modèle ni aucun compte de cloud quantique n’est nécessaire. Commencez avec NumPy, SciPy et Qiskit :

```bash
npm run capability:algorithms:setup -- --minimal
```

Sur macOS / Linux, listez les méthodes, lisez le contrat d’entrée et exécutez l’exemple HHL par défaut :

```bash
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --list
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --describe hhl
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm hhl
```

Dans Windows PowerShell :

```powershell
& examples/quantum-algorithms/.venv/Scripts/python.exe examples/quantum-algorithms/run.py --algorithm hhl
```

Pour QSP/QSVT et les méthodes similaires, exécutez `npm run capability:algorithms:setup -- --group pennylane` ; les autres groupes sont `gradients`, `tensor` et `chemistry`, et l’ajout d’un groupe conserve les autres. `npm run capability:algorithms:setup` sans argument prépare l’ensemble. L’environnement complet comprend PySCF, pour lequel WSL est recommandé sous Windows ; la vérification numérique a été réalisée sur CPU macOS.

Passez vos propres paramètres dans un fichier JSON avec `--input` et enregistrez les résultats avec `--output`, ou, après avoir configuré un modèle, laissez l’agent utiliser `quantum-algorithms` ou le Skill d’une méthode précise. Paramètres, ordre des bits, différences entre méthodes et groupes de dépendances sont décrits dans le [guide des exemples d’algorithmes](../../examples/quantum-algorithms/README.md).

<a id="upgrade-an-existing-source-installation"></a>

### Mettre à niveau une installation existante depuis les sources

Mettez à jour les sources et les dépendances du projet en suivant le [guide de mise à jour](../UPDATES.md), puis relancez une fois la commande de préparation de chaque fonctionnalité que vous utilisez. Les ponts Python vérifient et synchronisent les dépendances figées dans leurs répertoires d’environnement existants, sans rien supprimer ; les exemples d’algorithmes peuvent continuer à ajouter des groupes.

Redémarrez l’environnement de recherche et ouvrez une nouvelle session. Les noms et paramètres existants des Skills et Tools restent valides ; les 13 index de catégories peuvent toujours être appelés manuellement, tandis que les tâches automatiques choisissent `quantum-algorithms` ou une méthode précise. Pour rétablir la gamme complète d’outils d’un service optionnel, utilisez le profil par défaut `full` ; voir [sélection des fonctionnalités et compatibilité](../integrations/CAPABILITY_SELECTION.md).

### Fonctionnalités optionnelles

<a id="set-up-quantum-learning"></a>

<details>
<summary><strong>Installer Quantum Learning</strong></summary>

Après avoir installé les dépendances des sources, exécutez dans la même copie :

```bash
npm run learning:ui:setup
```

Démarrez ensuite Web ou Desktop et ouvrez **Quantum Learning** depuis la barre latérale. Le premier lancement démarre une base de données et un service de cours locaux, sans PostgreSQL global ; les requêtes au modèle utilisent le modèle actuellement sélectionné dans OpenQuantum.

L’installation et le démarrage sont vérifiés sur macOS. L’installateur dépend de `/bin/sh` et n’est pas encore adapté à un Windows ordinaire ; Linux n’est pas encore vérifié. Chaque nouveau Git worktree nécessite sa propre installation. Sauvegarde, migration et état des plateformes figurent dans le [guide d’intégration](../integrations/OPENMAIC.md#使用).

</details>

<a id="messaging-channels"></a>

<details>
<summary><strong>Configurer WeChat, Feishu et d’autres canaux de messagerie</strong></summary>

```bash
npm run cc-connect:setup
npm run cc-connect:feishu
npm run cc-connect:start
```

Configurez la première plateforme comme l’indique le projet amont ; exécutez `npm run cc-connect:web` dans un autre terminal pour gérer les autres plateformes et identifiants. Les jetons sont stockés dans une configuration locale ignorée par Git ; voir le [guide des messageries](../integrations/CC_CONNECT.md).

</details>

Les problèmes de déploiement et de démarrage sont traités dans le [guide de déploiement](../DEPLOYMENT.md) et le [guide de dépannage](../TROUBLESHOOTING.md).

<a id="use-and-inspect-results"></a>

## Utiliser et examiner les résultats

Une fois une tâche exécutée, vous pouvez choisir d’autres backends, modifier la taille du problème et prolonger les résultats dans la suite de vos recherches.

<a id="choose-the-right-entry-point"></a>

### Choisir le bon outil

Utilisez les [exemples exécutables](#algorithm-learning-and-method-comparison) pour apprendre ou modifier un algorithme, et les outils spécialisés lorsque vous avez besoin d’un contrat d’entrée/sortie défini. Les outils qui se recoupent pour Trotter / qDrift, VQD, Qiskit et les solveurs de valeurs propres disposent d’un [guide de sélection commun](../integrations/CAPABILITY_SELECTION.md) ; les noms d’origine sont conservés, et les implémentations reposant sur des hypothèses physiques ou des méthodes numériques différentes restent distinctes.

Qiskit Gym, Quantum Hardware et FlagQuantum sont désactivés par défaut. Lorsque vous en avez besoin, configurez un profil d’outils plus restreint pour l’entraînement, la consultation de dispositifs, la compilation ou la simulation ; sans choix explicite, le profil rétrocompatible `full` s’applique. Les outils appelables dans une session dépendent des connexions activées, de l’enregistrement effectif et du profil sélectionné.

<a id="local-computing-and-quantum-clouds"></a>

### Calcul local et clouds quantiques

Les calculs numériques locaux ne nécessitent pas de compte de cloud quantique. Pour utiliser d’autres outils, configurez la connexion sous **Paramètres → Composants quantiques → Connexions MCP Server**, redémarrez l’environnement de recherche et indiquez le backend dans la tâche. Les interrupteurs par défaut sont listés dans le [catalogue des services MCP](../CAPABILITIES.md#mcp-服务目录) (en chinois).

Pour le matériel réel, préparez les identifiants, autorisations et quotas du service cible. **La découverte de dispositifs, la soumission de tâches réelles et la simulation locale ont chacune leur propre périmètre.** Une configuration ne signifie pas que le service est en ligne ; consultez la trace d’exécution effective pour savoir si une tâche a réussi.

| Backend | Fonctionnalités actuelles | Identifiants ou conditions |
| --- | --- | --- |
| Calcul local | Simulation de circuits et de bruit, références d’états fondamentaux, audits d’états, échantillonnage de correction d’erreurs, optimisation et simulation d’expériences, chacun avec son propre domaine d’entrée | Pas d’identifiants cloud ; préparer les dépendances figées avant de calculer |
| IBM Quantum | Runtime, AI Transpiler, consultation du matériel ; soumission et annulation optionnelles de tâches réelles | `QISKIT_IBM_TOKEN` ; les connexions MCP Server de tâches sont à activer explicitement |
| IonQ | Consultation du matériel ; soumission, annulation et estimation de coût optionnelles de tâches réelles | `IONQ_API_KEY` ; les connexions MCP Server de tâches sont à activer explicitement |
| Cloud d’Origin Quantum | Découverte de backends en lecture seule (FieldQKit) ; consultation de la QPU Wukong via le MCP Server QPanda3 Runtime, avec tâches optionnelles d’échantillonnage, de valeur moyenne et par lots | `ORIGIN_API_TOKEN` pour la découverte ; `QPANDA3_API_KEY` pour les tâches matérielles optionnelles |
| Clouds Quafu, Tianyan, Guodun, Tencent et LogicalQubit | Vérification des identifiants, découverte de backends, filtrage des qubits, résumés de topologie et de calibration | Jeton API de chaque service ; lecture seule |
| FieldQuantum | Découverte des backends de simulateurs cloud | `FIELDQUANTUM_API_TOKEN` ; lecture seule |

Les tâches matérielles et les services payants s’activent à la demande. La découverte en lecture seule permet de connaître dispositifs, topologie et calibration avant de décider de lancer de vraies tâches. « Lecture seule » signifie que l’état du cloud distant ou de la QPU n’est pas modifié ; les ponts Python locaux conservent néanmoins leur contrat `workspace-write`, car les caches des SDK et l’écriture des fichiers de résultats peuvent écrire dans l’espace de travail local.

### Paramètres de calcul

Dans les limites des modèles et entrées pris en charge par chaque outil, vous choisissez le nombre de qubits, la profondeur des circuits, les termes du Hamiltonien, le nombre d’échantillons et les budgets d’itérations. Les paramètres et tailles disponibles suivent l’interface de chaque outil et dépendent de l’algorithme, du backend et des ressources de calcul ; un cas de référence borné ne définit pas le périmètre de chaque outil.

Le calcul principal et la comparaison exacte sont séparés : vous pouvez optimiser des circuits, générer des motifs MBQC, réduire par symétrie, analyser des algèbres de Lie ou exécuter directement des algorithmes tensoriels, et choisir des références indépendantes automatiques, forcées ou ignorées avec `referenceMode`. Paramètres, valeurs de retour et réglages de ressources sont décrits dans le [guide de calcul local](../integrations/SCALABLE_BRIDGES.md). Les entrées, versions et résultats des vérifications locales sont conservés dans les traces de chaque intégration pour permettre la reproduction.

D’autres tâches prêtes à copier pour les circuits, les états fondamentaux, le bruit, la dynamique et la consultation de bancs d’essai figurent dans le [documentation de référence en chinois](../EXAMPLES.md#更多可复制的计算任务).

<a id="execution-records-and-scientific-acceptance"></a>

### Des méthodes et des résultats réutilisables

L’environnement de recherche enregistre la demande, les appels d’outils et les résultats renvoyés de chaque tâche, pour que vous puissiez revoir le processus et poursuivre vos questions. Ajustez les paramètres, choisissez un autre backend connecté, ou transformez des étapes de recherche courantes en Skill pour les tâches suivantes.

Pour les fonctionnalités prises en charge, les résultats sont accompagnés de références exactes, de vérifications indépendantes ou d’informations d’erreur statistique. La résolution d’états fondamentaux et les audits d’information quantique offrent en outre un flux complet d’acceptation scientifique qui relie entrées, fichiers de résultats et provenance de session en vue de leur relecture.

<details>
<summary><strong>Traces d’exécution et acceptation scientifique en détail</strong></summary>

L’environnement de recherche enregistre les demandes de tâches, le chargement des Skills, les appels d’outils, l’état des autorisations et les résultats renvoyés. « Activé » dans les paramètres n’est qu’une politique de configuration ; ce sont les preuves d’exécution qui montrent si un outil est appelable et un service joignable.

La fin de l’exécution et l’acceptation scientifique sont présentées comme deux états distincts. Les fonctionnalités dotées d’un flux d’acceptation complet relient entrées, fichiers de résultats, vérifications indépendantes et traces de session dans un rapport d’acceptation qui liste les éléments réussis, échoués et non vérifiés ; les autres outils rapportent des résultats numériques et l’état de leurs vérifications dans leur propre périmètre.

![Des résultats, de la génération et de l’enregistrement des preuves et des vérifications indépendantes jusqu’à l’acceptation scientifique combinant règles et provenance](../images/openquantum-evidence-flow.png)

Le schéma montre comment les fonctionnalités à acceptation complète constituent leurs preuves ; [voir la source modifiable](../architecture/openquantum-evidence-flow.html). La résolution bornée d’états fondamentaux et les audits d’information quantique fournissent le flux complet ; QUBO, l’équivalence de circuits et les expériences de mémoire en correction d’erreurs rapportent résultats et vérifications selon leurs propres règles. Les preuves figurent dans les [déclarations de fonctionnalités](../../.agents/capability-packages.yml), l’[audit d’architecture](../architecture/ARCHITECTURE_AUDIT.md) et le [banc d’essai fixe des fonctionnalités quantiques](../../benchmarks/quantum-capabilities/README.md).

</details>

### Questions fréquentes

- Ai-je besoin d’un compte d’ordinateur quantique ou d’une clé de modèle ? Voir l’[exemple local](#no-model-key-needed-recompute-a-fixed-case), la [configuration du modèle](#configure-a-model) et les [clouds quantiques](#local-computing-and-quantum-clouds).
- [Dois-je d’abord apprendre chaque SDK ?](#give-ai-access-to-specialist-research-capabilities)
- [Une réponse uniquement textuelle signifie-t-elle que le calcul a été exécuté ?](#let-the-agent-run-a-task-prepare-and-sample-a-bell-state)
- [Après une mise à niveau, on me demande de préparer un environnement. Que faire ?](#upgrade-an-existing-source-installation)
- [Exemples d’algorithmes ou outils de calcul spécialisés ?](#choose-the-right-entry-point)
- [Quantum Learning propose-t-il déjà des cours complets ?](#quantum-learning)

<a id="extend-the-platform"></a>

## Étendre la plateforme

**Faites de votre logiciel quantique une fonctionnalité utilisable par les agents, et apportez des applications complètes sur une plateforme ouverte.** Les voies d’extension d’OpenQuantum adaptées aux agents sont les suivantes : décrire des méthodes de travail dans un Skill ; connecter des programmes de calcul comme Tools natifs ou via un MCP Server ; et, lorsque des vérifications scientifiques indépendantes sont nécessaires, ajouter un Validator et son flux de preuves. Les applications complètes s’intègrent selon leurs propres frontières métier et de données, au lieu d’être découpées en Tools isolés.

Les fonctionnalités spécialisées d’OpenQuantum s’exécutent sur DeepSeek Harness, qui assure l’exécution générale des agents, l’ordonnancement des outils, les connexions aux modèles et les traces d’exécution. Aucun second runtime d’agent n’est introduit. Partez de la tâche que les utilisateurs doivent résoudre, puis choisissez l’extension :

| Ce que vous ajoutez | Où cela se place |
| --- | --- |
| Connaissances du domaine, étapes, choix des outils et interprétation des résultats | Un Skill, qui peut réutiliser des Tools généraux ou quantiques existants |
| Un calcul, une requête ou une opération stable | Un Tool, enregistré par un Tool Provider natif ou par le Harness MCP Client |
| Une application quantique ou un produit pédagogique doté de sa propre interface et de son propre flux de travail | Intégrer selon la frontière de l’application, en conservant ses responsabilités métier, données, autorisations et backend ; Quantum Learning en est l’exemple existant |
| Vérification et acceptation scientifiques indépendantes | Un Validator ; pour l’acceptation finale, ajouter un Acceptance Profile, la génération et l’enregistrement des preuves et l’Acceptance Builder central |

Les Skills, ponts et Tools natifs existants servent de références. Lisez d’abord la [présentation de la documentation et de l’architecture](../README.md), puis, selon vos besoins, le [guide de contribution](../../CONTRIBUTING.md), le [modèle d’extension](../architecture/EXTENSION_MODEL.md) et la [carte des modules](../architecture/MODULES.md).

<a id="quantum-applications-for-practical-problems"></a>

### Des applications quantiques pour des problèmes concrets

OpenQuantum intègre non seulement des SDK, des algorithmes et des services de calcul, mais aussi des applications complètes destinées à des utilisateurs et des problèmes définis. Une application peut conserver sa propre interface, son flux de travail, sa gestion des données et son affichage des résultats, et se connecter aux agents via des interfaces d’exécution explicites lorsque la collaboration est utile.

De futures applications pourraient couvrir l’optimisation de plannings ou les calculs de molécules et de matériaux, permettant aux utilisateurs de soumettre un problème réel, de vérifier les conditions d’entrée et de lire les résultats avec leur périmètre, au lieu d’assembler un flux de travail à partir d’algorithmes isolés. Ce sont des pistes, et non une liste d’applications livrées. [Quantum Learning](#quantum-learning) est l’intégration d’application complète existante ; pour les autres, autorisations sur les données, backends, coûts et périmètre de vérification doivent être définis au cas par cas. Qu’une application utilise une vraie QPU ou surpasse les méthodes classiques se décide d’après ses propres traces d’exécution et comparaisons.

<details>
<summary><strong>Architecture et responsabilités</strong></summary>

![Architecture d’OpenQuantum : les accès de recherche aboutissent à Harness ; l’agent lit les Skills, utilise les outils via des Tool Providers natifs ou le Harness MCP Client, et se connecte aux services de modèles et au journal d’exécution](../images/openquantum-platform-overview.png)

Le schéma montre les principales relations d’appel de l’environnement de recherche ; [voir la source modifiable](../architecture/openquantum-platform-overview.html).

- Un **Skill** fournit des connaissances et des instructions de flux de travail ; il n’exécute pas de code et ne détient pas d’identifiants.
- Un **Tool Provider** enregistre des outils exécutables, de façon native dans le processus ou via le Harness MCP Client pour un MCP Server.
- Un **Scientific Validator** produit des observations ; un Acceptance Profile définit les règles, et seul l’Acceptance Builder central déduit l’acceptation finale à partir des observations et de la provenance. Dans les documents de développement, `L3` désigne un flux d’acceptation complet rejouable ; cela ne signifie pas que chaque appel a été accepté.
- Un **Agent Preset** combine les Skill Providers, Tool Providers et politiques d’agent nécessaires.

Préférez les Tool Providers natifs pour les actions dans le processus, dans le même langage et sans besoin d’isolation ; utilisez un MCP Server pour les déploiements multilangages, en processus séparé ou distants. Harness assemble les extensions via des Cordis Plugins, et l’interface, les connexions aux modèles, le calcul quantique et le jugement scientifique conservent des responsabilités distinctes.

</details>

Le catalogue complet des Skills, services MCP et Tools natifs est tenu à jour dans le [documentation de référence en chinois](../CAPABILITIES.md#接口总览) : les sources actuelles livrent **187 Skills intégrés** (174 sélectionnables automatiquement, 13 index de catégories manuels), **91 connexions de services MCP** (66 activées par défaut, 25 à activer explicitement) et **5 Tools quantiques natifs**.

<a id="development-and-verification"></a>

### Développement et vérification

<details>
<summary><strong>Vérifications de configuration, régressions numériques et tests de bout en bout</strong></summary>

```bash
# Check the Harness composition
npm run harness:config

# Run the complete offline quality check
npm run check

# macOS/Linux: local numerical regressions and Harness wiring with pinned dependencies
npm run capability:mitiq:live
npm run capability:unitary:live
npm run capability:hamiltonian:live
npm run capability:algorithms:live

# Real agent end-to-end test after configuring a model
npm run e2e:quantum-harness -- --provider openquantum-public
```

Choisissez les vérifications pertinentes pour votre modification ; la liste complète figure dans le [documentation de référence en chinois](../EXAMPLES.md#开发与验证). Les tests et les preuves locales sont distincts d’une version publiée ou d’une acceptation scientifique. Les changements de version figurent dans les [notes de version v0.8.4](../releases/v0.8.4.md).

</details>

Le [Skill officiel `pyqpanda3` d’OriginQ](https://github.com/OriginQ/pyqpanda3-skill) est un Skill amont optionnel : il n’est pas compté parmi les 187 Skills intégrés et n’est pas installé automatiquement. `npm run skill:qpanda:setup` installe la version examinée ; cette commande n’active pas `qpanda_runtime` et n’accorde aucune autorisation de tâches dans le cloud.

<a id="roadmap-and-rsi"></a>

## Feuille de route et RSI

**De l’utilisation des fonctionnalités existantes à la création commune de nouvelles fonctionnalités.** Nous continuerons à construire une plateforme ouverte d’agents et d’applications quantiques, où méthodes spécialisées, ressources de calcul, applications complètes, instruments de laboratoire et ressources pédagogiques ont chacun leur propre accès et fonctionnent ensemble dans leur périmètre. Ce sont des orientations à long terme, et non une liste de livrables ; les fonctionnalités arrivent par intégration et vérification individuelles.

### Fondations de la plateforme

| Axe à long terme | Ce que nous continuerons à construire |
| --- | --- |
| **0 · Un agent quantique plus utile** | Améliorer la compréhension des tâches, le choix des méthodes, les appels d’outils, l’interprétation des résultats et la reprise après échec, de la demande jusqu’au calcul effectif. Mesurer les progrès par la qualité, le temps et le coût de réalisation de tâches réelles. |
| **1 · Un écosystème logiciel quantique prêt pour les agents** | Continuer à connecter des logiciels spécialisés et à améliorer les interfaces d’exécution, les Skills de domaine et la préparation des dépendances, pour que les outils soient appelables et les méthodes réutilisables, en conservant conditions d’applicabilité et traces de vérification. |
| **2 · Flux de travail quantique, HPC et IA** | Relier CPU locaux, GPU distants, HPC, simulateurs quantiques et QPU, et explorer des calculs quantique–classique organisés par des agents. Choisir les ressources selon la taille, la précision, le temps et le budget, en vérifiant pas à pas backends, orchestration et exécution coordonnée. |
| **3 · Interfaces pour instruments de laboratoire intelligents** | Préparer des interfaces de dispositifs standardisées, connecter progressivement des instruments programmables et explorer la découverte de dispositifs, le contrôle expérimental, l’analyse des mesures et la rétroaction, pour relier le calcul aux expériences réelles. |

### Applications et enseignement

| Axe à long terme | Ce que nous continuerons à construire |
| --- | --- |
| **4 · Davantage de cours de qualité** | Construire une carte des connaissances des fondements jusqu’à la frontière de la recherche, avec des cours débutant, intermédiaire et avancé, un apprentissage d’un niveau à l’autre selon le parcours et les centres d’intérêt, et des explications, expériences pratiques et évaluations reliées entre elles. |
| **5 · Des applications quantiques pour des problèmes concrets** | Intégrer ou co-construire des applications complètes autour de problèmes définis, avec saisie du problème, flux de calcul et affichage des résultats, afin que les utilisateurs n’aient pas à assembler les outils sous-jacents. Documenter pour chaque application ses backends, coûts, périmètre et résultats de vérification. |

### Personnalisation et amélioration

| Axe à long terme | Ce que nous continuerons à construire |
| --- | --- |
| **6 · Un accompagnement proactif et personnalisé** | Comprendre le parcours, les centres d’intérêt et les objectifs de chacun à partir de son apprentissage et de ses recherches, suggérer quoi apprendre ou quelle méthode utiliser ensuite, et combler les prérequis manquants, pour que cours et outils s’adaptent à la personne. Les utilisateurs contrôlent quelles traces sont utilisées, où elles sont stockées et comment désactiver cette fonction. |
| **7 · Des capacités de recherche en amélioration continue** | Explorer le chemin qui mène de l’expérience des tâches à l’amélioration des méthodes et des outils, puis à l’amélioration du processus de recherche lui-même. Tester les améliorations par des comparaisons sur de nouvelles tâches, des vérifications indépendantes, des coûts complets et des versions réversibles, comme dans l’orientation RSI ci-dessous. |

Les interfaces d’instruments s’inspireront d’explorations comme le [Model Hardware Standard (MHS)](https://www.anthropic.com/news/model-hardware-standard-research-preview) d’Anthropic, en commençant par des dispositifs simulés et des expériences collaboratives ; le contrôle en temps réel et les contraintes des dispositifs restent du ressort des pilotes et systèmes de contrôle correspondants.

<a id="rsi"></a>
<a id="research-that-improves-how-research-is-done"></a>

### Une recherche qui améliore la façon de faire de la recherche

**État actuel : la plateforme dispose des méthodes, de l’exécution et d’une partie de l’infrastructure de vérification scientifique ; la boucle RSI n’est pas implémentée.** Propositions d’amélioration, évaluation indépendante, acceptation des versions et bénéfices d’une série à l’autre restent à construire et à vérifier ; les [frontières de l’architecture et des preuves](../README.md) demeurent la référence pour ce qui existe aujourd’hui.

**La recherche ne devrait pas laisser seulement des réponses, mais aussi des méthodes et des outils qui améliorent l’investigation suivante.** Nous souhaitons explorer l’auto-amélioration récursive (RSI) pour la science quantique : le système identifie ses propres limites, propose des améliorations candidates et les utilise dans les tâches suivantes après les avoir testées ; le système amélioré produit et vérifie ensuite plus efficacement la série d’améliorations suivante.

| Niveau | Changement que nous voulons accumuler |
| --- | --- |
| D’une tâche à l’autre | Transformer l’expérience autorisée des tâches en méthodes, cas et limites d’échec réutilisables, et non en simples historiques de conversation. |
| Amélioration des fonctionnalités | Proposer des modifications du choix des méthodes, de l’implémentation des outils ou du flux de travail, et tester sur de nouvelles tâches si la qualité, la fiabilité ou le coût s’améliorent. |
| Auto-amélioration récursive | Améliorer les méthodes qui produisent les améliorations, comme la conception d’expériences, la recherche de candidats et la vérification indépendante, et tester si la série suivante devient plus efficace. |

La boucle envisagée est **tâche réelle → amélioration candidate → vérifications indépendantes et comparaisons sur de nouvelles tâches → mise à jour de version autorisée → série de recherches suivante.**

Par exemple, une tâche sur un circuit pourrait produire non seulement un circuit optimisé, mais aussi une meilleure façon de choisir les stratégies d’optimisation. Les stratégies candidates nécessitent des vérifications d’équivalence indépendantes et une comparaison avec la version précédente sur des circuits non utilisés pendant le développement ; améliorer les expériences qui trouvent de telles stratégies touche au cœur récursif. Ce qui compte, c’est que les tâches suivantes en bénéficient réellement, et non le nombre de Skills ajoutés, le volume de code modifié ou le passage à un modèle plus puissant.

Une amélioration doit être comparée à une version qui n’en a pas hérité, en indiquant le modèle de base, l’intervention humaine ainsi que le coût total d’amélioration et d’utilisation dans des conditions comparables, et en vérifiant l’absence de régressions. Un système candidat ne doit ni assouplir ses propres règles d’acceptation, ni supprimer des preuves d’échec, ni étendre ses autorisations ; évaluation indépendante, autorisation de l’utilisateur, frontières des données et possibilité de retour en arrière sont des conditions d’acceptation d’un changement. Les contributions de la communauté et l’encadrement humain y prennent part et ne doivent pas être entièrement attribués à un progrès autonome de l’IA.

OpenQuantum vise à fournir un environnement de travail quantique pour cette exploration : outils exécutables, méthodes réutilisables, résultats vérifiables et interfaces ouvertes pour d’autres agents de recherche, sans construire un nouveau runtime d’agent généraliste ni entraîner un nouveau modèle de fondation. Une collaboration avec CyberEinstein, PRAgent et RunThePaper est une possibilité pour l’avenir, et non une boucle automatique existante entre projets. Que l’IA et le calcul quantique se renforcent mutuellement doit être testé sur des tâches concrètes, en comptant les coûts de préparation, de mesure, de correction d’erreurs et de transfert de données ; nous ne supposons pas que le calcul quantique accélère l’entraînement des modèles de fondation ni qu’il permette une auto-amélioration illimitée.

**Ce que nous voulons au bout du compte : qu’une investigation produise un résultat nouveau et laisse des capacités qui aident la suivante à réussir.**

<a id="documentation-and-support"></a>

## Documentation et contribution

**Chacun est invité à contribuer à une IA de confiance pour la recherche quantique.** Signalez des problèmes, contribuez du code, connectez des outils, partagez méthodes et cas de reproduction, et aidez l’expertise de la communauté à atteindre davantage de chercheurs. Un cas reproductible, un résultat négatif vérifié, une correction qui supprime une préparation répétitive ou une expérience qui met les apprenants en pratique peuvent tous amorcer le travail suivant.

| Ce que vous voulez faire | Par où commencer |
| --- | --- |
| Utiliser la plateforme et comprendre ses fonctionnalités | [Index de la documentation](../README.md), [déploiement](../DEPLOYMENT.md), [dépannage](../TROUBLESHOOTING.md) |
| Contribuer des Skills, des outils et des vérifications scientifiques | [Étendre la plateforme](#extend-the-platform), [guide de contribution](../../CONTRIBUTING.md) |
| Intégrer des applications, construire des cours et des expériences | [Applications concrètes](#quantum-applications-for-practical-problems), [Quantum Learning](#quantum-learning) |
| Signaler un problème ou découvrir l’histoire du projet | [GitHub Issues](https://github.com/xi-zhao/OpenQuantum/issues), [histoire du projet (en chinois)](../communications/openquantum-wechat-launch.md) |

Lorsque vous contribuez, indiquez sources, auteurs, licences, conditions et périmètre de vérification, et ne partagez que des contenus autorisés. Les sessions privées et les données non publiées ne sont pas publiques par défaut, et les identifiants n’ont jamais leur place dans une contribution. Signalez les problèmes de sécurité de façon privée selon la [politique de sécurité](../../SECURITY.md).

La documentation technique détaillée est principalement rédigée en chinois, et une édition anglaise détaillée est également disponible ; les corrections de cette traduction sont les bienvenues.

**[Commencer une exploration quantique](#quick-start)** · [Apporter vos méthodes et applications](#extend-the-platform)

**OpenQuantum · Le calcul quantique à portée de main.**

<a id="license-and-acknowledgments"></a>

## Licence et remerciements

Les fonctionnalités quantiques d’OpenQuantum s’appuient sur la science ouverte et les logiciels open source. Nous maintenons les Skills de domaine, les ponts MCP, les Tools natifs et les vérifications scientifiques applicables ; les bibliothèques d’algorithmes sous-jacentes, les services externes et les socles applicatifs conservent leurs propres auteurs, noms de projet et licences.

| Projet utilisé ou adapté | Rôle dans OpenQuantum |
| --- | --- |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | Runtime d’agent et Web UI native de l’environnement de recherche : sessions, appels aux modèles, ordonnancement des outils et traces d’exécution |
| [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop) | Socle du client de bureau ; OpenQuantum adapte la marque et la configuration de lancement, et réutilise l’environnement de recherche |
| [CC Connect](../integrations/CC_CONNECT.md) | Pont de messagerie qui achemine les demandes de WeChat, Feishu et d’autres canaux vers l’environnement de recherche |
| [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) | Socle pédagogique de Quantum Learning, qui conserve son interface complète, son serveur et ses flux pédagogiques, avec le nommage, le thème et la connexion aux modèles d’OpenQuantum |

Les projets de calcul, de dispositifs et de référence qui sous-tendent chaque fonctionnalité, ainsi que la façon dont chacun est adapté, sont listés dans le [documentation de référence en chinois](../CAPABILITIES.md#开源生态与致谢).

Le code propre à OpenQuantum est sous [licence MIT](../../LICENSE), à l’exception des répertoires sous licence distincte. Le [répertoire de la fonctionnalité d’atténuation d’erreurs Mitiq](../../.agents/skills/mitiq-error-mitigation/) est sous GPL-3.0-only, et l’[instantané des données publiques Metriq](../../src/metriq-data/upstream/) sous CC-BY-4.0, chacun avec ses propres fichiers LICENSE et NOTICE. DeepSeek Harness, DSH Desktop, OpenMAIC, FatQat, Qiskit MCP Servers, FieldQKit, Quantum Hardware MCP et les autres composants tiers conservent leurs propres licences ; consultez [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) avant toute redistribution ou activation d’une intégration optionnelle. Les sources des captures d’écran et des schémas figurent dans les [notes sur les images](../images/README.md).
