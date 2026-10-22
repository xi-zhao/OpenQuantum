<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>OpenQuantum — Gemeinsam vertrauenswürdige KI für die Quantenforschung entwickeln.</strong><br /><sub>Das Fachwissen der Quantenforschung, vereint in OpenQuantum</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum ist eine Open-Source-KI-Plattform für die Quantenforschung, offen für gemeinsame Weiterentwicklung. Sie verbindet Software, Algorithmen und veröffentlichte Forschung aus der Community, damit KI bei der Analyse Ihrer Fragen, der Methodenwahl, der Ausführung von Berechnungen und der Prüfung von Ergebnissen helfen kann. So wird gemeinsames Fachwissen praktisch nutzbar.

**Schließen Sie eine Aufgabe ab und wenden Sie die Methode dann auf Ihre eigene Frage an.** Führen Sie ein Beispiel aus, ändern Sie Eingaben und prüfen Sie Ergebnisse. Bewahren Sie Code, Parameter und Ausgaben für Ihre nächste Untersuchung auf.

**[Codex-Plugin installieren](../integrations/CODEX_AGENT_INSTALL.md)** · [Desktop installieren](../DESKTOP_INSTALLERS.md)

**OpenQuantum 0.8.4 ist verfügbar:** [Desktop](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) · [Codex-Plugin](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4). Beide haben dieselbe Produktversion. Tools, MCP und Skills sind in acht Nutzungskategorien mit Suche und Statusfiltern gegliedert. Die Desktop-Starter verwenden das OpenQuantum-Symbol.

![OpenQuantum Desktop](../images/openquantum-desktop-20261013.jpg)

## Funktionen

Qiskit und TyxonQ ermöglichen Schaltungssimulationen, PyZX die Optimierung, Graphix messbasiertes Quantenrechnen, Symmer die Reduktion anhand von Symmetrien und PauLie die Analyse von Lie-Algebren. TeNPy, SQD und Flow-VQE behandeln Grundzustände und Chemie. Mitiq dient der Fehlerminderung; Stim, PyMatching, Deltakit und BP+LSD unterstützen Fehlerkorrektur. Dynamiqs, OQuPy, TJM und Clifft untersuchen Dynamik und Rauschen. FatQat bietet Experimente mit supraleitenden und atomaren Systemen. Hinzu kommen die Gerätesuche mit FieldQKit und die Lernanwendung Quantum Learning.

Der Quellcode auf `main` enthält auch Gate-Cutting und die Rekonstruktion von Erwartungswerten mit QCut, Schaltungsoptimierung mit Compact und angeregte Zustände per VQD mit OpenQARP. Diese Verbindungen sind standardmäßig aktiviert; ihre Abhängigkeiten müssen vorbereitet werden. Das Winkelkernel-QSVM von cqlib-qml und die Schaltungswerkzeuge von FlagQuantum sind standardmäßig deaktiviert und werden bei Bedarf eingeschaltet. Siehe [Umfang und Prüfungen](../integrations/CANDIDATE_LIBRARIES.md).

Der aktuelle Quellcode enthält **183 Skills** (170 automatisch auswählbar, 13 manuelle Kategorieindizes), **91 MCP-Verbindungen** und **5 native Quanten-Tools**. Verfügbarkeit hängt von aktivierten Verbindungen und vorbereiteten Umgebungen ab. Siehe [Auswahlleitfaden](../integrations/CAPABILITY_SELECTION.md).

v0.8.4 ermöglicht den Zugriff auf native öffentliche APIs in **111 SDK- und Quellcodeumgebungen**. Agenten können eigene Programme schreiben, APIs kombinieren und vollständige Ergebnisse speichern, ohne auf die vorgegebenen Tool-Beispiele beschränkt zu sein. Bereiten Sie Abhängigkeiten für jede Aufgabe ausdrücklich vor. Grenzen von Plattformen, Konten, Lizenzen und optionalen Backends gelten weiterhin. Technische Prüfungen stehen im [Integrationsbericht](../integrations/FULL_SDK_ACCESS.md). Es wurde keine Abnahme anhand realer Forschungsaufgaben durchgeführt; `scientificValidation=not_evaluated`.

