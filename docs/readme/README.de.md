<h1 align="center">
  <img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" />
</h1>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

**Hinweis zu Desktop 0.8.5:** Die eigenständige OpenQuantum-App für macOS auf Apple Silicon kehrt zur einfachen Oberfläche von DSH Desktop 2.0.0 / Harness 0.1.0-rc.6 zurück. Die Oberfläche bietet vorerst Chinesisch und Englisch; vorhandene Übersetzungen und README-Dateien bleiben erhalten. Die folgenden Angaben zu 0.8.4 beschreiben die frühere Veröffentlichung. Aktuelle Installationshinweise und Einschränkungen der Signierung stehen in der [Installationsanleitung](../DESKTOP_INSTALLERS.md). Das veröffentlichte Codex-Plugin bleibt bei 0.8.4.

<p align="center">
  <strong>OpenQuantum — Gemeinsam vertrauenswürdige KI für die Quantenforschung entwickeln.</strong><br />
  <sub>Das Fachwissen der Quantenforschung, vereint in OpenQuantum</sub>
</p>

<p align="center">
  <a href="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml"><img src="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml/badge.svg" alt="CI-Status" /></a>
  <a href="../../THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/licenses-MIT%20%2B%20component%20licenses-111111.svg" alt="MIT- und Komponentenlizenzen" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a.svg" alt="Node.js 24 oder neuer" />
</p>

OpenQuantum ist eine Open-Source-KI-Plattform für die Quantenforschung, offen für gemeinsame Weiterentwicklung. Sie verbindet Software, Algorithmen und veröffentlichte Forschung aus der Open-Source-Community, damit KI Ihre Forschungsfrage analysieren, Methoden auswählen, Berechnungen ausführen und Ergebnisse prüfen kann. So wird gemeinsames Fachwissen zu einer Forschungsfähigkeit, die Sie tatsächlich nutzen können.

Beginnen Sie mit einer Forschungsfrage, einem Paper oder einem vorhandenen Programm und beziehen Sie KI in die Untersuchung ein. Programme, Parameter und Prüfungen bleiben erhalten, sodass jede Untersuchung zum Ausgangspunkt der nächsten wird.

Wählen Sie den Zugang, der zu Ihnen passt; beide nutzen dieselben Fachfunktionen. Das **[Codex-Plugin](../integrations/CODEX_PLUGIN.md)** bringt Quanten-Skills und wissenschaftliche Tools in native Codex-Unterhaltungen, mit einer Einstellungsseite für Funktionsschalter, MCP-Verbindungen und Tokens. **Desktop** enthält die Forschungs-Workbench und die separate Anwendung Quantum Learning; die Modelldienste konfigurieren Sie selbst.

