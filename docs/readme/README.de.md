<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>Bringen Sie Ihre Quantenideen zum Laufen.</strong><br /><sub>Eine offene Plattform für Quanten-Agenten und Anwendungen</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum vereint Quantenwerkzeuge, Fachmethoden und vollständige Anwendungen. Sie können einen KI-Agenten mit Berechnungen beauftragen, integrierte Anwendungen nutzen oder eigene Algorithmen und Dienste einbinden. Modelldienste und Rechenressourcen werden unabhängig voneinander konfiguriert.

**Fragen stellen, Berechnungen ausführen und gemeinsam neue Fähigkeiten entwickeln.**

![OpenQuantum Desktop](../images/openquantum-desktop-20260919.jpg)

## Funktionen

Qiskit und TyxonQ ermöglichen Schaltungssimulationen, PyZX die Optimierung, Graphix messbasiertes Quantenrechnen, Symmer die Reduktion anhand von Symmetrien und PauLie die Analyse von Lie-Algebren. TeNPy, SQD und Flow-VQE behandeln Grundzustände und Chemie. Mitiq dient der Fehlerminderung; Stim, PyMatching, Deltakit und BP+LSD unterstützen Fehlerkorrektur. Dynamiqs, OQuPy, TJM und Clifft untersuchen Dynamik und Rauschen. FatQat bietet Experimente mit supraleitenden und atomaren Systemen. Hinzu kommen die Gerätesuche mit FieldQKit und die Lernanwendung Quantum Learning.

Der Quellcode auf `main` enthält auch Gate-Cutting und die Rekonstruktion von Erwartungswerten mit QCut, Schaltungsoptimierung mit Compact und angeregte Zustände per VQD mit OpenQARP. Diese Verbindungen sind standardmäßig aktiviert; ihre Abhängigkeiten müssen vorbereitet werden. Das Winkelkernel-QSVM von cqlib-qml und die Schaltungswerkzeuge von FlagQuantum sind standardmäßig deaktiviert und werden bei Bedarf eingeschaltet. Siehe [Umfang und Prüfungen](../integrations/CANDIDATE_LIBRARIES.md).

Der aktuelle Quellcode enthält **101 Skills** (88 automatisch auswählbar, 13 manuelle Kategorieindizes), **37 MCP-Verbindungen** und **220 konfigurierbare Tool-Namen**. Dies ist der Konfigurationsbestand, nicht die Zahl gleichzeitig verfügbarer Werkzeuge. Bestehende Namen bleiben erhalten; gemeinsame Auswahlregeln stehen im [Auswahlleitfaden](../integrations/CAPABILITY_SELECTION.md).

Alle **66 quantum-skills-Anleitungen** von UnitaryLab sind als native Skills adaptiert. **49 ausführbare Beispiele** decken die **39 ursprünglichen Algorithmusmodule** und weitere Methoden aus den Anleitungen ab. Sie verwenden Qiskit, PennyLane, quimb, PySCF und NumPy/SciPy ohne proprietäre UnitaryLab-Laufzeit. Eine vollständige API-Kompatibilität wird damit nicht zugesagt; Unterschiede sind in der [Abdeckungstabelle](../integrations/UNITARYLAB_OPEN_COVERAGE.md) dokumentiert.

Hinzu kommen Trotter-/qDrift-Simulationen von Pauli-Hamiltonoperatoren sowie [Qiskit/Cirq-Konvertierung mit qBraid, Messwerte und rohe Paritäten mit Clifft und QDMI-Abfragen über einen konfigurierten C-Treiber](../integrations/QUANTUM_INTEROP.md). Daten des QDMI-Beispieltreibers beschreiben keine tatsächlich erreichbare QPU.

Jede Integration hat eigene Abhängigkeiten und einen begrenzten wissenschaftlichen Geltungsbereich. Eine lokale Berechnung belegt keine Leistung realer Hardware. Ein abgeschlossener Werkzeugaufruf bedeutet auch nicht automatisch eine bestandene wissenschaftliche Prüfung.

## Warum OpenQuantum

**Von der Frage zur Berechnung.** Beschreiben Sie eine unterstützte Aufgabe in natürlicher Sprache; der Agent ruft die passenden Fachwerkzeuge auf. Sie bestimmen Eingaben und physikalische Annahmen und beurteilen die Ergebnisse.

**Jede Untersuchung als Ausgangspunkt.** Der Arbeitsbereich hält Werkzeugeingaben und Ergebnisse fest, sodass Sie mit anderen Parametern weiterarbeiten können. Wissenschaftliche Prüfungen richten sich nach dem Umfang der jeweiligen Fähigkeit.

**Eigene Methoden für andere nutzbar machen.** Sie können Skills, Rechenwerkzeuge, Lehrmaterialien und Anwendungen ergänzen. Modelle und Rechenressourcen werden getrennt konfiguriert; Urheberschaft und Lizenzen der eingebundenen Projekte bleiben sichtbar.

## Schnellstart

Für die lokale Nutzung durch eine einzelne Person stehen ein Desktop-Installationspaket und der Start aus dem Quellcode zur Wahl.

### Desktop-Installationspaket

Laden Sie das Paket für Mac (Apple Silicon / Intel) oder Windows von [GitHub Releases](https://github.com/xi-zhao/OpenQuantum/releases/latest) herunter. Node.js und uv sind enthalten; ein eigener Quellcode-Build ist nicht erforderlich. Es handelt sich um unsignierte Testversionen. Folgen Sie der [Installationsanleitung](../DESKTOP_INSTALLERS.md), öffnen Sie die Anwendung und konfigurieren Sie ein Modell. Beachten Sie die Vorbereitungsschritte für Rechenkomponenten und Quantum Learning in der jeweiligen Version.

Die [Installationspakete v0.5.1](../releases/v0.5.1.md) enthalten weder die später zu `main` hinzugefügten Fähigkeiten noch die [Updates der Quantenbibliotheken vom 22. September](../releases/2026-09-22-quantum-upstream-update.md). Änderungen am Quellcode aktualisieren eine installierte Anwendung nicht automatisch. Auch die Algorithmusanpassungen, Interoperabilitätsfunktionen und die [Neuordnung der Erweiterungen](../architecture/EXTENSION_GOVERNANCE.md) vom 24. September sind Quellcode-Updates und nicht in v0.5.1 enthalten.

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

Tragen Sie unter Einstellungen → Modelle die URL, den Modellnamen und den API-Schlüssel eines Anbieters für OpenAI-compatible Chat Completions ein. Wählen Sie das OpenQuantum Agent Preset. Das Modell muss Tool Calling unterstützen. Die mitgelieferten .invalid-Adressen sind Platzhalter und müssen durch einen echten Dienst ersetzt werden. Modellzugangsdaten sind von Zugangsdaten zur Quantencloud getrennt.

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
npm run desktop
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
