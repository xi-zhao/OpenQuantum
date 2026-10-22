<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>OpenQuantum — Construisons ensemble une IA de confiance pour la recherche quantique.</strong><br /><sub>L’expertise de la recherche quantique réunie dans OpenQuantum</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum est une plateforme d’IA pour la recherche quantique, open source et ouverte à la collaboration. Elle rassemble les logiciels, les algorithmes et les travaux publiés par la communauté pour aider l’IA à analyser vos questions, choisir des méthodes, exécuter des calculs et vérifier les résultats. Elle transforme l’expertise partagée en capacités de recherche concrètes.

**Menez une tâche à bien, puis appliquez la méthode à votre propre question.** Exécutez un exemple, modifiez ses entrées et examinez les résultats. Conservez le code, les paramètres et les sorties pour votre prochaine recherche.

**[Installer le plugin Codex](../integrations/CODEX_AGENT_INSTALL.md)** · [Installer Desktop](../DESKTOP_INSTALLERS.md)

**OpenQuantum 0.8.4 est disponible :** [Desktop](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) · [Plugin Codex](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4). Les deux partagent la même version produit. Tools, MCP et Skills sont classés en huit catégories d’usage, avec recherche et filtres d’état. Les lanceurs Desktop utilisent l’icône OpenQuantum.

![OpenQuantum Desktop](../images/openquantum-desktop-20261013.jpg)

## Fonctionnalités

Simulez des circuits avec Qiskit et TyxonQ, optimisez-les avec PyZX, explorez le calcul fondé sur les mesures avec Graphix, la réduction par symétries avec Symmer et l’algèbre de Lie avec PauLie. TeNPy, SQD et Flow-VQE couvrent les états fondamentaux et la chimie. Mitiq permet l’atténuation des erreurs ; Stim, PyMatching, Deltakit et BP+LSD permettent d’étudier leur correction. Dynamiqs, OQuPy, TJM et Clifft traitent la dynamique et le bruit ; FatQat propose des expériences sur les systèmes supraconducteurs et atomiques. FieldQKit découvre les dispositifs et Quantum Learning fournit des espaces d’apprentissage et de cours.

Le code de `main` comprend aussi la découpe de portes et la reconstruction de valeurs moyennes avec QCut, l’optimisation de circuits avec Compact et le calcul d’états excités par VQD avec OpenQARP. Ces connexions sont activées par défaut, mais leurs dépendances doivent être préparées. Le QSVM à noyau angulaire de cqlib-qml et l’environnement de circuits FlagQuantum restent désactivés jusqu’à leur activation explicite. Consultez le [périmètre et les vérifications](../integrations/CANDIDATE_LIBRARIES.md).

L’inventaire actuel comprend **183 Skills** (170 sélectionnables automatiquement et 13 index manuels), **91 connexions MCP** et **5 Tool quantiques natifs**. Leur disponibilité dépend des connexions activées et des environnements préparés. Consultez le [guide de sélection](../integrations/CAPABILITY_SELECTION.md).

v0.8.4 donne accès aux API publiques natives de **111 environnements SDK ou sources**. L’agent peut écrire ses propres programmes, combiner les API et conserver les résultats complets, au-delà des cas prédéfinis des Tool. Préparez explicitement les dépendances pour chaque tâche. Les limites de plateforme, de compte, de licence et de backend optionnel restent applicables. Le [registre d’intégration](../integrations/FULL_SDK_ACCESS.md) précise les vérifications d’ingénierie. Aucune acceptation fondée sur de véritables tâches de recherche n’a été réalisée ; `scientificValidation=not_evaluated`.

v0.6.0 réunit **52 modules de capacités SDK** issus de trois groupes : [17 SDK de fournisseurs](../integrations/VENDOR_SDKS.md), [20 capacités d’entreprises et d’instituts](../integrations/SDK_EXPANSION.md) et [15 interfaces réseau, contrôle, optique et cloud](../integrations/SDK_GAPS.md). Ils couvrent les circuits différentiables, l’estimation de ressources, les opérateurs chimiques, la photonique, la compilation d’impulsions et les réseaux quantiques ; [Bloqade Analog](../integrations/BLOQADE_ANALOG.md) ajoute la simulation locale de réseaux d’atomes. Chaque adaptateur expose les opérations documentées. L’utilisateur configure comptes, identifiants, autorisations et licences. Les vérifications locales ne valident ni les connexions réelles au cloud, ni les QPU, ni l’acceptation scientifique.

Les **66 guides quantum-skills** d’UnitaryLab ont une adaptation native ; **49 exemples exécutables** couvrent les **39 modules d’algorithmes d’origine** et des méthodes propres aux guides. Ils utilisent Qiskit, PennyLane, quimb, PySCF et NumPy/SciPy sans dépendre du runtime propriétaire d’UnitaryLab. Il ne s’agit pas d’une compatibilité complète des API : les différences figurent dans la [table de couverture](../integrations/UNITARYLAB_OPEN_COVERAGE.md).