**[Codex-Plugin installieren](#codex)** · [Desktop installieren](#desktop-installer) · [Berechnungen und Ergebnisse ansehen](#use-and-inspect-results) · [Website besuchen](https://xi-zhao.github.io/OpenQuantum/)

**Beginnen Sie mit den gemessenen Fällen:** Ein [Pauli-Kommutator mit PennyLane](#pennylane-rust-case) läuft als vollständiger Aufruf **5,09×** schneller, eine [Wigner-Funktion mit QuTiP](#qutip-rust-case) **5,69×** schneller. Für beide liegen Leistungsvergleiche, Ergebnisprüfungen und Reproduktionsprotokolle vor.

**Aktuelle Version 0.8.4:** [Desktop-Download und Versionshinweise](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) · [Codex-Plugin-Download und Versionshinweise](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4). Beide haben dieselbe Produktversion.

- **Funktionen leichter finden:** Tools, MCP und Skills sind in acht Nutzungskategorien gegliedert, mit Suche und Statusfiltern.
- **Ein Startsymbol mit eigener Marke:** `OpenQuantum.app` auf dem Mac und `OpenQuantum.lnk` unter Windows tragen das OpenQuantum-Symbol; die ursprüngliche Oberfläche von DSH Desktop, Quantum Learning und die Update-Funktion bleiben erhalten.

<p align="center">
  <a href="#why-openquantum">Warum OpenQuantum</a> ·
  <a href="#optimization-cases">Gemessene Optimierungen</a> ·
  <a href="#what-you-can-do">Funktionen</a> ·
  <a href="#codex">Codex-Plugin</a> ·
  <a href="#quick-start">Schnellstart</a> ·
  <a href="#use-and-inspect-results">Ergebnisse</a> ·
  <a href="#extend-the-platform">Erweitern</a> ·
  <a href="#roadmap-and-rsi">Roadmap und RSI</a> ·
  <a href="#documentation-and-support">Mitwirken</a> ·
  <a href="#license-and-acknowledgments">Open Source</a>
</p>

<p align="center">
  <img src="../images/openquantum-desktop-20261013.jpg" width="100%" alt="OpenQuantum-Workbench im originalen DSH Desktop: Marke, neue Sitzung, Quantum Learning und Hinweis zum Hinzufügen eines eigenen Modells" /><br />
  <sub>Die vertraute Originaloberfläche von Desktop. Fügen Sie in den Einstellungen Ihren eigenen Modelldienst hinzu, um eine neue Sitzung zu starten.</sub>
</p>

<details>
<summary><strong>Kategorisierte Einstellungen für Tools, MCP und Skills ansehen</strong></summary>

Klappen Sie die benötigte Gruppe auf und grenzen Sie sie mit der Suche oder dem Filter für den Aktivierungsstatus ein. Tools listet aufrufbare Aktionen, MCP verwaltet Dienstverbindungen, und Skills wählt Methoden und Anleitungen für Aufgaben aus.

![Nach Nutzung gruppierte MCP-Verbindungen mit Suche und Statusfiltern in Desktop](../images/openquantum-settings-categories-20261013.jpg)

Der Screenshot entstand am 2026-10-13 bei der Prüfung der Kategorien im Originalclient; siehe die [Bildhinweise](../images/README.md). Eine aktivierte Einstellung bedeutet nicht, dass der Dienst online ist.

</details>

<a id="why-openquantum"></a>

## Warum OpenQuantum

### Breite Abdeckung gibt Forschungsideen Raum

Von Quantenalgorithmen und Schaltungssimulation bis zu Quantenchemie, Vielteilchenrechnungen und Fehlerkorrektur erschließt OpenQuantum laufend weitere Fachgebiete und verbindet Werkzeuge mit Methoden. Forschende verbringen weniger Zeit mit der Vorbereitung von Werkzeugen und mehr mit ihren Fragen. Community-Projekte wie Qiskit, PennyLane, QuTiP, PyZX, TeNPy und Stim / PyMatching liefern das Fachwissen hinter diesen Bereichen.

### Schnellere Berechnungen lassen mehr Ideen zu

Wir optimieren fortlaufend zentrale Rechenschritte, um Wartezeiten zu verkürzen und Raum für mehr Vergleiche zu schaffen. In gezielten Optimierungsfällen wurden die vollständigen Aufrufe für einen [Pauli-Kommutator mit PennyLane](#pennylane-rust-case) und eine [Wigner-Funktion mit QuTiP](#qutip-rust-case) **5,09×** beziehungsweise **5,69×** schneller. Beide Ergebnisse wurden mit der ursprünglichen Bibliothek und unabhängigen Referenzrechnungen verglichen.

### Offene Zusammenarbeit lässt Forschungsfähigkeiten wachsen

Wir binden fortlaufend wertvolle Open-Source-Projekte und veröffentlichte Methoden ein und verbessern sie durch Anpassung, Optimierung und praktischen Einsatz. Rund um diese Arbeit entwickelt OpenQuantum Agenten-Workflows, Rechenschnittstellen und Prüfprotokolle, sodass neue Werkzeuge, Methoden und Erfahrungen die Plattform stetig erweitern. Alle sind eingeladen, [mitzuwirken](#documentation-and-support) und das Fachwissen der Community in KI für die Quantenforschung zu verwandeln, die Forschende nutzen, prüfen und der sie vertrauen können.

### Ausgangspunkt ist Ihre Arbeit

| Ihre Arbeit | Die Schwierigkeit | Was OpenQuantum beiträgt |
| --- | --- | --- |
| **Forschung und Algorithmenentwicklung** | Eine neue Idee zu testen heißt oft, Methoden neu zu implementieren, Baselines zu suchen und Ergebnisse immer wieder zu prüfen. | Starten Sie mit Algorithmusbeispielen und Fach-SDKs, ändern Sie Eingaben, bauen Sie Vergleiche auf, nutzen Sie die unterstützten unabhängigen Prüfungen und bewahren Sie wiederverwendbare Programme und Ergebnisse auf. Siehe [Ergebnisse](#use-and-inspect-results). |
| **Anwendungs- und Agentenentwicklung** | Sie möchten Quantencomputing in eine bestehende Anwendung einbauen, doch es fehlen Fachmethoden und ein nutzbarer Aufrufweg. | Binden Sie vorhandene Skills, Tools und native SDKs an, damit Ihre Anwendung Fachsoftware nutzt und dabei ihre eigene Oberfläche und ihren Ablauf behält. Siehe [Plattform erweitern](#extend-the-platform). |
| **Industrielle F&E und Technologiebewertung** | Sie haben eine Anwendungsrichtung und brauchen Belege, um Methoden zu wählen, Ressourcen abzuschätzen und eine Roadmap zu planen. | Führen Sie erste Vergleiche bei unterstützten Aufgaben durch und prüfen Sie Methodenbedingungen, Ressourcenannahmen und Ergebnisquellen. Siehe [Referenzmaterial und Auswahl](#reference-material-and-selection). |
| **Lehre und Kursgestaltung** | Abstrakte Konzepte in praxisnahe Kurse zu verwandeln ist schwer, wenn Materialien, Experimente und Folien verstreut sind. | Entwerfen Sie Experimente aus offenen Beispielen und organisieren Sie Materialien und Kursunterlagen mit Quantum Learning. Funktionen und Kursstand finden Sie unter [Quantum Learning](#quantum-learning). |
| **Lernen durch Ausprobieren** | Sie verstehen die Konzepte, wissen aber noch nicht, wie man einen Algorithmus ausführt, Eingaben ändert und Ergebnisse deutet. | Führen Sie Beispiele aus, ändern Sie Parameter und nutzen Sie Anleitungen und verfügbare Referenzergebnisse, um zu sehen, warum eine Methode greift und wo sie an Grenzen stößt. Siehe [Algorithmusbeispiele](#algorithm-learning-and-method-comparison). |
| **Forschungssoftware und Ökosysteme** | Sie haben eine veröffentlichte Methode, Forschungscode oder ein SDK und brauchen Workflows, Schnittstellen und Beispiele, damit andere es nutzen können. | Beschreiben Sie die Methode als Skill, binden Sie ausführbare Aktionen als Tools an oder integrieren Sie eine vollständige Anwendung, mit erhaltenen Quellen und Urheberangaben. Siehe [Plattform erweitern](#extend-the-platform). |

### Open Source: Die Kontrolle bleibt in Ihrer Hand

Sie können den Code der Plattform und der Integrationen lesen, nachvollziehen, woher jede Methode stammt, und Ihre eigene Kombination unter den geltenden Lizenzen ändern, bereitstellen und pflegen. Modelldienste und Rechen-Backends wählen Sie getrennt, und Sie entscheiden, ob Sie Forschungsdaten teilen. Autorinnen und Autoren, Lizenzen und Beiträge bleiben sichtbar, sodass bestehende Arbeit mit dem Projekt weiterlebt.

### Umfassend: mehr Methoden für eine Frage

OpenQuantum vereint Software und Forschungsmethoden für Algorithmen, Kompilierung, Simulation, Quanteninformation, Chemie und Vielteilchenphysik, Optimierung, Fehlerkorrektur, Dynamik, Steuerung und Netzwerke. Von Anleitungen und offenen Beispielen bis zu nativen SDKs und Rechen-Tools wählen Sie, was eine Aufgabe braucht, oder kombinieren Werkzeuge zu neuen Vergleichen. Eingaben, Vorbereitung und unterstützter Umfang stehen im [Funktionskatalog](#what-you-can-do).

Optimieren Sie zum Beispiel eine Schaltung mit PyZX, prüfen Sie die Äquivalenz mit QCEC und untersuchen Sie ihr Verhalten unter Rauschen mit einem Rauschsimulator, um zu klären, ob eine einfachere Schaltung auch besser abschneidet. Auch kombinierte Werkzeuge erfordern abgestimmte Modelle, Einheiten, Bitreihenfolgen und Budgets; den aktuellen Umfang beschreibt der [Rechenleitfaden](../integrations/SCALABLE_BRIDGES.md).

<a id="give-ai-access-to-specialist-research-capabilities"></a>

### KI Zugang zu fachlichen Forschungsfähigkeiten geben

Agenten können Material lesen, Programme schreiben und Werkzeuge aufrufen. Mit installiertem OpenQuantum bereiten Sie die Abhängigkeiten und Diensteinstellungen vor, die eine unterstützte Aufgabe braucht, und die KI kann Quantenmethoden und Rechenfähigkeiten nutzen. Skills beschreiben Methoden und Schritte, Tools führen konkrete Aktionen aus, und native SDKs lassen sich auch über die Code-Werkzeuge des Hosts verwenden.

Programme, Ergebnisse und zutreffende Prüfungen werden protokolliert, sodass spätere Arbeit darauf aufbauen kann. Gut belegte negative Ergebnisse sind ebenfalls wertvoll: Sie zeigen, wann eine Methode greift und wann ein anderer Weg nötig ist. Programmfehler und wissenschaftliche Ergebnisse sind getrennte Ausgänge; die Protokolle unterstützen [Prüfung und Wiederverwendung](#execution-records-and-scientific-acceptance), das wissenschaftliche Urteil bleibt bei Ihnen.

**Open-Source-Bibliotheken und veröffentlichte Methoden in nutzbare Agentenfähigkeiten zu verwandeln, ist die fortlaufende Arbeit hinter der Plattform.** Wir ordnen Methoden, schreiben Workflows, binden Software an und bewahren Quellen und Nutzungsbedingungen. Sie können eigene Methoden, Programme oder vollständige Anwendungen einbringen, sodass eine Entwicklung zum Ausgangspunkt für viele wird.

Diese gesammelte Arbeit legt auch die Grundlage dafür, [die nächste Generation von Forschungsfähigkeiten zu verbessern](#research-that-improves-how-research-is-done), wie in der langfristigen Roadmap beschrieben.

**[Erste Aufgabe ausführen](#quick-start)** · [Eigene Methoden einbringen](#extend-the-platform)

<a id="optimization-cases"></a>
<a id="pennylane-rust-case"></a>

## Gemessener Fall: eine 5,09× schnellere PennyLane-Berechnung

**Eine Forschungsaufgabe stellen und ein lauffähiges, prüfbares Ergebnis erhalten.** Wir haben OpenQuantum eine Aufgabe gegeben: eine Forschungsberechnung in PennyLane gezielt optimieren, die tatsächliche Beschleunigung messen und die Ergebnisse prüfen. Am 2026-10-20 wurde das Experiment in Codex mit OpenQuantum 0.8.4 abgeschlossen; geliefert wurden ein optimiertes Programm, ein Leistungsvergleich, Korrektheitsprüfungen und Reproduktionsprotokolle.

| Berechnung | Vollständiger Aufruf |
| --- | ---: |
| Natives PennyLane | 30,62 ms |
| Nach der Optimierung durch OpenQuantum | **6,02 ms** |

**5,09× schneller im vollständigen Aufruf.** Gemessen wurde eine Pauli-Kommutatorberechnung in einem lokalen Modell mit 32 Qubits. Die Zeiten sind Mediane aus neun Warmläufen auf einem Apple M4 mit PennyLane 0.45.1. Sie enthalten die Ein- und Ausgabekonvertierung, nicht aber Umgebungsvorbereitung und Kompilierung.

**Auch die Ergebnisse wurden geprüft.** Die Ausgaben für alle neun Benchmark-Eingaben stimmen Term für Term exakt mit den Referenzausgaben von PennyLane überein. Unabhängige vollständige Matrixrechnungen prüften **4368 Paare von Pauli-Strings** und 40 zufällige Operatorsummen mit komplexen Koeffizienten; der maximale absolute Matrixfehler beträgt **1,42 · 10⁻¹⁴**. Berechnungen und Zeitmessungen wurden unabhängig begutachtet; alle **405 rohen Zeitmessungen** sowie vollständige Ein- und Ausgaben sind archiviert.

Der Wert 5,09× ist der für diese Berechnung gemessene Gewinn. Der Fallbericht enthält alle Ergebnisse, Methoden und den unterstützten Umfang.

[Vollständiger Fall und Reproduktionsschritte](../../experiments/pennylane-rust-commutator/README.md) · [Rohe Zeitmessungen](../../experiments/pennylane-rust-commutator/results/raw-timings.csv) · [Ergebnisprüfungen](../../experiments/pennylane-rust-commutator/results/validation.json) · [Unabhängige Begutachtung](../../experiments/pennylane-rust-commutator/results/review.md)

<a id="qutip-rust-case"></a>

## Gemessener Fall: eine 5,69× schnellere QuTiP-Berechnung

**Eine Fachmethode in eine schnellere, prüfbare Berechnung verwandeln.** In Codex mit OpenQuantum 0.8.4 haben wir die Wigner-Funktionsberechnung von QuTiP gezielt optimiert und ein lauffähiges Programm, die vollständige Phasenraumausgabe, einen Leistungsvergleich und unabhängige Prüfungen geliefert.

| Berechnung | Vollständiger Aufruf |
| --- | ---: |
| Standardmethode von QuTiP | 171,77 ms |
| Nach der Optimierung durch OpenQuantum | **30,18 ms** |

**5,69× schneller im vollständigen Aufruf.** Die Aufgabe berechnet die Wigner-Funktion einer Dichtematrix in einem **64-dimensionalen Fock-Raum einer einzelnen Mode auf einem Phasenraumgitter von 201×201 Punkten**. Die Zeiten sind Mediane aus neun verschachtelten Warmläufen auf einem Apple M4 mit QuTiP 5.3.1 und Einzelthread-Einstellungen. Sie umfassen Einlesen, Konvertierung und Validierung der Eingabe sowie die vollständige Ausgabe in doppelter Genauigkeit; Umgebungsvorbereitung, Kompilierung und Ergebnisprüfungen liegen außerhalb der Messung.

**Alle 272 Ergebnisprüfungen bestanden.** Über vier Größen beträgt die maximale absolute Abweichung von der Standardausgabe von QuTiP **6,52 · 10⁻¹⁶**, von unabhängigen Laguerre-Polynomsummen und analytischen Formeln **6,33 · 10⁻¹⁵**. Die Prüfungen umfassen zufällige komplexe Dichtematrizen, Vakuum- und Fock-Zustände, Superpositionen mit komplexen Kohärenzen sowie abgelehnte Eingaben. Alle **144 rohen Zeitmessungen** sowie vollständige Ein- und Ausgaben sind archiviert und wurden unabhängig begutachtet.

[Vollständiger Fall und Reproduktionsschritte](../../experiments/qutip-rust-wigner/README.md) · [Rohe Zeitmessungen](../../experiments/qutip-rust-wigner/results/raw-timings.csv) · [Ergebnisprüfungen](../../experiments/qutip-rust-wigner/results/validation.json) · [Unabhängige Begutachtung](../../experiments/qutip-rust-wigner/results/review.md)

<a id="what-you-can-do"></a>

## Was Sie tun können

Wählen Sie ein Gebiet und nennen Sie der Workbench Ihre Frage, Ihre Eingaben und die Ergebnisse, die geprüft werden sollen. Der OpenQuantum-Agent folgt der Methode im passenden Skill und ruft das zugehörige Tool zur Berechnung auf; Quantum Learning bietet eine eigene Lernoberfläche.

[Algorithmen](#algorithm-learning-and-method-comparison) · [Schaltungen und Quanteninformation](#circuits-and-quantum-information) · [Grundzustände, Chemie und Optimierung](#ground-states-chemistry-and-optimization) · [Fehlerminderung und -korrektur](#error-mitigation-and-error-correction) · [Hamilton-Simulation und offene Systeme](#hamiltonian-simulation-and-open-systems) · [Experimente und Hardware](#experiment-simulation-and-hardware) · [Photonik und Netzwerke](#photonics-and-quantum-networks) · [Referenzmaterial](#reference-material-and-selection) · [Quantum Learning](#quantum-learning)

Lokale Berechnungen funktionieren ohne Konto bei einer Quantencloud. Echte Hardware und kostenpflichtige Dienste werden bei Bedarf eingerichtet; Eingabebereich, Vorbereitung und Prüfstatus jeder Methode stehen im ausführlichen Katalog.

Der aktuelle Quellcode bietet vollständige Zugänge zu nativen APIs in **115 SDK- und Quellcodeumgebungen**, davon 26 aus der jüngsten, mit 0.8.4 ausgelieferten [Ökosystem-Erweiterung](../integrations/SDK_ECOSYSTEM_2026-10-14.md). Agenten können eigene Programme schreiben, öffentliche APIs kombinieren und vollständige Ergebnisse speichern – über die vorgegebenen Fälle der vorkonfigurierten Tools hinaus.

SlowQuant ergänzt molekulare lineare Antwort und Übergangseigenschaften über ein festgelegtes Quellcode-SDK. [Einrichtung und Prüfgrenzen](../integrations/SLOWQUANT.md); molekulare Qiskit-qLR und Hardware sind noch nicht validiert.

**Formale Mathematik und Physik:** [Lean 4, mathlib und physlib](../../.agents/skills/lean-physics/SKILL.md) prüfen Beweise und ihre Axiome mit einem auf Lean 4.35.0 festgelegten Projekt. Die ausdrückliche Vorbereitung erstellt das kleine Pauli-Beispiel samt Imports; weitere Module werden nach Bedarf vorbereitet. Die Beweisprüfung installiert keine Abhängigkeiten. Ein Beweis gilt für die angegebenen Definitionen und Annahmen, nicht für die physikalische Gültigkeit eines Modells oder dessen wissenschaftliche Abnahme.

**DEM-Diagnose:** [emlint](../../.agents/skills/emlint-dem-audit/SKILL.md) untersucht Stim-Detektorfehlermodelle in einer ausdrücklich vorbereiteten SDK-Umgebung. Berichte bewahren Gegenbeispiele, übersprungene Prüfungen sowie unbestimmte oder leere Ergebnisse. Die Strukturprüfungen beweisen weder Codedistanz noch korrekte Dekodierung oder wissenschaftliche Validität.

Jede Umgebung wird pro Aufgabe ausdrücklich vorbereitet; Grenzen von Plattformen, Konten, Lizenzen und optionalen Backends gelten weiterhin. Technische Prüfungen je Bibliothek stehen im [Protokoll zum vollständigen SDK-Zugang](../integrations/FULL_SDK_ACCESS.md); diese Umgebungen haben an realen Forschungsaufgaben noch keine wissenschaftliche Abnahme durchlaufen (die Feststellung, dass ein Ergebnis anhand unabhängiger Prüfungen und lückenloser Herkunftsnachweise wissenschaftlich belastbar ist), ihr wissenschaftlicher Status bleibt `not_evaluated`.

Die in v0.6.0 integrierten SDKs von Unternehmen und Forschungseinrichtungen umfassen differenzierbare Schaltungen, Ressourcenschätzung für Fehlertoleranz, Photonik, Pulskompilierung und Quantennetzwerke. Die drei Gruppen sind [17 Anbieter-SDKs](../integrations/VENDOR_SDKS.md), [20 Funktionen von Unternehmen und Forschungseinrichtungen](../integrations/SDK_EXPANSION.md) und [15 Schnittstellen für Netzwerke, Steuerung und Cloud](../integrations/SDK_GAPS.md), dazu [QuEra Bloqade Analog](../integrations/BLOQADE_ANALOG.md). Jeder Adapter bietet nur seine dokumentierten Aktionen; Konten, Zugangsdaten, Dienstberechtigungen und Lizenzen richten Nutzende selbst ein.

<a id="algorithm-learning-and-method-comparison"></a>

### Algorithmen lernen und Methoden vergleichen

Beginnen Sie mit lauffähigen Algorithmusbeispielen, ändern Sie Eingaben und prüfen Sie numerische Ergebnisse; übertragen Sie die Methode dann auf Ihr eigenes Problem. Die **66 quantum-skills-Anleitungen** von UnitaryLab sind als native Skills adaptiert: **49 bieten ausführbare Beispiele**, die alle **39 Module** der ursprünglichen Algorithmenbibliothek sowie anleitungsspezifische Methoden abdecken; die übrigen unterstützen Algorithmenklassifikation, Backend-Auswahl und Migration.

| Richtung | Lauffähige Methoden und Beispiele |
| --- | --- |
| Grundlagen und Suche | QFT, QPE, Hadamard-Test, Amplitudenverstärkung und -schätzung, Grover, Shor, Simon, diskreter Logarithmus und Quantenirrfahrten auf Graphen |
| Lineare Systeme und Matrixmethoden | HHL, VQLS, lineares Lösen mit QSVT, adiabatisches Lösen, LCU und QSP, mit klassischen Eigenlöser-Referenzen |
| Hamilton-Simulation | Trotter–Suzuki, qDrift, QSP, Taylor-LCU und ein Cartan-Beispiel mit offengelegten Ersetzungen |
| Variationelles Rechnen und maschinelles Lernen | VQE, VQD, QAOA, VQC, QCBM, CVQNN, Gradienten und Quanten-Fisher-Information |
| Zustandspräparation und Vielteilchenphysik | Möttönen-, MPS-, Isometrie- und variationelle Zustandspräparation; molekulares DMRG, Fermi–Hubbard-VQE und Ising-Zeitentwicklung |
| Codekonstruktion und Differentialgleichungen | Konstruktion von qLDPC-Codes und Syndrome; Schrödingerisierungsbeispiele für ein- und zweidimensionale Wärmeleitungsgleichungen und periodische Advektion |

Die Beispiele verwenden offene Backends wie Qiskit, PennyLane, quimb, PySCF und NumPy/SciPy. Führen Sie sie direkt aus oder lassen Sie den Agenten sie über vorhandene Code-Werkzeuge aufrufen. Die Standardparameter sind Lehrbeispiele; prüfen Sie reale Eingaben, Referenzfehler und Konvergenz für jede Aufgabe.

Die Adaption bewahrt Upstream-Quellen und -Lizenzen und benötigt keine proprietäre UnitaryLab-Laufzeit. Eine Abdeckung der Workflows bedeutet keine vollständige Kompatibilität mit der Python-API, den Optimierern oder Backends des Upstream-Projekts; Unterschiede etwa bei Cartan, CVQNN und DMRG stehen in der [Abdeckungstabelle je Methode](../integrations/UNITARYLAB_OPEN_COVERAGE.md) und der [Beispielanleitung](../../examples/quantum-algorithms/README.md).

[Algorithmusbeispiel ausführen](#run-an-algorithm-example-directly) · [Zwischen ähnlichen Methoden wählen](../integrations/CAPABILITY_SELECTION.md)

<a id="circuits-and-quantum-information"></a>

### Schaltungen und Quanteninformation

| Richtung | Aufgaben, die Sie starten können | Ergebnisse, die Sie prüfen können |
| --- | --- | --- |
| Quantenschaltungen | OpenQASM- / QPY-Schaltungen analysieren oder konvertieren, Transpilierung vergleichen, Äquivalenz prüfen, Schaltungen simulieren | Schaltungsstruktur, transpilierte Ausgabe, Äquivalenzergebnis, Zustandsvektor oder Stichprobenverteilung |
| Lokale Kompilierung und Simulation | Schaltungen mit TKET, QSteed oder MQT QMAP kompilieren oder abbilden; lokal simulieren mit Braket LocalSimulator, QCompute, Qibo und anderen | Gattersätze und Abbildung, Zustandsvektoren oder Wahrscheinlichkeiten, mit der Bitreihenfolge-Konvention des jeweiligen SDK |
| Differenzierbare und hybride Programme | Erwartungswerte und Gradienten mit PennyLane, DeepQuantum, TensorCircuit, MindQuantum oder VQNet; Messung, Reset und klassische Rückkopplung mit Guppy / Selene | Parametergradienten, Wahrscheinlichkeiten und Programmergebnisse |
| Fehlertolerante Ressourcen | Physikalische Ressourcenschätzungen mit Microsoft QDK, Gatterressourcen für ein gegebenes Bloq mit Qualtran | Qubits, Laufzeit oder Gatterzahlen mit Hardware- und Zerlegungsannahmen |
| Interoperabilität Qiskit / Cirq | Unterstützte unitäre Schaltungen über einen festen OpenQASM-2-Pfad mit qBraid konvertieren | Konvertierte Schaltung mit erhaltener Qubit-Nummerierung und ungenutzten Qubits; optionaler Vergleich der vollständigen Unitären |
| Schaltungsoptimierung und messbasiertes Rechnen | ZX-Umschreiben und -Extraktion mit PyZX; Umwandlung und Simulation von MBQC-Mustern mit Graphix | Schaltungen und Gatterzahlen vorher und nachher, Ressourcengraphen und Messmuster; optionaler unabhängiger Vergleich |
| Schaltungsoptimierung und Circuit Cutting | Gattersequenzen mit Compact optimieren; Schaltungen mit QCut aufteilen und Erwartungswerte rekonstruieren | Schaltungen vorher und nachher mit unabhängiger Äquivalenzprüfung; Aufwand des Circuit Cutting, tatsächliche Stichproben und optionale unzerschnittene Referenz |
| Verrauschtes Clifford+T-Sampling | T-Gatter-Interferenz und Rauschen mit Clifft untersuchen oder unterstützte Schaltungen im Stim-Format samplen | Endgültige Bitstring-Häufigkeiten und optionale Dichtematrix-Referenz; Messungen während der Schaltung und rohe Detektor- / Observablen-Paritäten |
| Zustände und Messung | Dichtematrizen und Verschränkungsmaße prüfen; lokale randomisierte Messungen an bekannten Produkt- / GHZ-Zuständen simulieren | Zustandsmaße mit unabhängigen Prüfungen; Schätzungen der Subsystem-Reinheit mit Fehler aus endlicher Stichprobe |

<a id="ground-states-chemistry-and-optimization"></a>

### Grundzustände, Chemie und Optimierung

| Richtung | Aufgaben, die Sie starten können | Ergebnisse, die Sie prüfen können |
| --- | --- | --- |
| Grundzustände berechnen und validieren | VQE für einen reellen Pauli-Hamiltonoperator mit zwei Qubits in einem festen Teilchensektor ausführen und gegen eine exakte Referenz prüfen | Energie, Konvergenzverlauf, unabhängige Prüfungen und im vollständigen Ablauf ein Bericht zur wissenschaftlichen Abnahme |
| Quantenchemie und Vielteilchen-Grundzustände | Moleküle und aktive Räume mit SQD untersuchen oder Grundzustände von XYZ-Spinketten mit TeNPy | SQD-Energie und Orbitalbesetzung; DMRG-Energie, Magnetisierung, Verschränkungsentropie und Konvergenz; optionale exakte Referenz |
| Lernen variationeller Parameter | Flow-VQE auf einem Pauli-Hamiltonoperator trainieren, um Schaltungsparameter niedriger Energie zu lernen | Flow-Lernen im Vergleich zu Zufallssuche bei gleichem Auswertungsbudget |
| Angeregte Zustände und Kernel-Klassifikation | Mehrere niederenergetische Zustände mit OpenQARP VQD suchen oder ein QSVM mit einem cqlib-Winkelkernel trainieren | Energien, Residuen, Orthogonalität und optionales exaktes Spektrum; Klassifikation auf zurückgehaltenen Daten, analytischer Kernel und klassische Baseline |
| Symmetrie und Steuerungsalgebra | Qubits in einem gewählten Symmetriesektor mit Symmer reduzieren; Pauli-Generatoren mit PauLie analysieren | Reduzierter Hamiltonoperator, Klassifikation und Dimension der Lie-Algebra; optionaler Spektrumvergleich oder Abschluss |
| Kombinatorische Optimierung | Lokale Optimierungsprobleme mit QPanda, Ocean oder Kaiwu aufstellen und lösen; gegebene QAOA-Parameter mit Qcover auswerten | Lösung, Nebenbedingungsprüfungen, Energien und Korrelationen, mit klassischem Vergleich, wo die Schnittstelle ihn bietet |
| Chemische Operatoren und vorhandene Daten | Fermionische Operatoren mit OpenFermion / pyChemiQ abbilden; vorhandene QCArchive-Einzelpunktdatensätze bei Bedarf über QCPortal abfragen | Pauli-Terme; Molekül, Energie, Methode und Quelle, mit erhaltenen Einheiten und fehlenden Feldern |

<a id="error-mitigation-and-error-correction"></a>

### Fehlerminderung und Fehlerkorrektur

| Richtung | Aufgaben, die Sie starten können | Ergebnisse, die Sie prüfen können |
| --- | --- | --- |
| Fehlerminderung | ZNE, REM, PEC oder CDR mit Mitiq ausführen und rohe mit geminderten Ergebnissen bei gleichem Stichprobenbudget vergleichen | Ideale Referenz, empirischer Bias, Varianz und RMSE sowie Kalibrierungs-, Trainings- und Stichprobenaufwand |
| Quantenfehlerkorrektur | Memory-Experimente mit Surface Codes mit Stim / PyMatching ausführen, rechteckige Patches mit Deltakit aufbauen oder mit BP+LSD decodieren | Tatsächliche verrauschte Schaltungen, logische Fehlerraten und Intervalle bei festen Shots; Syndrom-Konsistenzprüfungen für LSD |

<a id="hamiltonian-simulation-and-open-systems"></a>

### Hamilton-Simulation und offene Systeme

| Richtung | Aufgaben, die Sie starten können | Ergebnisse, die Sie prüfen können |
| --- | --- | --- |
| Hamilton-Simulation | Zeitentwicklungsschaltungen oder Endzustände für einen reellen Pauli-Hamiltonoperator mit Trotter–Suzuki oder qDrift erzeugen | Schaltungen, Ressourcenkennzahlen, Zustandsvektoren und optionale unabhängige Matrixreferenz; Schritte, Ordnung, Zeit und Seed sind einstellbar |
| Dynamik offener Systeme | Offene Ising-Ketten mit TJM, Treiber-Scans und Gradienten für ein Qubit mit Dynamiqs, Umgebungsgedächtnis mit OQuPy | Observablen-Verläufe, unabhängige Referenzen, Gradienten, Zeitschritte und Gedächtnis-Abschneidungen |

<a id="experiment-simulation-and-hardware"></a>

### Experimentsimulation und Hardware

| Richtung | Aufgaben, die Sie starten können | Ergebnisse, die Sie prüfen können |
| --- | --- | --- |
| Supraleitende und atomare Experimente | Kalibrierabläufe, Einschränkungen nativer Gatter und Transmon-Leckage simulieren; unterstützte Atomanordnungen und Pulse mit Bloqade Analog / Pulser untersuchen | Synthetische Daten, Dynamikverläufe, Besetzungen je Atom und Endwahrscheinlichkeiten |
| Pulsprogramme und Steuerung | Programme offline mit QUA, LabOne Q, Qblox Scheduler, Qililab oder OQC QAT erstellen, planen und kompilieren | Programme, Timing, Zielinstruktionen oder Wellenformen; diese Adapter steuern keine Laborgeräte |
| Zugang zu Quantenhardware | Backends finden und Topologie sowie Zugangsdaten prüfen; Abfrage, Einreichung und Abbruch von Cloud-Jobs bei Bedarf aktivieren | Gerätekandidaten und Nutzungsbedingungen; Ergebnisse und Status aus aktivierten Job-Schnittstellen |
| Lokale Geräteschnittstelle | Einen konfigurierten C-Treiber über QDMI abfragen | Vom Treiber gemeldete Geräte, Qubits, Gatter und Kopplungen; der offizielle Beispieltreiber validiert die Schnittstelle und ist keine Online-QPU |

<a id="photonics-and-quantum-networks"></a>

### Photonik und Quantennetzwerke

| Richtung | Aufgaben, die Sie starten können | Ergebnisse, die Sie prüfen können |
| --- | --- | --- |
| Photonische Schaltungen und Lernen | Linear-optische Ausgaben mit Perceval und Lightworks berechnen; Batch-Inferenz und Phasenschieber-Gradienten mit MerLin; optional Gauß-Modelle mit MrMustard | Fock-Wahrscheinlichkeiten, Gradienten oder optische Momente, mit ausdrücklicher Modenreihenfolge und Abschneidung |
| Netzwerkmodellierung und Programme | Verlust und Dekohärenz einer einzelnen Verbindung mit SimQN simulieren; Zwei-Knoten-Programme mit NetQASM erzeugen | Verbindungsstatistiken und kompilierte Programme; die Simulation mit SquidASM erfordert eine separat lizenzierte NetSquid-Umgebung |

<a id="reference-material-and-selection"></a>

### Referenzmaterial und Auswahl

| Richtung | Aufgaben, die Sie starten können | Ergebnisse, die Sie prüfen können |
| --- | --- | --- |
| Algorithmenreferenzen und Werkzeugauswahl | Die 66 Quantum-Practices-Algorithmusanleitungen durchsuchen, Quanten-SDKs vergleichen und Forschungsschritte wiederverwenden | Versioniertes Referenzmaterial, Annahmen und Auswahlempfehlungen |
| Öffentliche Geräte-Benchmarks | 410 feste historische Metriq-Datensätze nach Anbieter, Gerät oder Benchmark-Typ abfragen | Ursprüngliche Parameter, Kennzahlen, Daten, Quellen und Lizenzen, mit erhaltener Kennzeichnung von Simulatoren |

### Quantum Learning

Materialien, Kursunterlagen und Unterricht an einem Ort: Lernende arbeiten praktisch, Lehrende organisieren ihre eigenen Lehrinhalte.

| Lernen und Lehren | Verfügbare Funktionen |
| --- | --- |
| Materialien vorbereiten | Startseite, Kursbibliothek, Anhänge, Kursimport und PPTX-Import |
| Kurse erstellen | Kursvorschau, Editor für Kursunterlagen und Pro-Workbench |
| Im Unterricht lernen | Folien, Quizze, interaktive Fragen und Antworten sowie projektbasiertes Lernen |
| Weiterlernen | Lokale Kurse, Aufgaben, Materialien und serverseitige Lernprotokolle, mit Migration aus früheren Unterrichtsräumen |

Ziel ist eine Abdeckung von schulischen Grundlagen bis zur aktuellen Forschung, gegliedert in Einsteiger-, Fortgeschrittenen- und Expertenstufen, mit Lernen über Stufen hinweg. Öffentliche Ressourcen werden noch aufbereitet; das vollständige Curriculum ist noch nicht erstellt oder veröffentlicht. Zusammenbau, Start und lokale Speicherung der Anwendung sind geprüft; echter Online-Kursaufbau mit KI, Fragen und Antworten sowie Bearbeitung warten noch auf die vollständige Abnahme.

Pro-Lehraufgaben verwenden die eigenen Werkzeuge und Protokolle der Upstream-Anwendung und sind noch nicht mit den Quantenwerkzeugen der Workbench verbunden. Optionale Medien-, Sprach- und Suchfunktionen benötigen eigene Dienste. Installation, Sicherung, Migration und Prüfung beschreibt der [Integrationsleitfaden für Quantum Learning](../integrations/OPENMAIC.md).

<p align="center">
  <img src="../images/openquantum-learning-20260912.jpg" width="100%" alt="Quantum Learning: Kursmaterialien, Unterrichtsräume und Bearbeitung von Kursunterlagen" />
</p>

[Quantum Learning einrichten und einen Unterrichtsraum öffnen](#set-up-quantum-learning).

### Desktop, Messaging und Sprachen

**Desktop.** Der OpenQuantum-Desktop bietet ein natives Fenster, Systemleiste, Terminal und Benachrichtigungen und nutzt Modelle, Quanten-Skills, Rechenwerkzeuge und Ausführungsprotokolle der Workbench mit. Er verwendet das originale DSH Desktop eines Drittanbieters mit einem separat ausgelieferten OpenQuantum-Funktionspaket, auf dem Mac (Apple Silicon / Intel), unter Windows und aus dem Quellcode. [Desktop installieren](#desktop-installer) · [Desktop aus dem Quellcode bauen](#desktop-from-source).

**Messaging.** Über CC Connect können Sie Aufgaben aus WeChat, Feishu, DingTalk, Slack, Telegram, Discord und weiteren Kanälen starten und dabei Skills, Tools und Ausführungsprotokolle der Workbench nutzen. [Messaging-Kanäle einrichten](#messaging-channels).

<p align="center">
  <img src="../images/openquantum-wechat-chat.jpg" width="380" alt="Bestehende Demo eines Chats mit OpenQuantum über WeChat ClawBot" /><br />
  <sub>Eine Aufgabe und die Antwort im WeChat-Kanal.</sub>
</p>

**Oberflächensprachen.** Unter **Einstellungen → Allgemein → Sprache** wählen Sie vereinfachtes Chinesisch, Englisch, Japanisch, Koreanisch, Spanisch, Französisch, Deutsch, Portugiesisch, Russisch oder Arabisch. Die Auswahl bleibt gespeichert, Quantum Learning übernimmt sie, und Arabisch wird von rechts nach links angezeigt.

![Sprachauswahl in der laufenden OpenQuantum-Desktop-Anwendung](../images/openquantum-languages-20260919.jpg)

Die Oberflächensprache übersetzt keine bestehenden Unterhaltungen, Kursmaterialien, benutzereigenen Skills oder Werkzeugausgaben. Einige native Systemdialoge verwenden außerhalb von Chinesisch und Englisch die englische Fassung.

<a id="quick-start"></a>

## Schnellstart

Wählen Sie einen Zugang: das Plugin in Codex installieren, den Desktop-Client mit seinem Funktionspaket nutzen oder die Workbench aus dem Quellcode starten. Desktop und die Workbench aus dem Quellcode sind für die lokale Nutzung durch eine einzelne Person gedacht; wählen Sie den Quellcode für Entwicklung oder für Funktionen auf `main`.

<a id="codex"></a>

### Codex-Plugin: installieren und nutzen

Eine einmalige Installation des OpenQuantum-Plugins registriert **Skills, lokale MCP-Dienste, wissenschaftliche Tools und die OpenQuantum-Einstellungsseite** gemeinsam. Sie stellen weiterhin Fragen, verwalten Projekte und lesen Ergebnisse in nativen Codex-Chats; über die Einstellungsseite konfigurieren Sie die Funktionen von OpenQuantum.

**Lassen Sie Codex die Installation übernehmen:** Öffnen Sie Codex, starten Sie einen neuen Chat und fügen Sie die folgende Anfrage ein.

```text
Please install the OpenQuantum Codex plugin 0.8.4. First read the installation guide:
https://github.com/xi-zhao/OpenQuantum/blob/codex-v0.8.4/docs/integrations/CODEX_AGENT_INSTALL.md
Download the complete installer and SHA256SUMS from https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4,
verify the checksum, check Codex, Node.js 24+ and npm, and install with the bundled installer.
Keep existing plugins and user settings, and check the Skills, MCP tools and the global "OpenQuantum settings" entry.
Tell me exactly what to do if the app needs reloading. Finally, report what was actually verified and which scientific dependencies still need preparation.
```

Das Desktop-Funktionspaket, das Codex-Plugin und das Installationsprogramm verwenden alle **OpenQuantum 0.8.4**. Dieses Plugin enthält 168 Skills und 87 wissenschaftliche Tools, ergänzt 26 Skills für native SDKs und vereinheitlicht die Reiter Status, MCP, Skills und Service keys (Dienstschlüssel); die 16 neuen Dienst-Tools mit Zugangsdaten sind standardmäßig deaktiviert. Das Release-Tag ist `codex-v0.8.4`; Anhänge und Prüfumfang sind im Release angegeben.

**[Vollständiges Installationspaket für das Codex-Plugin 0.8.4 herunterladen](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.4/openquantum-0.8.4-codex-install.zip)** ([Versionshinweise und SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4)).

Das Paket enthält das Plugin-ZIP, ein Installationsskript und die Lockdatei der Abhängigkeiten; ein Quellcode-Checkout ist nicht nötig. Erforderlich sind Node.js 24+, npm und eine Codex-Version mit Unterstützung für Plugins und globale Einstellungsseiten; ein Agent kann dies anhand der [Installationsanleitung](../integrations/CODEX_AGENT_INSTALL.md) prüfen und erledigen. Die lokale Installation ist auf macOS geprüft; prüfen Sie die Kompatibilität mit anderen Plattformen und Host-Versionen.

**Nach der Installation:**

1. Laden Sie Codex bei Aufforderung neu und öffnen Sie dann einen neuen Chat, damit die neuen Skills und Werkzeuge geladen werden.
2. Fragen Sie direkt im Chat, zum Beispiel: „Finde mit OpenQuantum Methoden der Quantenfehlerkorrektur und empfiehl ein erstes Experiment.“
3. Öffnen Sie **„…“ → „OpenQuantum settings“** und verwalten Sie die Funktionen in den Reitern **Status / MCP / Skills / Service keys**; Tool-Schalter finden Sie unter **Status → Tools**. Integrierte Dienste sind mit dem Plugin vorkonfiguriert; um einen eigenen MCP-Server hinzuzufügen, geben Sie dessen Verbindungsdaten ein und speichern Tokens über den eigenen Dialog für Zugangsdaten.

Das Plugin installiert den Funktionscode und die Einstellungsseite; manche Berechnungen benötigen weiterhin Python, Quanten-SDKs oder Drittanbieterkonten, die bei Bedarf vorbereitet werden. Siehe den [Plugin-Leitfaden](../integrations/CODEX_PLUGIN.md).

<details>
<summary><strong>Manuelle Installation (optional)</strong></summary>

Laden Sie das vollständige Installationspaket herunter, prüfen und entpacken Sie es und führen Sie in seinem Verzeichnis Folgendes aus (erfordert Node.js 24+, npm und eine Codex CLI mit Plugin-Unterstützung):

```sh
npm ci --ignore-scripts
npm run plugin:install
```

Findet das Installationsprogramm die CLI der aktuellen Codex-App nicht, setzen Sie `OPENQUANTUM_CODEX_CLI` auf deren Pfad. Mit einem vorhandenen Plugin-ZIP verwenden Sie `npm run plugin:install -- /full/path/plugin.zip`. Installation, Fehlerbehandlung und schrittweise Prüfungen beschreibt die [Installationsanleitung für Agenten](../integrations/CODEX_AGENT_INSTALL.md).

</details>

<a id="desktop-installer"></a>

### Desktop-Installationspaket

Die aktuelle Desktop-Version kombiniert den [originalen Client DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7) mit einem separaten OpenQuantum-Funktionspaket. Der Originalclient behält Upstream-Namen und -Version; das Funktionspaket bündelt Node / uv und liefert die vollständigen SDK-Zugänge, Quanten-Skills, Tools und Konfiguration. Das Installationsprogramm legt einen Starter mit dem OpenQuantum-Symbol an (`OpenQuantum.app` auf dem Mac, `OpenQuantum.lnk` unter Windows).

Installieren Sie zuerst das originale DSH Desktop und wählen Sie dann das Funktionspaket für Ihre Plattform:

| Plattform | Download OpenQuantum 0.8.4 | Nach dem Entpacken ausführen |
| --- | --- | --- |
| Mac Apple Silicon | [darwin-arm64-Paket](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-darwin-arm64.tar.gz) | `install.command` |
| Mac Intel | [darwin-x64-Paket](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-darwin-x64.tar.gz) | `install.command` |
| Windows x64 | [win32-x64-Paket](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-win32-x64.tar.gz) | `install.cmd` |

Prüfen Sie den Download vor dem Entpacken anhand der [SHA256SUMS im Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4). Upgrades erhalten bestehende Einstellungen; siehe den [Leitfaden zu Installation und Migration](../DESKTOP_INSTALLERS.md). Funktionspaket und Codex-Plugin haben beide die Version `0.8.4`, Harness bleibt bei `0.1.5-rc.1`. Rechenumgebungen, Konten und Lizenzen werden weiterhin je Funktion vorbereitet.

### Installation aus dem Quellcode

Bereiten Sie Git und Node.js 24 vor; Python-Quantenwerkzeuge benötigen zusätzlich [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/). Weitere Abhängigkeiten hängen von der Funktion ab, zum Beispiel Julia 1.12.7 für RandomMeas.

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
```

Ohne Modellschlüssel können Sie bereits das [feste lokale Beispiel](#no-model-key-needed-recompute-a-fixed-case) ausführen. Um Aufgaben über den Agenten zu starten, wählen Sie eine Startoption für die Workbench und konfigurieren ein Modell.

### Startoption für die Workbench wählen

Web und Desktop, die aus derselben Quellcode-Arbeitskopie gestartet werden, teilen Modelleinstellungen, Quantenfunktionen und Ausführungsprotokolle in `.openquantum/dsh`. Beenden Sie die laufende Workbench, bevor Sie wechseln.

**Web-Workbench**

```bash
npm run dev
```

Öffnen Sie die Adresse mit dem Anmeldetoken, die der Starter ausgibt; nach der Authentifizierung ist die Workbench unter <http://127.0.0.1:3000> erreichbar.

<a id="desktop"></a>
<a id="desktop-from-source"></a>

<details>
<summary><strong>Desktop aus dem Quellcode bauen und starten</strong></summary>

Nach der Installation der Quellcode-Abhängigkeiten und der Einrichtung von Corepack sowie der C++-Build-Werkzeuge des Systems:

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop -- --source
```

`desktop:setup` baut den festgelegten Upstream-Quellcode, lädt Electron herunter und kompiliert native Module, ohne Schnittstellen oder Assets des Drittanbieters zu verändern. Verwenden Sie den Startbefehl des Repositorys, damit Modell- und Quantenfähigkeitseinstellungen geladen werden. Plattformanforderungen stehen unter [Bereitstellung](../DEPLOYMENT.md).

</details>

<a id="configure-a-model"></a>

### Modell konfigurieren

Bei einer neuen Desktop-Installation ist die Modellliste leer. Fügen Sie unter **Einstellungen → Modelle** einen Anbieter mit einem Endpunkt für OpenAI-compatible Chat Completions, Modellnamen und API-Schlüssel hinzu und behalten Sie OpenQuantum als Standard-Agent-Preset bei. **Das Modell muss Tool Calling unterstützen, um Quantenrechenwerkzeuge aufrufen zu können.** Damit wird nur der Modelldienst eingerichtet; Zugangsdaten für Quantenclouds werden mit den jeweiligen Backends konfiguriert.

<details>
<summary><strong>Erweiterte Modellkonfiguration und Diagnose über die Kommandozeile</strong></summary>

Der Quellcode enthält optionale Debugging-Beispiele `openquantum-public` / `openquantum-private`, deren Adressen `.invalid`-Platzhalter sind. Sie sind in der Modellliste einer neuen Desktop-Installation nicht vorausgefüllt und benötigen echte Adressen und Zugangsdaten nur für die folgende Diagnose.

In der Oberfläche gespeicherte Routen-Überschreibungen werden in die von Git ignorierte Datei `$DSH_HOME/settings.yaml` geschrieben; Schlüssel bleiben in der lokalen Umgebung oder im Harness-Credential-Store, und die Projektkonfiguration enthält nur Verweise auf Zugangsdaten. Um `.env` zu nutzen, führen Sie auf macOS `cp .env.example .env` oder in Windows PowerShell `Copy-Item .env.example .env` aus und füllen die Datei gemäß den Kommentaren aus. `.env` überschreibt keine Modellnamen; weitere Modellnamen konfigurieren Sie unter **Einstellungen → Modelle**.

Der folgende Befehl prüft die öffentliche Route aus `.env` oder Umgebungsvariablen mit den im Skript festgelegten Modellnamen `kimi-k2.7-code` und `glm5.2` und testet Textgenerierung und Tool Calling. In der Oberfläche gespeicherte Routen-Überschreibungen liest er nicht; andere Modelle prüfen Sie mit der Workbench-Aufgabe weiter unten.

```bash
npm run models:probe -- --provider openquantum-public
```

</details>

### Rechenumgebungen je Aufgabe vorbereiten

Lokale Python-Rechenwerkzeuge verwenden ausdrücklich vorbereitete, festgelegte Abhängigkeiten. Führen Sie nach `npm ci` im Repository-Hauptverzeichnis den Vorbereitungsbefehl für die benötigte Funktion aus. Die Vorbereitung kann herunterladen und bauen; Rechenaufrufe installieren Abhängigkeiten nicht mehr automatisch.

| Was vorzubereiten ist | Befehl oder Ort |
| --- | --- |
| Das erste Bell-Zustand-Experiment | `node scripts/setup-paper-tools.mjs fatqat-workbench` |
| Statische Wechselwirkung eines Rb-Atompaars | `npm run capability:pairinteraction:setup`; [Modell- und Versionsverwaltung](../integrations/PAIRINTERACTION.md) |
| Hamilton-Simulation mit Trotter / qDrift | `npm run capability:hamiltonian:setup` |
| Clifft-Sampling und Schaltungskonvertierung mit qBraid | `npm run capability:interop:setup` |
| Jede andere Python-Funktion | `node scripts/setup-paper-tools.mjs <capability-id>`, zum Beispiel `qec-memory-experiment`; jeder Skill nennt seinen eigenen Befehl |
| Algorithmusbeispiele | Mit der [minimalen Umgebung](#run-an-algorithm-example-directly) beginnen und bei Bedarf die Gruppen Gradienten, PennyLane, Tensor oder Chemie ergänzen |

Umgebungsvorbereitung, Aktivierung von Verbindungen und Modellkonfiguration sind unabhängige Schritte. Auch eine standardmäßig aktivierte Verbindung braucht vor der ersten Nutzung vorbereitete Abhängigkeiten; fehlt eine Umgebung oder hat sich ihre Lockdatei geändert, gibt das Tool den genauen Vorbereitungsbefehl zurück. Julia, QDMI-Treiber und Upstream-MCP-Dienste folgen ihren eigenen Anleitungen; siehe [lokale Umgebungen](../integrations/LOCAL_ENVIRONMENTS.md).

### Erste Aufgabe ausführen

<a id="no-model-key-needed-recompute-a-fixed-case"></a>

#### Ohne Modellschlüssel: einen festen Fall nachrechnen

Mit dem festen [Pauli-Hamiltonoperator für zwei Qubits](../../.agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json) des Repositorys als Eingabe führt das native Tool `solve_and_validate_ground_state` ein rauschfreies VQE im angegebenen Teilchensektor aus und prüft das Ergebnis mit einer unabhängigen geschlossenen Rechnung. Führen Sie nach `git clone` und `npm ci` im Repository Folgendes aus; weder Modellschlüssel noch Zugangsdaten für eine Quantencloud sind nötig:

```bash
npm run demo:quantum-ground-state
```

<table>
  <tr>
    <td align="center"><strong>−1,85727503 Ha</strong><br /><sub>VQE-Energie</sub></td>
    <td align="center"><strong>−1,85727503 Ha</strong><br /><sub>Unabhängige exakte Referenz</sub></td>
    <td align="center"><strong>4,44 · 10⁻¹⁶ Ha</strong><br /><sub>Energiedifferenz</sub></td>
    <td align="center"><strong>15 bestanden</strong><br /><sub>Lokale Rechenprüfungen</sub></td>
  </tr>
</table>

Diese Werte stammen aus einem **lokalen Neulauf am 2026-09-12**; die [Rohausgabe und das Laufprotokoll](../examples/quantum-ground-state-local-demo-2026-09-12.json) enthalten vollständige Werte, Prüfstatus, Zeit, Quell-Commit, Eingabe-Digest und Node.js-Version.

<details>
<summary><strong>Was dieser Lauf geprüft hat und was noch fehlt</strong></summary>

In diesem Protokoll wurden 15 lokale Rechenprüfungen bestanden und 1 Prüfung der Sitzungsherkunft nicht ausgeführt; eine vollständige wissenschaftliche Abnahme liegt daher nicht vor. Die Energiedifferenz zeigt die Übereinstimmung mit der exakten Referenz für diesen numerischen Fall; der wissenschaftliche Geltungsbereich beschränkt sich auf den gegebenen Hamiltonoperator und Teilchensektor.

Eine vollständige wissenschaftliche Abnahme erfordert zusätzlich, die Aufgabe über Harness auszuführen, Ergebnisdateien und Sitzungsherkunft zu speichern und einen erneut lesbaren Abnahmebericht zu erzeugen. Die Prüfeinstiege nach der Modellkonfiguration stehen unter [Entwicklung und Prüfung](#development-and-verification).

</details>

<a id="let-the-agent-run-a-task-prepare-and-sample-a-bell-state"></a>

#### Den Agenten eine Aufgabe ausführen lassen: einen Bell-Zustand präparieren und samplen

Nachdem Sie ein Modell konfiguriert und FatQat mit `node scripts/setup-paper-tools.mjs fatqat-workbench` vorbereitet haben, starten Sie eine neue Sitzung und senden:

> Beginne mit FatQat im Nullzustand zweier Qubits, wende H auf q0 an und anschließend CX mit q0 als Kontroll- und q1 als Zielqubit. Gib die exakten rauschfreien Wahrscheinlichkeiten zurück und vergleiche sie mit 1024 Messungen bei seed=7.

Der Agent kann das Schaltungswerkzeug von FatQat aufrufen, und die Workbench bewahrt Werkzeugeingabe und Rückgabe. Prüfen Sie die exakten Wahrscheinlichkeiten und Häufigkeiten und fragen Sie dann nach:

> Behalte Schaltung und Seed bei, setze die Zahl der Messungen auf 8192 und vergleiche, wie weit die Häufigkeiten beider Läufe von den exakten Wahrscheinlichkeiten abweichen.

Ideal sind `00` und `11` jeweils zu 50 % wahrscheinlich; Häufigkeiten aus endlichen Stichproben schwanken. Der Vergleich zweier Läufe macht diese Schwankung sichtbar; eine einmalige Erhöhung der Messungen garantiert nicht, dass jede Häufigkeit näher am Idealwert liegt. Ohne Modell mit Tool Calling kann der Agent keine Rechen-Tools aufrufen. Schnittstellendetails und lokale Prüfung stehen im [FatQat-Leitfaden](../integrations/FATQAT.md).

<a id="run-an-algorithm-example-directly"></a>

#### Ein Algorithmusbeispiel direkt ausführen

Weder Modellschlüssel noch Quantencloud-Konto sind nötig. Beginnen Sie mit NumPy, SciPy und Qiskit:

```bash
npm run capability:algorithms:setup -- --minimal
```

Unter macOS / Linux listen Sie die Methoden auf, lesen den Eingabevertrag und führen das Standardbeispiel für HHL aus:

```bash
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --list
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --describe hhl
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm hhl
```

In Windows PowerShell:

```powershell
& examples/quantum-algorithms/.venv/Scripts/python.exe examples/quantum-algorithms/run.py --algorithm hhl
```

Für QSP/QSVT und ähnliche Methoden führen Sie `npm run capability:algorithms:setup -- --group pennylane` aus; weitere Gruppen sind `gradients`, `tensor` und `chemistry`, und das Hinzufügen einer Gruppe erhält die übrigen. `npm run capability:algorithms:setup` ohne Argumente bereitet alles vor. Die vollständige Umgebung enthält PySCF, wofür unter Windows WSL empfohlen wird; die numerische Prüfung erfolgte auf macOS mit CPU.

Übergeben Sie eigene Parameter als JSON-Datei mit `--input` und speichern Sie Ergebnisse mit `--output`, oder lassen Sie den Agenten nach der Modellkonfiguration `quantum-algorithms` oder einen methodenspezifischen Skill verwenden. Parameter, Bitreihenfolge, Methodenunterschiede und Abhängigkeitsgruppen stehen in der [Anleitung zu den Algorithmusbeispielen](../../examples/quantum-algorithms/README.md).

<a id="upgrade-an-existing-source-installation"></a>

### Eine bestehende Quellcode-Installation aktualisieren

Aktualisieren Sie Quellcode und Projektabhängigkeiten gemäß der [Update-Anleitung](../UPDATES.md) und führen Sie anschließend für jede genutzte Funktion den Vorbereitungsbefehl einmal erneut aus. Python-Brücken prüfen und synchronisieren festgelegte Abhängigkeiten in ihren bestehenden Umgebungsverzeichnissen, sodass nichts gelöscht werden muss; bei Algorithmusbeispielen lassen sich weiter Gruppen ergänzen.

Starten Sie die Workbench neu und öffnen Sie eine neue Sitzung. Bestehende Namen und Parameter von Skills und Tools bleiben gültig; die 13 Kategorieindizes lassen sich weiterhin manuell aufrufen, während automatische Aufgaben `quantum-algorithms` oder eine bestimmte Methode wählen. Um den vollen Werkzeugumfang eines optionalen Dienstes wiederherzustellen, verwenden Sie das Standardprofil `full`; siehe [Funktionsauswahl und Kompatibilität](../integrations/CAPABILITY_SELECTION.md).

### Optionale Funktionen

<a id="set-up-quantum-learning"></a>

<details>
<summary><strong>Quantum Learning einrichten</strong></summary>

Führen Sie nach der Installation der Quellcode-Abhängigkeiten in derselben Arbeitskopie aus:

```bash
npm run learning:ui:setup
```

Starten Sie dann Web oder Desktop und öffnen Sie **Quantum Learning** über die Seitenleiste. Beim ersten Start laufen eine lokale Datenbank und ein Kursdienst an, ohne globales PostgreSQL; Modellanfragen verwenden das aktuell in OpenQuantum ausgewählte Modell.

Installation und Start sind auf macOS geprüft. Das Installationsprogramm hängt von `/bin/sh` ab und ist noch nicht an gewöhnliches Windows angepasst; Linux ist noch nicht geprüft. Ein neuer Git-Worktree benötigt eine eigene Installation. Sicherung, Migration und Plattformstatus stehen im [Integrationsleitfaden](../integrations/OPENMAIC.md#使用).

</details>

<a id="messaging-channels"></a>

<details>
<summary><strong>WeChat, Feishu und weitere Messaging-Kanäle einrichten</strong></summary>

```bash
npm run cc-connect:setup
npm run cc-connect:feishu
npm run cc-connect:start
```

Richten Sie die erste Plattform wie im Upstream-Projekt beschrieben ein; führen Sie in einem weiteren Terminal `npm run cc-connect:web` aus, um weitere Plattformen und Zugangsdaten zu verwalten. Tokens liegen in einer von Git ignorierten lokalen Konfiguration; siehe den [Messaging-Leitfaden](../integrations/CC_CONNECT.md).

</details>

Probleme bei Bereitstellung und Start behandeln [Bereitstellung](../DEPLOYMENT.md) und [Fehlerbehebung](../TROUBLESHOOTING.md).

<a id="use-and-inspect-results"></a>

## Ergebnisse nutzen und prüfen

Sobald eine Aufgabe läuft, können Sie andere Backends wählen, die Problemgröße ändern und die Ergebnisse in weitere Forschung übernehmen.

<a id="choose-the-right-entry-point"></a>

### Den passenden Weg wählen

Nutzen Sie [lauffähige Beispiele](#algorithm-learning-and-method-comparison), wenn Sie einen Algorithmus lernen oder verändern, und Fachwerkzeuge, wenn Sie einen definierten Ein-/Ausgabevertrag brauchen. Für sich überschneidende Werkzeuge bei Trotter / qDrift, VQD, Qiskit und Eigenlösern gibt es einen [gemeinsamen Auswahlleitfaden](../integrations/CAPABILITY_SELECTION.md); die ursprünglichen Namen bleiben erhalten, und Implementierungen mit unterschiedlichen physikalischen Annahmen oder numerischen Methoden bleiben getrennt.

Qiskit Gym, Quantum Hardware und FlagQuantum sind standardmäßig deaktiviert. Wenn Sie sie brauchen, konfigurieren Sie ein kleineres Werkzeugprofil für Training, Geräteabfragen, Kompilierung oder Simulation; ohne Auswahl gilt das abwärtskompatible Profil `full`. Welche Tools in einer Sitzung aufrufbar sind, hängt von aktivierten Verbindungen, der tatsächlichen Registrierung und dem gewählten Profil ab.

<a id="local-computing-and-quantum-clouds"></a>

### Lokales Rechnen und Quantenclouds

Lokale numerische Berechnungen brauchen kein Quantencloud-Konto. Um andere Werkzeuge zu nutzen, konfigurieren Sie die Verbindung unter **Einstellungen → Quantenkomponenten → MCP-Server-Verbindungen**, starten die Workbench neu und nennen das Backend in der Aufgabe. Die Standardschalter listet der [MCP-Dienstkatalog](../CAPABILITIES.md#mcp-服务目录) in der chinesischen README.

Für echte Hardware bereiten Sie Zugangsdaten, Berechtigungen und Kontingent für den Zieldienst vor. **Gerätesuche, echte Job-Einreichung und lokale Simulation haben jeweils einen eigenen Umfang.** Eine Konfiguration bedeutet nicht, dass der Dienst online ist; ob ein Job erfolgreich war, zeigt das tatsächliche Laufprotokoll.

| Backend | Aktueller Funktionsumfang | Zugangsdaten oder Bedingungen |
| --- | --- | --- |
| Lokales Rechnen | Schaltungs- und Rauschsimulation, Grundzustandsreferenzen, Zustandsprüfungen, Sampling zur Fehlerkorrektur, Optimierung und Experimentsimulation, jeweils mit eigenem Eingabebereich | Keine Cloud-Zugangsdaten; festgelegte Abhängigkeiten vor dem Rechnen vorbereiten |
| IBM Quantum | Runtime, AI Transpiler, Hardwareabfragen; optional echte Job-Einreichung und -Abbruch | `QISKIT_IBM_TOKEN`; MCP-Server-Verbindungen für Jobs sind Opt-in |
| IonQ | Hardwareabfragen; optional echte Job-Einreichung, Abbruch und Kostenschätzungen | `IONQ_API_KEY`; MCP-Server-Verbindungen für Jobs sind Opt-in |
| Origin-Quantum-Cloud | Schreibgeschützte Backend-Suche (FieldQKit); Abfragen der Wukong-QPU über den QPanda3 Runtime MCP Server mit optionalen Sampling-, Erwartungswert- und Batch-Jobs | `ORIGIN_API_TOKEN` für die Suche; `QPANDA3_API_KEY` für optionale Hardware-Jobs |
| Clouds von Quafu, Tianyan, Guodun, Tencent und LogicalQubit | Prüfung von Zugangsdaten, Backend-Suche, Qubit-Filterung, Zusammenfassungen von Topologie und Kalibrierung | API-Token des jeweiligen Dienstes; schreibgeschützt |
| FieldQuantum | Suche nach Cloud-Simulator-Backends | `FIELDQUANTUM_API_TOKEN`; schreibgeschützt |

Hardware-Jobs und kostenpflichtige Dienste werden bei Bedarf aktiviert. Die schreibgeschützte Suche lässt Sie Geräte, Topologie und Kalibrierung kennenlernen, bevor Sie über echte Jobs entscheiden. „Schreibgeschützt“ bedeutet, dass der Zustand der entfernten Cloud oder QPU nicht verändert wird; lokale Python-Brücken behalten dennoch ihren `workspace-write`-Vertrag, weil SDK-Caches und Ergebnisdateien in das lokale Arbeitsverzeichnis geschrieben werden können.

### Rechenparameter

Innerhalb der unterstützten Modelle und Eingaben jedes Werkzeugs wählen Sie Qubit-Zahl, Schaltungstiefe, Hamilton-Terme, Stichprobengröße und Iterationsbudget. Verfügbare Parameter und Größen folgen der jeweiligen Werkzeugschnittstelle und hängen von Algorithmus, Backend und Rechenressourcen ab; ein begrenzter Referenzfall legt nicht den Umfang jedes Werkzeugs fest.

Hauptrechnung und exakter Vergleich sind getrennt: Sie können direkt Schaltungen optimieren, MBQC-Muster erzeugen, Symmetrien reduzieren, Lie-Algebren analysieren oder Tensoralgorithmen ausführen und mit `referenceMode` automatische, erzwungene oder übersprungene unabhängige Referenzen wählen. Parameter, Rückgabewerte und Ressourceneinstellungen stehen im [Leitfaden für lokales Rechnen](../integrations/SCALABLE_BRIDGES.md). Eingaben, Versionen und Ergebnisse lokaler Prüfungen sind in den Protokollen jeder Integration zur Reproduktion abgelegt.

Weitere kopierbare Aufgaben zu Schaltungen, Grundzuständen, Rauschen, Dynamik und Benchmark-Abfragen finden Sie in der [chinesischen Nachschlagewerk](../EXAMPLES.md#更多可复制的计算任务).

<a id="execution-records-and-scientific-acceptance"></a>

### Methoden und Ergebnisse, die Sie weiter nutzen können

Die Workbench speichert für jede Aufgabe Anfrage, Werkzeugaufrufe und Rückgaben, sodass Sie den Ablauf nachvollziehen und weiterfragen können. Passen Sie Parameter an, wählen Sie ein anderes verbundenes Backend oder machen Sie häufige Forschungsschritte zu einem Skill für spätere Aufgaben.

Bei unterstützten Funktionen werden Ergebnisse mit exakten Referenzen, unabhängigen Prüfungen oder Angaben zum statistischen Fehler geliefert. Grundzustandsberechnungen und Prüfungen der Quanteninformation bieten zusätzlich einen vollständigen Ablauf zur wissenschaftlichen Abnahme, der Eingaben, Ergebnisdateien und Sitzungsherkunft zur Prüfung verknüpft.

<details>
<summary><strong>Ausführungsprotokolle und wissenschaftliche Abnahme im Detail</strong></summary>

Der Forschungsarbeitsbereich protokolliert Aufgabenanfragen, das Laden von Skills, Werkzeugaufrufe, Berechtigungsstatus und Rückgaben. „Aktiviert“ in den Einstellungen ist nur eine Konfigurationsrichtlinie; ob ein Werkzeug aufrufbar und ein Dienst erreichbar ist, zeigen die Laufbelege.

Abschluss eines Laufs und wissenschaftliche Abnahme werden als getrennte Zustände angezeigt. Funktionen mit vollständigem Abnahmeablauf verknüpfen Eingaben, Ergebnisdateien, unabhängige Prüfungen und Sitzungsprotokolle zu einem Abnahmebericht, der bestandene, nicht bestandene und nicht geprüfte Punkte auflistet; andere Werkzeuge melden numerische Ergebnisse und Prüfstatus im eigenen Rahmen.

![Von Ergebnissen über Materialisierung von Belegen und unabhängige Prüfungen zur wissenschaftlichen Abnahme aus Regeln und Herkunft](../images/openquantum-evidence-flow.png)

Das Diagramm zeigt, wie Funktionen mit vollständiger Abnahme Belege bilden; [siehe die bearbeitbare Quelle](../architecture/openquantum-evidence-flow.html). Begrenzte Grundzustandsberechnungen und Prüfungen der Quanteninformation bieten den vollständigen Ablauf; QUBO, Schaltungsäquivalenz und Speicherexperimente zur Fehlerkorrektur melden Ergebnisse und Prüfungen nach eigenen Regeln. Belege finden Sie in den [Funktionsdeklarationen](../../.agents/capability-packages.yml), dem [Architektur-Audit](../architecture/ARCHITECTURE_AUDIT.md) und dem [festen Benchmark der Quantenfunktionen](../../benchmarks/quantum-capabilities/README.md).

</details>

### Häufige Fragen

- Brauche ich ein Konto für einen Quantencomputer oder einen Modellschlüssel? Siehe das [lokale Beispiel](#no-model-key-needed-recompute-a-fixed-case), die [Modellkonfiguration](#configure-a-model) und [Quantenclouds](#local-computing-and-quantum-clouds).
- [Muss ich zuerst jedes SDK lernen?](#give-ai-access-to-specialist-research-capabilities)
- [Bedeutet eine reine Textantwort, dass die Berechnung gelaufen ist?](#let-the-agent-run-a-task-prepare-and-sample-a-bell-state)
- [Nach dem Upgrade soll ich eine Umgebung vorbereiten. Was nun?](#upgrade-an-existing-source-installation)
- [Algorithmusbeispiele oder fachliche Rechenwerkzeuge?](#choose-the-right-entry-point)
- [Gibt es in Quantum Learning schon vollständige Kurse?](#quantum-learning)

<a id="extend-the-platform"></a>

## Die Plattform erweitern

**Machen Sie Ihre Quantensoftware zu einer Funktion, die Agenten nutzen können, und bringen Sie vollständige Anwendungen auf eine offene Plattform.** Die agentenfähigen Erweiterungswege von OpenQuantum sind: Arbeitsmethoden in einem Skill beschreiben; Rechenprogramme als native Tools oder über einen MCP Server anbinden; und, wo unabhängige wissenschaftliche Prüfungen nötig sind, einen Validator mit seinem Belegfluss ergänzen. Vollständige Anwendungen werden entlang ihrer eigenen Geschäfts- und Datengrenzen integriert, statt in einzelne Tools zerlegt zu werden.

Die Fachfunktionen von OpenQuantum laufen auf DeepSeek Harness, das allgemeine Agentenausführung, Werkzeugplanung, Modellverbindungen und Ausführungsprotokolle übernimmt. Eine zweite Agentenlaufzeit wird nicht eingeführt. Gehen Sie von der Aufgabe aus, die Nutzende lösen müssen, und wählen Sie dann die Erweiterung:

| Was hinzukommen soll | Wohin es gehört |
| --- | --- |
| Fachwissen, Schritte, Werkzeugwahl und Ergebnisinterpretation | Ein Skill, der vorhandene allgemeine oder Quanten-Tools wiederverwenden kann |
| Eine stabile Berechnung, Abfrage oder Operation | Ein Tool, registriert durch einen nativen Tool Provider oder den Harness MCP Client |
| Eine Quantenanwendung oder ein Lehrprodukt mit eigener Oberfläche und eigenem Ablauf | Integration entlang der Anwendungsgrenze, unter Wahrung ihrer Zuständigkeiten für Geschäftslogik, Daten, Berechtigungen und Backends; Quantum Learning ist das vorhandene Beispiel |
| Unabhängige wissenschaftliche Prüfung und Abnahme | Ein Validator; für die endgültige Abnahme zusätzlich ein Acceptance Profile, die Materialisierung von Belegen und der zentrale Acceptance Builder |

Vorhandene Skills, Brücken und native Tools dienen als Referenz. Lesen Sie zuerst den [Überblick über Dokumentation und Architektur](../README.md), dann nach Bedarf den [Beitragsleitfaden](../../CONTRIBUTING.md), das [Erweiterungsmodell](../architecture/EXTENSION_MODEL.md) und die [Modulübersicht](../architecture/MODULES.md).

<a id="quantum-applications-for-practical-problems"></a>

### Quantenanwendungen für praktische Probleme

OpenQuantum integriert nicht nur SDKs, Algorithmen und Rechendienste, sondern auch vollständige Anwendungen für bestimmte Zielgruppen und Probleme. Eine Anwendung kann ihre eigene Oberfläche, ihren Ablauf, ihre Datenverwaltung und Ergebnisdarstellung behalten und sich über ausdrückliche Ausführungsschnittstellen mit Agenten verbinden, wo Zusammenarbeit sinnvoll ist.

Künftige Anwendungen könnten etwa Planungsoptimierung oder Molekül- und Materialberechnungen abdecken: Nutzende reichen ein reales Problem ein, prüfen die Eingabebedingungen und lesen Ergebnisse samt Geltungsbereich, statt einen Ablauf aus einzelnen Algorithmen zusammenzusetzen. Das sind Richtungen, keine Liste gelieferter Anwendungen. [Quantum Learning](#quantum-learning) ist die vorhandene Integration einer vollständigen Anwendung; bei anderen müssen Datenberechtigungen, Backends, Kosten und Prüfumfang im Einzelfall geklärt werden. Ob eine Anwendung eine echte QPU nutzt oder klassische Methoden übertrifft, entscheiden ihre eigenen Laufprotokolle und Vergleiche.

<details>
<summary><strong>Architektur und Zuständigkeiten</strong></summary>

![OpenQuantum-Architektur: Forschungseinstiege erreichen Harness; der Agent liest Skills, nutzt Werkzeuge über native Tool Provider oder den Harness MCP Client und verbindet Modelldienste und das Ausführungsprotokoll](../images/openquantum-platform-overview.png)

Das Diagramm zeigt die zentralen Aufrufbeziehungen der Workbench; [siehe die bearbeitbare Quelle](../architecture/openquantum-platform-overview.html).

- Ein **Skill** liefert Wissen und Workflow-Anweisungen; er führt keinen Code aus und hält keine Zugangsdaten.
- Ein **Tool Provider** registriert ausführbare Werkzeuge, nativ im Prozess oder über den Harness MCP Client für einen MCP Server.
- Ein **Scientific Validator** erzeugt Beobachtungen; ein Acceptance Profile definiert Regeln, und nur der zentrale Acceptance Builder leitet aus Beobachtungen und Herkunft die endgültige Abnahme ab. In Entwicklungsdokumenten bezeichnet `L3` einen wiederholbaren vollständigen Abnahmeablauf; es bedeutet nicht, dass jeder Aufruf abgenommen wurde.
- Ein **Agent Preset** kombiniert die benötigten Skill Providers, Tool Providers und Agentenrichtlinien.

Bevorzugen Sie native Tool Provider für Aktionen im selben Prozess und in derselben Sprache ohne Isolationsbedarf; nutzen Sie einen MCP Server für sprachübergreifende, prozessgetrennte oder entfernte Bereitstellungen. Harness setzt Erweiterungen über Cordis Plugins zusammen, und UI, Modellverbindungen, Quantenrechnung und wissenschaftliches Urteil behalten getrennte Zuständigkeiten.

</details>

Der vollständige Katalog der Skills, MCP-Dienste und nativen Tools wird in der [chinesischen Nachschlagewerk](../CAPABILITIES.md#接口总览) gepflegt: Der aktuelle Quellcode liefert **187 integrierte Skills** (174 automatisch auswählbar, 13 manuelle Kategorieindizes), **91 MCP-Dienstverbindungen** (66 standardmäßig aktiv, 25 Opt-in) und **5 native Quanten-Tools**.

<a id="development-and-verification"></a>

### Entwicklung und Prüfung

<details>
<summary><strong>Konfigurationsprüfungen, numerische Regressionen und End-to-End-Tests</strong></summary>

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

Wählen Sie die für Ihre Änderung relevanten Prüfungen; die vollständige Liste steht in der [chinesischen Nachschlagewerk](../EXAMPLES.md#开发与验证). Tests und lokale Belege sind etwas anderes als ein veröffentlichtes Release oder eine wissenschaftliche Abnahme. Änderungen des Release stehen in den [Versionshinweisen zu v0.8.4](../releases/v0.8.4.md).

</details>

Der [offizielle `pyqpanda3`-Skill von OriginQ](https://github.com/OriginQ/pyqpanda3-skill) ist ein optionaler Upstream-Skill: Er zählt nicht zu den 187 integrierten Skills und wird nicht automatisch installiert. `npm run skill:qpanda:setup` installiert die geprüfte Version; damit wird weder `qpanda_runtime` aktiviert noch eine Berechtigung für Cloud-Jobs erteilt.

<a id="roadmap-and-rsi"></a>

## Roadmap und RSI

**Von der Nutzung vorhandener Funktionen zur gemeinsamen Entwicklung neuer.** Wir bauen weiter an einer offenen Agenten- und Anwendungsplattform für Quantentechnologie, auf der Fachmethoden, Rechenressourcen, vollständige Anwendungen, Laborinstrumente und Lernressourcen jeweils einen eigenen Zugang haben und innerhalb ihres Rahmens zusammenwirken. Das sind langfristige Richtungen, keine Lieferliste; Funktionen kommen durch einzelne Integration und Prüfung hinzu.

### Grundlagen der Plattform

| Langfristiger Strang | Woran wir weiter arbeiten |
| --- | --- |
| **0 · Ein nützlicherer Quantenagent** | Aufgabenverständnis, Methodenwahl, Werkzeugaufrufe, Ergebnisinterpretation und Fehlerbehebung verbessern, von der Anfrage bis zur tatsächlichen Berechnung. Fortschritt messen wir an Qualität, Zeit und Kosten bei der Erledigung realer Aufgaben. |
| **1 · Ein agentenfähiges Quantensoftware-Ökosystem** | Fortlaufend Fachsoftware anbinden und Ausführungsschnittstellen, Fach-Skills und Abhängigkeitsvorbereitung verbessern, damit Werkzeuge aufrufbar und Methoden wiederverwendbar werden, mit erhaltenen Anwendungsbedingungen und Prüfprotokollen. |
| **2 · Workflows aus Quanten, HPC und KI** | Lokale CPUs, entfernte GPUs, HPC, Quantensimulatoren und QPUs verbinden und von Agenten organisierte quantenklassische Berechnungen erkunden. Ressourcen nach Größe, Genauigkeit, Zeit und Budget wählen und Backends, Orchestrierung und koordinierte Ausführung schrittweise prüfen. |
| **3 · Schnittstellen für intelligente Laborinstrumente** | Standardisierte Geräteschnittstellen vorbereiten, programmierbare Instrumente schrittweise anbinden und Gerätesuche, Experimentsteuerung, Messanalyse und Rückkopplung erkunden, um Berechnung und reale Experimente zu verbinden. |

### Anwendungen und Lehre

| Langfristiger Strang | Woran wir weiter arbeiten |
| --- | --- |
| **4 · Mehr hochwertige Kurse** | Eine Wissenslandkarte von den Grundlagen bis zur Forschungsfront aufbauen, mit Kursen für Einsteiger, Fortgeschrittene und Experten, Lernen über Stufen hinweg nach Vorwissen und Interesse sowie verbundener Erklärung, praktischen Experimenten und Leistungsüberprüfung. |
| **5 · Quantenanwendungen für praktische Probleme** | Vollständige Anwendungen rund um bestimmte Probleme integrieren oder gemeinsam entwickeln, mit Problemeingabe, Rechenablauf und Ergebnisdarstellung, damit Nutzende die zugrunde liegenden Werkzeuge nicht selbst zusammensetzen müssen. Backends, Kosten, Umfang und Prüfergebnisse jeder Anwendung dokumentieren. |

### Personalisierung und Verbesserung

| Langfristiger Strang | Woran wir weiter arbeiten |
| --- | --- |
| **6 · Proaktive, persönliche Unterstützung** | Hintergrund, Interessen und Ziele jeder Person aus Lernen und Forschung verstehen, vorschlagen, was als Nächstes zu lernen oder welche Methode zu nutzen ist, und fehlende Voraussetzungen ergänzen, sodass sich Kurse und Werkzeuge an die Person anpassen. Nutzende bestimmen, welche Protokolle verwendet werden, wo sie gespeichert sind und wie sich dies abschalten lässt. |
| **7 · Forschungsfähigkeiten, die sich stetig verbessern** | Den Weg von Aufgabenerfahrung zu verbesserten Methoden und Werkzeugen und weiter zur Verbesserung des Forschungsprozesses selbst erkunden. Verbesserungen mit Vergleichen auf neuen Aufgaben, unabhängigen Prüfungen, Gesamtkosten und zurücksetzbaren Versionen testen, wie in der folgenden RSI-Richtung beschrieben. |

Die Instrumentenschnittstellen orientieren sich an Erkundungen wie Anthropics [Model Hardware Standard (MHS)](https://www.anthropic.com/news/model-hardware-standard-research-preview) und beginnen mit simulierten Geräten und gemeinsamen Experimenten; Echtzeitsteuerung und Geräteeinschränkungen bleiben bei den zuständigen Treibern und Steuerungssystemen.

<a id="rsi"></a>
<a id="research-that-improves-how-research-is-done"></a>

### Forschung, die die Art des Forschens verbessert

**Aktueller Stand: Die Plattform verfügt über Methoden, Ausführung und einen Teil der Infrastruktur für wissenschaftliche Prüfungen; der RSI-Kreislauf ist nicht umgesetzt.** Verbesserungsvorschläge, unabhängige Bewertung, Versionsabnahme und Nutzen über mehrere Runden müssen erst aufgebaut und geprüft werden; die [Grenzen von Architektur und Belegen](../README.md) bleiben die Grundlage dafür, was heute existiert.

**Forschung sollte nicht nur Antworten hinterlassen, sondern auch Methoden und Werkzeuge, die die nächste Untersuchung verbessern.** Wir möchten rekursive Selbstverbesserung (RSI) für die Quantenwissenschaft erkunden: Das System erkennt eigene Grenzen, schlägt Verbesserungskandidaten vor und setzt sie nach Prüfung in späteren Aufgaben ein; das verbesserte System erzeugt und prüft dann die nächste Runde von Verbesserungen wirksamer.

| Ebene | Veränderung, die wir ansammeln möchten |
| --- | --- |
| Über Aufgaben hinweg | Autorisierte Aufgabenerfahrung in wiederverwendbare Methoden, Fälle und Fehlergrenzen verwandeln, nicht nur in Chatprotokolle. |
| Verbesserung von Funktionen | Änderungen an Methodenwahl, Werkzeugimplementierung oder Workflow vorschlagen und auf neuen Aufgaben testen, ob Qualität, Zuverlässigkeit oder Kosten besser werden. |
| Rekursive Selbstverbesserung | Die Methoden verbessern, die Verbesserungen hervorbringen, etwa Experimentdesign, Kandidatensuche und unabhängige Prüfung, und testen, ob die nächste Runde effizienter wird. |

Der angedachte Kreislauf lautet **reale Aufgabe → Verbesserungskandidat → unabhängige Prüfungen und Vergleiche auf neuen Aufgaben → autorisierte Versionsaktualisierung → nächste Forschungsrunde.**

So könnte eine Schaltungsaufgabe nicht nur eine optimierte Schaltung liefern, sondern auch eine bessere Art, Optimierungsstrategien zu wählen. Kandidatenstrategien brauchen unabhängige Äquivalenzprüfungen und einen Vergleich mit der Vorversion auf Schaltungen, die nicht in der Entwicklung verwendet wurden; die Experimente zu verbessern, die solche Strategien finden, berührt den rekursiven Kern. Entscheidend ist, ob spätere Aufgaben tatsächlich profitieren – nicht, wie viele Skills hinzukamen, wie viel Code sich änderte oder ob ein stärkeres Modell eingesetzt wurde.

Eine Verbesserung muss mit einer Version verglichen werden, die sie nicht geerbt hat; dabei sind Basismodell, menschliche Beteiligung sowie gesamter Verbesserungs- und Nutzungsaufwand unter vergleichbaren Bedingungen anzugeben und Regressionen zu prüfen. Ein Kandidatensystem darf seine eigenen Abnahmeregeln nicht lockern, Fehlerbelege nicht löschen und seine Berechtigungen nicht erweitern; unabhängige Bewertung, Nutzerfreigabe, Datengrenzen und Rücksetzbarkeit sind Bedingungen für die Annahme einer Änderung. Beiträge der Community und menschliche Anleitung wirken mit und sollten nicht pauschal dem autonomen Fortschritt der KI zugeschrieben werden.

OpenQuantum möchte für diese Erkundung eine Arbeitsumgebung für Quantenforschung bereitstellen: ausführbare Werkzeuge, wiederverwendbare Methoden, prüfbare Ergebnisse und offene Schnittstellen für andere Forschungsagenten – ohne eine neue allgemeine Agentenlaufzeit zu bauen oder ein neues Basismodell zu trainieren. Eine Zusammenarbeit mit CyberEinstein, PRAgent und RunThePaper ist eine Möglichkeit für später, kein bestehender automatischer Kreislauf über Projekte hinweg. Ob sich KI- und Quantenfunktionen gegenseitig verstärken, muss an konkreten Aufgaben getestet werden, unter Einrechnung der Kosten für Präparation, Messung, Fehlerkorrektur und Datenübertragung; wir nehmen nicht an, dass Quantencomputing das Training von Basismodellen beschleunigt oder unbegrenzte Selbstverbesserung ermöglicht.

**Was wir letztlich wollen: Eine Untersuchung bringt ein neues Ergebnis hervor und hinterlässt Werkzeuge und Methoden, die der nächsten zum Erfolg verhelfen.**

<a id="documentation-and-support"></a>

## Dokumentation und Unterstützung

**Alle sind eingeladen, vertrauenswürdige KI für die Quantenforschung mitzugestalten.** Melden Sie Probleme, tragen Sie Code bei, binden Sie Werkzeuge an, teilen Sie Methoden und Reproduktionsfälle und helfen Sie, das Fachwissen der Community mehr Forschenden zugänglich zu machen. Ein reproduzierbarer Fall, ein geprüftes negatives Ergebnis, eine Korrektur, die wiederholte Einrichtung erspart, oder ein Experiment, das Lernende selbst ausprobieren lässt – all das kann der Anfang der nächsten Arbeit sein.

| Was Sie vorhaben | Hier beginnen |
| --- | --- |
| Die Plattform nutzen und ihre Funktionen verstehen | [Dokumentationsindex](../README.md), [Bereitstellung](../DEPLOYMENT.md), [Fehlerbehebung](../TROUBLESHOOTING.md) |
| Skills, Werkzeuge und wissenschaftliche Prüfungen beitragen | [Plattform erweitern](#extend-the-platform), [Beitragsleitfaden](../../CONTRIBUTING.md) |
| Anwendungen integrieren, Kurse und Experimente erstellen | [Praktische Anwendungen](#quantum-applications-for-practical-problems), [Quantum Learning](#quantum-learning) |
| Probleme melden oder den Projekthintergrund kennenlernen | [GitHub Issues](https://github.com/xi-zhao/OpenQuantum/issues), [Projektgeschichte (Chinesisch)](../communications/openquantum-wechat-launch.md) |

Nennen Sie bei Beiträgen Quellen, Autorinnen und Autoren, Lizenzen, Bedingungen und Prüfumfang und teilen Sie nur autorisiertes Material. Private Sitzungen und unveröffentlichte Daten sind standardmäßig nicht öffentlich, und Zugangsdaten gehören nie in Beiträge. Sicherheitsprobleme melden Sie vertraulich gemäß der [Sicherheitsrichtlinie](../../SECURITY.md).

Ausführliche technische Dokumente liegen überwiegend auf Chinesisch vor; die ausführliche [englische Fassung](./README.en.md) dieser README steht ebenfalls zur Verfügung. Hinweise zur Verbesserung dieser Übersetzung sind willkommen.

**[Eine Quantenerkundung beginnen](#quick-start)** · [Eigene Methoden und Anwendungen einbringen](#extend-the-platform)

**OpenQuantum · Quantencomputing zum Greifen nah.**

<a id="license-and-acknowledgments"></a>

## Lizenz und Danksagung

Die Quantenfunktionen von OpenQuantum bauen auf offener Wissenschaft und Open-Source-Software auf. Wir pflegen Fach-Skills, MCP-Brücken, native Tools und zutreffende wissenschaftliche Prüfungen; zugrunde liegende Algorithmenbibliotheken, externe Dienste und Anwendungsgrundlagen behalten ihre eigenen Urheber, Projektnamen und Lizenzen.

| Genutztes oder adaptiertes Projekt | Rolle in OpenQuantum |
| --- | --- |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | Agentenlaufzeit und native Web UI des Forschungsarbeitsbereichs: Sitzungen, Modellaufrufe, Werkzeugplanung und Ausführungsprotokolle |
| [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop) | Grundlage des Desktop-Clients; OpenQuantum passt Marke und Startkonfiguration an und nutzt die Workbench mit |
| [CC Connect](../integrations/CC_CONNECT.md) | Messaging-Brücke, die Anfragen aus WeChat, Feishu und weiteren Kanälen in die Workbench bringt |
| [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) | Lehrgrundlage von Quantum Learning, mit vollständiger Oberfläche, Server und Lehrabläufen, ergänzt um OpenQuantum-Namen, -Design und -Modellanbindung |

Die Rechen-, Geräte- und Referenzprojekte hinter jeder Funktion und die Art ihrer Adaption sind in der [chinesischen Nachschlagewerk](../CAPABILITIES.md#开源生态与致谢) aufgeführt.

Der eigene Code von OpenQuantum steht unter der [MIT-Lizenz](../../LICENSE), mit Ausnahme separat lizenzierter Verzeichnisse. Das [Funktionsverzeichnis zur Fehlerminderung mit Mitiq](../../.agents/skills/mitiq-error-mitigation/) steht unter GPL-3.0-only, der [öffentliche Daten-Snapshot von Metriq](../../src/metriq-data/upstream/) unter CC-BY-4.0, jeweils mit eigener LICENSE und NOTICE. DeepSeek Harness, DSH Desktop, OpenMAIC, FatQat, Qiskit MCP Servers, FieldQKit, Quantum Hardware MCP und weitere Drittkomponenten behalten ihre eigenen Lizenzen; lesen Sie [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md), bevor Sie weiterverteilen oder eine optionale Integration aktivieren. Quellen von Screenshots und Diagrammen stehen in den [Bildhinweisen](../images/README.md).
