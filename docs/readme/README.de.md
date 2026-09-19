<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>Eine offene Plattform für Quanten-Agenten und Anwendungen</strong></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum vereint Quantenwerkzeuge, Fachmethoden und vollständige Anwendungen. Sie können einen KI-Agenten mit Berechnungen beauftragen, integrierte Anwendungen nutzen oder eigene Algorithmen und Dienste einbinden. Modelldienste und Rechenressourcen werden unabhängig voneinander konfiguriert.

![OpenQuantum Desktop](../images/openquantum-desktop-20260919.jpg)

## Funktionen

Qiskit und TyxonQ ermöglichen Schaltungssimulationen, PyZX die Optimierung, Graphix messbasiertes Quantenrechnen, Symmer die Reduktion anhand von Symmetrien und PauLie die Analyse von Lie-Algebren. TeNPy, SQD und Flow-VQE behandeln Grundzustände und Chemie. Mitiq dient der Fehlerminderung; Stim, PyMatching, Deltakit und BP+LSD unterstützen Fehlerkorrektur. Dynamiqs, OQuPy, TJM und Clifft untersuchen Dynamik und Rauschen. FatQat bietet Experimente mit supraleitenden und atomaren Systemen. Hinzu kommen die Gerätesuche mit FieldQKit und die Lernanwendung Quantum Learning.

Jede Integration hat eigene Abhängigkeiten und einen begrenzten wissenschaftlichen Geltungsbereich. Eine lokale Berechnung belegt keine Leistung realer Hardware. Ein abgeschlossener Werkzeugaufruf bedeutet auch nicht automatisch eine bestandene wissenschaftliche Prüfung.

## Schnellstart

Die aktuelle Distribution startet aus dem Quellcode und ist für lokale Einzelnutzung und Entwicklung vorgesehen. Benötigt werden Git, Node.js 24 oder neuer sowie uv für die Python-Werkzeuge.

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

Nach der Modellkonfiguration können Sie fragen: „Erzeuge mit FatQat einen Bell-Zustand aus zwei Qubits im Nullzustand. Wende H auf q0 an und anschließend CX mit q0 als Kontroll- und q1 als Zielqubit. Vergleiche die exakten Wahrscheinlichkeiten mit 1024 Messungen bei seed=7.“ Ideal sind 00 und 11 jeweils zu 50 % wahrscheinlich. Prüfen Sie die tatsächlichen Werkzeugeingaben und Rechenergebnisse. Beim ersten Aufruf können Abhängigkeiten heruntergeladen werden.

### Desktop

```bash
npm run desktop:setup
npm run desktop
```

Web und Desktop verwenden dieselbe Harness-Zusammenstellung. Beenden Sie den anderen Host, bevor Sie dasselbe Datenverzeichnis verwenden.

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

## Lizenz

Der eigene Code von OpenQuantum steht unter der MIT-Lizenz. DeepSeek Harness, OpenMAIC und die Quantenprojekte behalten ihre Urheberangaben und Lizenzen. Lesen Sie Third-party notices vor einer Weiterverteilung oder der Aktivierung optionaler Integrationen.

[MIT](../../LICENSE) · [Third-party notices](../../THIRD_PARTY_NOTICES.md)