v0.6.0 bündelt **52 SDK-Fähigkeitspakete** aus drei Integrationsgruppen: [17 Anbieter-SDKs](../integrations/VENDOR_SDKS.md), [20 Fähigkeiten von Unternehmen und Forschungseinrichtungen](../integrations/SDK_EXPANSION.md) sowie [15 Schnittstellen für Netzwerke, Steuerung, Optik und Cloud](../integrations/SDK_GAPS.md). Sie umfassen differenzierbare Schaltungen, Ressourcenschätzung, chemische Operatoren, Photonik, Pulskompilierung und Quantennetzwerke; [Bloqade Analog](../integrations/BLOQADE_ANALOG.md) ergänzt lokale Simulationen von Atomanordnungen. Jeder Adapter bietet die dokumentierten Aktionen. Konten, Zugangsdaten, Berechtigungen und Lizenzen richtet der Nutzer ein. Lokale Prüfungen bestätigen weder reale Cloud-Verbindungen noch QPU-Betrieb oder wissenschaftliche Abnahme.

Alle **66 quantum-skills-Anleitungen** von UnitaryLab sind als native Skills adaptiert. **49 ausführbare Beispiele** decken die **39 ursprünglichen Algorithmusmodule** und weitere Methoden aus den Anleitungen ab. Sie verwenden Qiskit, PennyLane, quimb, PySCF und NumPy/SciPy ohne proprietäre UnitaryLab-Laufzeit. Eine vollständige API-Kompatibilität wird damit nicht zugesagt; Unterschiede sind in der [Abdeckungstabelle](../integrations/UNITARYLAB_OPEN_COVERAGE.md) dokumentiert.

Hinzu kommen Trotter-/qDrift-Simulationen von Pauli-Hamiltonoperatoren sowie [Qiskit/Cirq-Konvertierung mit qBraid, Messwerte und rohe Paritäten mit Clifft und QDMI-Abfragen über einen konfigurierten C-Treiber](../integrations/QUANTUM_INTEROP.md). Daten des QDMI-Beispieltreibers beschreiben keine tatsächlich erreichbare QPU.

Jede Integration hat eigene Abhängigkeiten und einen begrenzten wissenschaftlichen Geltungsbereich. Eine lokale Berechnung belegt keine Leistung realer Hardware. Ein abgeschlossener Werkzeugaufruf bedeutet auch nicht automatisch eine bestandene wissenschaftliche Prüfung.

## Warum OpenQuantum

**Breite fachliche Abdeckung.** Von Quantenalgorithmen und Schaltungssimulation bis zu Quantenchemie, Vielteilchenrechnungen und Fehlerkorrektur verbindet OpenQuantum Werkzeuge und Methoden. Verbringen Sie weniger Zeit mit der Vorbereitung und mehr mit Ihren Forschungsfragen.

