<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>Mettez vos idées quantiques en action.</strong><br /><sub>Une plateforme ouverte d’agents et d’applications quantiques</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum rassemble outils quantiques, méthodes spécialisées et applications complètes. Vous pouvez confier un calcul à un agent d’IA, utiliser une application intégrée ou ajouter vos propres algorithmes et services. Les services de modèles et les ressources de calcul se configurent séparément.

**Posez vos questions, lancez des calculs et construisez de nouvelles capacités ensemble.**

![OpenQuantum Desktop](../images/openquantum-desktop-20260919.jpg)

## Fonctionnalités

Simulez des circuits avec Qiskit et TyxonQ, optimisez-les avec PyZX, explorez le calcul fondé sur les mesures avec Graphix, la réduction par symétries avec Symmer et l’algèbre de Lie avec PauLie. TeNPy, SQD et Flow-VQE couvrent les états fondamentaux et la chimie. Mitiq permet l’atténuation des erreurs ; Stim, PyMatching, Deltakit et BP+LSD permettent d’étudier leur correction. Dynamiqs, OQuPy, TJM et Clifft traitent la dynamique et le bruit ; FatQat propose des expériences sur les systèmes supraconducteurs et atomiques. FieldQKit découvre les dispositifs et Quantum Learning fournit des espaces d’apprentissage et de cours.

Le code de `main` comprend aussi la découpe de portes et la reconstruction de valeurs moyennes avec QCut, l’optimisation de circuits avec Compact et le calcul d’états excités par VQD avec OpenQARP. Ces connexions sont activées par défaut, mais leurs dépendances doivent être préparées. Le QSVM à noyau angulaire de cqlib-qml et l’environnement de circuits FlagQuantum restent désactivés jusqu’à leur activation explicite. Consultez le [périmètre et les vérifications](../integrations/CANDIDATE_LIBRARIES.md).

Chaque intégration possède ses dépendances et son domaine de validité scientifique. Un calcul local ne démontre pas les performances d’un dispositif réel. La fin d’un appel d’outil ne constitue pas, à elle seule, une validation scientifique.

## Pourquoi choisir OpenQuantum

**De la question au calcul.** Décrivez une tâche prise en charge en langage naturel : l’agent appelle les outils spécialisés. Vous définissez les données et les hypothèses physiques, puis jugez les résultats.

**Chaque recherche prépare la suivante.** L’espace de travail conserve les entrées et les résultats des outils pour poursuivre avec d’autres paramètres. La validation scientifique dépend du périmètre de chaque capacité.

**Des méthodes que d’autres peuvent utiliser.** Ajoutez des Skills, des outils de calcul, des ressources pédagogiques ou des applications. Les modèles et les ressources de calcul se configurent séparément ; les auteurs et les licences des projets d’origine restent identifiés.

## Démarrage rapide

Pour un usage local individuel, choisissez le programme d’installation ou l’exécution depuis les sources.

### Programme d’installation de bureau

Téléchargez le programme pour Mac (Apple Silicon / Intel) ou Windows depuis [GitHub Releases](https://github.com/xi-zhao/OpenQuantum/releases/latest). Node.js et uv sont inclus : aucune compilation des sources n’est nécessaire. Il s’agit de versions de test non signées. Suivez le [guide d’installation](../DESKTOP_INSTALLERS.md), ouvrez l’application et configurez un modèle. Certaines dépendances Python sont téléchargées au premier usage ; Quantum Learning et les autres applications facultatives nécessitent une préparation distincte.

Les [programmes d’installation v0.5.1](../releases/v0.5.1.md) ne contiennent pas les capacités ajoutées ensuite à `main` ni les [mises à jour des bibliothèques quantiques du 22 septembre](../releases/2026-09-22-quantum-upstream-update.md). Les changements des sources ne mettent pas automatiquement à jour l’application installée.

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

Dans Paramètres → Modèles, saisissez l’URL, le nom du modèle et la clé API d’un fournisseur compatible avec OpenAI-compatible Chat Completions. Choisissez l’Agent Preset OpenQuantum. Le modèle doit prendre en charge Tool Calling pour exécuter les outils. Les adresses .invalid fournies sont des exemples : remplacez-les par un service réel. Les identifiants du modèle sont distincts de ceux du cloud quantique.

L’exemple local de référence pour un Hamiltonien fixé à deux qubits fonctionne sans clé de modèle.

```bash
npm run demo:quantum-ground-state
```

Une fois le modèle configuré, essayez : « Avec FatQat, prépare un état de Bell à partir de deux qubits dans l’état zéro. Applique H à q0, puis CX avec q0 comme contrôle et q1 comme cible. Compare les probabilités exactes à 1024 échantillons avec seed=7. » Les probabilités idéales de 00 et 11 sont chacune de 50 %. Vérifiez les entrées de l’outil et les résultats du calcul. La première utilisation peut télécharger des dépendances.

### Application de bureau

Pour compiler Desktop depuis la même copie des sources, terminez l’installation depuis les sources et préparez Corepack ainsi que les outils de compilation C++ du système.

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop
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