S’y ajoutent la simulation Trotter / qDrift de Hamiltoniens de Pauli, la [conversion Qiskit/Cirq avec qBraid, les mesures et parités brutes avec Clifft, ainsi que les requêtes QDMI vers un pilote C configuré](../integrations/QUANTUM_INTEROP.md). Les données du pilote d’exemple QDMI ne décrivent pas une QPU réelle en ligne.

Chaque intégration possède ses dépendances et son domaine de validité scientifique. Un calcul local ne démontre pas les performances d’un dispositif réel. La fin d’un appel d’outil ne constitue pas, à elle seule, une validation scientifique.

## Pourquoi choisir OpenQuantum

**Une large couverture scientifique.** Des algorithmes et de la simulation de circuits à la chimie quantique, aux calculs à N corps et à la correction d’erreurs, OpenQuantum relie outils et méthodes. Consacrez moins de temps à les préparer et davantage à explorer vos questions.

**Des gains de vitesse mesurés.** Dans les cas d’optimisation d’un [commutateur de Pauli avec PennyLane](../../README.md#pennylane-rust-case) et d’une [fonction de Wigner avec QuTiP](../../README.md#qutip-rust-case), les appels complets des tâches représentatives sont respectivement **5.09×** et **5.69×** plus rapides. Les mesures incluent la conversion des entrées et sorties ; les résultats ont été comparés aux bibliothèques d’origine et à des calculs de référence indépendants.

**Des capacités enrichies ensemble.** Nous intégrons continuellement des projets open source et des méthodes publiées, avec un travail d’adaptation, d’intégration, d’optimisation et de vérification. Chacun peut contribuer par des questions, du code, des outils, des méthodes et des cas de reproduction.

## Démarrage rapide

Pour un usage local individuel, choisissez le programme d’installation ou l’exécution depuis les sources.

### Programme d’installation de bureau

OpenQuantum 0.8.4 utilise le client original [anywhere-labs DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7) et une archive de capacités OpenQuantum. Harness reste en `0.1.5-rc.1`. L’archive contient Node.js et uv ; lancez `install.command` sur Mac ou `install.cmd` sur Windows. La marque, les composants quantiques, Quantum Learning et les mises à jour restent disponibles, avec un minimum de changements de l’interface. Voir le [guide d’installation et de mise à niveau](../DESKTOP_INSTALLERS.md).

Installez d’abord le client original DSH Desktop. Téléchargez l’archive Mac Apple Silicon, Mac Intel ou Windows x64 depuis la [Release 0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) et vérifiez-la avec `SHA256SUMS` avant de l’extraire. L’installateur crée `OpenQuantum.app` sur Mac ou `OpenQuantum.lnk` sur Windows avec l’icône OpenQuantum. Le client original conserve son nom et sa version. Les mises à jour préservent les Skills, routes de modèles et paramètres MCP existants. Les environnements de calcul et Quantum Learning nécessitent la préparation documentée.

### Codex

Téléchargez l’[installateur complet 0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.4/openquantum-0.8.4-codex-install.zip) et suivez le [guide d’installation](../integrations/CODEX_AGENT_INSTALL.md). Le plugin fournit 168 Skills et 87 Tools scientifiques dans les conversations Codex. Il nécessite un Codex compatible, Node.js 24 ou ultérieur et npm ; préparez les dépendances scientifiques selon vos besoins.

### Exécuter depuis les sources

Pour développer ou utiliser les capacités de `main`, préparez Git, Node.js 24 ou ultérieur et uv pour les outils Python, puis suivez les étapes ci-dessous.

[uv](https://docs.astral.sh/uv/getting-started/installation/)

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

Ouvrez le lien de connexion affiché dans le journal de démarrage. Après authentification, l’espace de travail apparaît dans le navigateur.

### Configurer un modèle

Dans Paramètres → Modèles, saisissez l’URL, le nom du modèle et la clé API d’un fournisseur compatible avec OpenAI-compatible Chat Completions. Choisissez l’Agent Preset OpenQuantum. Le modèle doit prendre en charge Tool Calling pour exécuter les outils. La liste des modèles est vide lors d’une nouvelle installation de Desktop. Ajoutez le service de votre choix. Les identifiants du modèle sont distincts de ceux du cloud quantique.

L’exemple local de référence pour un Hamiltonien fixé à deux qubits fonctionne sans clé de modèle.

```bash
npm run demo:quantum-ground-state
```

Avant d’exécuter la tâche FatQat ci-dessous depuis les sources, préparez explicitement son environnement à la racine du dépôt. Cette préparation peut télécharger des dépendances ; le calcul ne les installe pas automatiquement.

```bash
node scripts/setup-paper-tools.mjs fatqat-workbench
```

Pour les exemples d’algorithmes, commencez avec `npm run capability:algorithms:setup -- --minimal`. Ajoutez `--group gradients`, `--group pennylane`, `--group tensor` ou `--group chemistry` selon la méthode ; les groupes déjà installés sont conservés. Sans argument, la préparation reste complète. L’environnement complet comprend PySCF : WSL est recommandé sous Windows, et la vérification numérique a été réalisée sur CPU macOS. Voir les [instructions d’exécution](../../examples/quantum-algorithms/README.md).

Après une mise à jour des sources, relancez la préparation des capacités utilisées, redémarrez le poste de travail et ouvrez une nouvelle session. Les environnements Python existants sont vérifiés et synchronisés sur place. [Préparation et mise à jour des environnements](../integrations/LOCAL_ENVIRONMENTS.md).

Une fois le modèle configuré, essayez : « Avec FatQat, prépare un état de Bell à partir de deux qubits dans l’état zéro. Applique H à q0, puis CX avec q0 comme contrôle et q1 comme cible. Compare les probabilités exactes à 1024 échantillons avec seed=7. » Les probabilités idéales de 00 et 11 sont chacune de 50 %. Vérifiez les entrées de l’outil et les résultats du calcul.

### Application de bureau

Pour compiler Desktop depuis la même copie des sources, terminez l’installation depuis les sources et préparez Corepack ainsi que les outils de compilation C++ du système.

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop -- --source
```

Web et Desktop partagent les données et la configuration de Harness lorsqu’ils sont lancés depuis la même copie des sources. Fermez l’autre hôte avant d’utiliser le même répertoire de données.

## Quantum Learning

Préparez l’application pédagogique dans la même copie du dépôt que celle utilisée pour lancer OpenQuantum.

```bash
npm run learning:ui:setup
```

Ouvrez Quantum Learning depuis la barre latérale. Chaque nouveau Git worktree nécessite sa propre installation. Si une installation incomplète est signalée, exécutez la commande ci-dessus dans ce worktree, puis rouvrez l’application. L’intégration conserve les fonctions de cours, de classe et d’édition d’OpenMAIC. Les modèles passent par Harness ; les données pédagogiques restent séparées du journal des sessions.

## Langues

Dans Paramètres → Général → Langue, choisissez le chinois simplifié, l’anglais, le japonais, le coréen, l’espagnol, le français, l’allemand, le portugais, le russe ou l’arabe. Le choix est enregistré et synchronisé avec Quantum Learning. L’arabe s’affiche de droite à gauche. Les conversations existantes, les cours, les Skills rédigés par l’utilisateur et les sorties des outils ne sont pas traduits. Certains dialogues natifs utilisent l’anglais en dehors du chinois et de l’anglais.

## Documentation et contributions

Les Skills fournissent les connaissances et procédures ; les Tool Providers enregistrent les outils exécutables. Les capacités nécessitant une vérification scientifique utilisent un Validator indépendant et des preuves pour déterminer leur acceptation. OpenQuantum réutilise l’environnement d’exécution de DeepSeek Harness. Les éditions anglaise et chinoise détaillent l’utilisation et l’extension de la plateforme.

Construisons ensemble une IA de confiance pour la recherche quantique. Chacun peut signaler un problème, contribuer du code ou des outils, et partager des méthodes ou des cas de reproduction.

[English](./README.en.md) · [中文](../../README.md) · [Documentation](../README.md) · [Contributing](../../CONTRIBUTING.md) · [Issues](https://github.com/xi-zhao/openQuantum/issues)

```bash
npm run harness:config
npm run desktop:check
npm run check
```

## Perspectives et RSI

Nous explorons la coopération entre calcul quantique, HPC et IA, de nouvelles applications et ressources pédagogiques, ainsi que l’amélioration des méthodes de recherche. L’auto-amélioration récursive (RSI) reste un projet de recherche : la boucle proposée n’est pas encore implémentée. Elle nécessite des vérifications indépendantes, des comparaisons sur de nouvelles tâches, le coût total, l’autorisation de l’utilisateur et un retour possible à une version antérieure.

[Feuille de route détaillée](../../README.md#rsi).

## Licence

Le code propre à OpenQuantum est sous licence MIT. DeepSeek Harness, OpenMAIC et les projets quantiques conservent leurs auteurs et licences. Consultez Third-party notices avant toute redistribution ou activation d’une intégration facultative.

[MIT](../../LICENSE) · [Third-party notices](../../THIRD_PARTY_NOTICES.md)