**Mehr Tempo, durch Messungen belegt.** Bei der Optimierung einer [Pauli-Kommutatorberechnung mit PennyLane](../../README.md#pennylane-rust-case) und einer [Wigner-Funktion mit QuTiP](../../README.md#qutip-rust-case) waren die vollständigen Aufrufe der repräsentativen Aufgaben **5.09×** beziehungsweise **5.69×** schneller. Die Messungen enthalten die Ein- und Ausgabekonvertierung; die Ergebnisse wurden mit den ursprünglichen Bibliotheken und unabhängigen Referenzrechnungen verglichen.

**Gemeinsame Weiterentwicklung.** Wertvolle Open-Source-Projekte und veröffentlichte Methoden werden fortlaufend eingebunden, angepasst, optimiert und geprüft. Alle können Fragen, Code, Werkzeuge, Methoden und Reproduktionsbeispiele beitragen.

## Schnellstart

Für die lokale Nutzung durch eine einzelne Person stehen ein Desktop-Installationspaket und der Start aus dem Quellcode zur Wahl.

### Desktop-Installationspaket

OpenQuantum 0.8.4 verwendet das Original [anywhere-labs DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7) mit einem OpenQuantum-Funktionspaket. Harness bleibt bei `0.1.5-rc.1`. Das Archiv enthält Node.js und uv; starten Sie `install.command` auf dem Mac oder `install.cmd` unter Windows. Marke, Quantenkomponenten, Quantum Learning und OpenQuantum-Updates bleiben mit möglichst wenigen Änderungen an der Oberfläche erhalten. Siehe [Installation und Aktualisierung](../DESKTOP_INSTALLERS.md).

Installieren Sie zuerst das originale DSH Desktop. Laden Sie das Archiv für Mac Apple Silicon, Mac Intel oder Windows x64 aus der [Release 0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) herunter und prüfen Sie es vor dem Entpacken mit `SHA256SUMS`. Das Installationsprogramm erstellt `OpenQuantum.app` auf dem Mac oder `OpenQuantum.lnk` unter Windows mit dem OpenQuantum-Symbol. Der Originalclient behält seinen Namen und seine Version. Updates erhalten bestehende Skills, Modellrouten und MCP-Einstellungen. Rechenumgebungen und Quantum Learning benötigen die dokumentierte Vorbereitung.

### Codex

Laden Sie das [vollständige Installationspaket 0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.4/openquantum-0.8.4-codex-install.zip) herunter und folgen Sie der [Installationsanleitung](../integrations/CODEX_AGENT_INSTALL.md). Das Plugin bietet 168 Skills und 87 wissenschaftliche Tools in Codex-Unterhaltungen. Es benötigt ein kompatibles Codex, Node.js 24 oder neuer und npm; wissenschaftliche Abhängigkeiten richten Sie nach Bedarf ein.

### Aus dem Quellcode starten

Für Entwicklung oder Fähigkeiten auf `main` benötigen Sie Git, Node.js 24 oder neuer und uv für die Python-Werkzeuge. Führen Sie anschließend die folgenden Schritte aus.

[uv](https://docs.astral.sh/uv/getting-started/installation/)

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

Öffnen Sie die Anmelde-URL aus dem Startprotokoll. Nach der Anmeldung erscheint der Arbeitsbereich im Browser.

### Modell konfigurieren

Tragen Sie unter Einstellungen → Modelle die URL, den Modellnamen und den API-Schlüssel eines Anbieters für OpenAI-compatible Chat Completions ein. Wählen Sie das OpenQuantum Agent Preset. Das Modell muss Tool Calling unterstützen. Bei einer neuen Desktop-Installation ist die Modellliste leer. Fügen Sie den gewünschten Dienst selbst hinzu. Modellzugangsdaten sind von Zugangsdaten zur Quantencloud getrennt.

Das lokale Referenzbeispiel für einen festen Hamiltonoperator mit zwei Qubits benötigt keinen Modellschlüssel.

```bash
npm run demo:quantum-ground-state
```

Bereiten Sie vor der folgenden FatQat-Aufgabe aus dem Quellcode die Umgebung ausdrücklich im Repository-Hauptverzeichnis vor. Dabei können Abhängigkeiten heruntergeladen werden; der Rechenaufruf installiert sie nicht automatisch.

```bash
node scripts/setup-paper-tools.mjs fatqat-workbench
```

Beginnen Sie für Algorithmusbeispiele mit `npm run capability:algorithms:setup -- --minimal`. Ergänzen Sie je nach Methode `--group gradients`, `--group pennylane`, `--group tensor` oder `--group chemistry`; vorhandene Gruppen bleiben erhalten. Ohne Argumente werden weiterhin alle Abhängigkeiten vorbereitet. Die vollständige Umgebung enthält PySCF; unter Windows wird WSL empfohlen. Numerische Prüfungen wurden auf macOS mit CPU durchgeführt. Siehe [Ausführung der Beispiele](../../examples/quantum-algorithms/README.md).

Führen Sie nach einem Quellcode-Update die Vorbereitung für die verwendeten Fähigkeiten erneut aus, starten Sie den Arbeitsbereich neu und öffnen Sie eine neue Sitzung. Vorhandene Python-Umgebungen werden am bisherigen Ort geprüft und synchronisiert. [Umgebungen vorbereiten und aktualisieren](../integrations/LOCAL_ENVIRONMENTS.md).

Nach der Modellkonfiguration können Sie fragen: „Erzeuge mit FatQat einen Bell-Zustand aus zwei Qubits im Nullzustand. Wende H auf q0 an und anschließend CX mit q0 als Kontroll- und q1 als Zielqubit. Vergleiche die exakten Wahrscheinlichkeiten mit 1024 Messungen bei seed=7.“ Ideal sind 00 und 11 jeweils zu 50 % wahrscheinlich. Prüfen Sie die tatsächlichen Werkzeugeingaben und Rechenergebnisse.

### Desktop

Um Desktop aus derselben Arbeitskopie zu bauen, schließen Sie die obige Quellcode-Installation ab und richten Sie Corepack sowie die C++-Build-Werkzeuge des Systems ein.

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop -- --source
```

Web und Desktop teilen die Harness-Daten und -Konfiguration, wenn sie aus derselben Quellcode-Arbeitskopie gestartet werden. Beenden Sie den anderen Host, bevor Sie dasselbe Datenverzeichnis verwenden.

## Quantum Learning

Bereiten Sie die Lernanwendung in derselben Repository-Arbeitskopie vor, aus der Sie OpenQuantum starten.

```bash
npm run learning:ui:setup
```

Öffnen Sie Quantum Learning über die Seitenleiste. Jeder neue Git-Worktree benötigt eine eigene Installation. Bei einer Meldung über eine unvollständige Installation führen Sie den obigen Befehl in diesem Worktree aus und öffnen die Anwendung erneut. Die Kurs-, Unterrichts- und Bearbeitungsfunktionen von OpenMAIC bleiben erhalten. Modellzugriffe laufen über Harness. Unterrichtsdaten werden getrennt vom Sitzungsprotokoll gespeichert.

## Sprachen

Unter Einstellungen → Allgemein → Sprache stehen vereinfachtes Chinesisch, Englisch, Japanisch, Koreanisch, Spanisch, Französisch, Deutsch, Portugiesisch, Russisch und Arabisch zur Auswahl. Die Auswahl bleibt gespeichert und wird mit Quantum Learning synchronisiert. Arabisch wird von rechts nach links angezeigt. Bestehende Gespräche, Kursmaterialien, benutzereigene Skills und Werkzeugausgaben werden nicht übersetzt. Einige native Systemdialoge verwenden außerhalb von Chinesisch und Englisch die englische Fassung.

## Dokumentation und Mitarbeit

Skills liefern Wissen und Abläufe; Tool Providers registrieren ausführbare Werkzeuge. Wissenschaftlich zu prüfende Fähigkeiten nutzen unabhängige Validatoren und Nachweise zur Bestimmung der Akzeptanz. OpenQuantum verwendet die Laufzeit von DeepSeek Harness. Die englische und chinesische Ausgabe enthalten ausführliche Nutzungs- und Erweiterungsanleitungen.

Entwickeln wir gemeinsam vertrauenswürdige KI für die Quantenforschung. Alle können Probleme melden, Code oder Werkzeuge beitragen sowie Methoden und Reproduktionsbeispiele teilen.

[English](./README.en.md) · [中文](../../README.md) · [Documentation](../README.md) · [Contributing](../../CONTRIBUTING.md) · [Issues](https://github.com/xi-zhao/openQuantum/issues)

```bash
npm run harness:config
npm run desktop:check
npm run check
```

## Langfristige Ziele und RSI

Wir untersuchen das Zusammenspiel von Quantencomputing, HPC und KI, weitere Anwendungen und Lehrangebote sowie die Verbesserung von Forschungsmethoden. Rekursive Selbstverbesserung (RSI) ist ein Forschungsziel; der beschriebene Kreislauf ist noch nicht umgesetzt. Dafür sind unabhängige Prüfungen, Vergleiche mit neuen Aufgaben, Gesamtkosten, Nutzerfreigaben und die Rückkehr zu früheren Versionen vorgesehen.

[Ausführliche Roadmap](../../README.md#rsi).

## Lizenz

Der eigene Code von OpenQuantum steht unter der MIT-Lizenz. DeepSeek Harness, OpenMAIC und die Quantenprojekte behalten ihre Urheberangaben und Lizenzen. Lesen Sie Third-party notices vor einer Weiterverteilung oder der Aktivierung optionaler Integrationen.

[MIT](../../LICENSE) · [Third-party notices](../../THIRD_PARTY_NOTICES.md)
