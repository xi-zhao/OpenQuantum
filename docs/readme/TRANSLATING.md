# Maintaining translated READMEs

The root `README.md` is the detailed Chinese entry point. `README.en.md` is the detailed English edition. The other eight editions are full translations of the English edition: they keep its sections, tables, numbers, limits and in-page anchor ids (explicit `<a id>` tags before translated headings), and link to the Chinese README for complete catalogs.

When changing an installation command, requirement, product name or supported feature:

1. Update the Chinese and English descriptions together. Preserve capability limits and distinguish completed tool execution from scientific acceptance.
2. Apply the affected instructions to all editions listed in `runtime/openquantum/web-locales/languages.json`. Preserve command lines, model identifiers, URLs and credential variable names verbatim.
3. Keep the ten-language navigation on every edition. Relative links must resolve from that file's directory. The language checker verifies the navigation targets, local links and shared startup commands; it cannot detect outdated prose or certify translation quality.
4. Run `npm run locales:check` and review the Markdown diff. For UI changes, also update screenshots from the running application when the image is affected.

Use [the interface-language guide](../../runtime/openquantum/web-locales/README.md) for runtime translations. README prose is maintained separately from UI dictionaries so documentation can explain context without changing application keys. Never put machine-translated code, credentials or generated model responses into the documentation.

## Brand and reading order

Keep the category explicit: OpenQuantum is an open-source AI platform for quantum research, open to collaboration. The Chinese lead is “OpenQuantum，共建可信的量子科研智能。”; the English adaptation is “OpenQuantum — Building trustworthy AI for quantum research, together.” The supporting line is “把量子科研的专业积累，汇聚到一个 OpenQuantum”. Translate the intent naturally without changing product or upstream names. The existing “量子计算，就在指尖” remains the closing signature.

Introduce OpenQuantum through its research value: broad specialist coverage, measured performance improvements and open collaboration. Explain the community's software, algorithms and published methods alongside OpenQuantum's integration, adaptation, optimization and verification work. Use a confident brand voice; invite participation without a founder biography or defensive declarations about attribution. Present trustworthiness through inspectable methods, calculations and result checks. Keep dependency preparation, model setup and scientific acceptance conditions explicit in their existing sections.

Present promotional cases through the research task, delivered work, measured benefit and result checks. Keep implementation details in the linked case report. Keep measurement scope and evidence links alongside numerical claims.

Explain value through supported actions: start from a question and use specialist tools; preserve results and methods for further work; contribute capabilities that others can use. Support these themes with examples and recorded evidence. Avoid unsupported uniqueness, speed, quantum-advantage or user-adoption claims. RSI remains a long-term research direction whose proposed loop is not implemented.

The detailed editions follow value → capabilities and applications → startup → results → development → roadmap → contribution → open-source acknowledgments. Keep first-run instructions together. Show core tasks, application features and product screenshots directly; use one level of expansion for setup details, technical catalogs and verification procedures. Catalogs stay complete and grouped by purpose; source, activation policy and permissions remain separate fields. Add new entries to an existing group whenever appropriate.

Grouping must preserve the substance of the value arguments and every distinct roadmap track, including its rationale and scope. Put the full explanation under its theme rather than replacing it with a short aggregate row. Do not use catalog completeness alone as evidence that a README rewrite preserves the product story.

Maintain one primary location for each installation step, capability limit, service setting and upstream attribution. Use navigation or FAQ links to that explanation instead of repeating it; value sections explain why a capability matters, while task sections explain what users can do and inspect. Preserve established anchors when moving or renaming sections, and check incoming links from all language editions and the documentation index. Catalog checks verify that regrouping retains every entry and its declared behavior. Also review value, roadmap detail and default visibility against the previous edition.

Describe measured performance cases as targeted optimizations of specific research calculations. Lead with complete-call speedups and result checks; implementation-language details belong in the technical case records.

## Terminology and number formats

Write for native readers of each language rather than mirroring the Chinese or English sentence structure. Keep product, upstream, API and UI label names as they appear in the software (Skill, Tool, MCP, Harness, Acceptance Profile, “OpenQuantum settings”, “Service keys”); explain a UI label in the target language at first use when helpful.

Shared rules:

- **Software features vs. research capacity.** Use the target language's word for a software feature when the text means a feature, package or catalog entry. Keep the word for capability or capacity only for research capacity, for example “research capabilities”.
- **Workbench.** Use one term per language for the research workbench and do not reuse it for a local working directory.
- **Entry point.** Avoid literal “entry” or “entrance” calques. Name the concrete thing instead: access option, launch method, launch icon, update function, settings page or tool.
- **Scientific acceptance.** Keep the established term and define it once, at its first occurrence, as the finding that a result is scientifically reliable based on independent checks and complete provenance. Keep it separate from completed tool execution.
- **Evidence materialization.** Write “generating and storing evidence” or “writing result files”, not a literal “materialization”.
- **Pauli strings.** Use the field's term for Pauli strings, not “Pauli words”.
- **Original upstream client.** Call the unmodified DSH Desktop “official” or “original” in the target language, distinct from “native” SDKs and Tools.
- **Delivered work.** Describe case results as produced or obtained, not “delivered”.

| Language | Feature | Workbench | Scientific acceptance | Numbers |
| --- | --- | --- | --- | --- |
| 日本語 | 機能（機能パッケージ） | ワークベンチ | 科学的受入れ | `5.09×`, `4,368`; full-width colon after bold labels |
| 한국어 | 기능 | 워크벤치 | 과학적 승인 | `5.09배`, `4,368` |
| Español | función | entorno de investigación | aceptación científica | `5.09×`, `4368` |
| Français | fonctionnalité | environnement de recherche | acceptation scientifique | `5,09×`, `30,62 ms`, `4 368`, `1,42 · 10⁻¹⁴` |
| Deutsch | Funktion (Funktionspaket) | Workbench | wissenschaftliche Abnahme | `5,09×`, `30,62 ms`, `4368`, `1,42 · 10⁻¹⁴` |
| Português | recurso | ambiente de trabalho | aceitação científica | `5,09×`, `30,62 ms`, `4.368`, `1,42 · 10⁻¹⁴` |
| Русский | возможность | исследовательская среда | научная приёмка | `в 5,09 раза`, `30,62 мс`, `4368`, `1,42 · 10⁻¹⁴` |
| العربية | وظيفة | بيئة العمل | القبول العلمي | `5.09×`, `4,368`; «الرسمي» for the original client, «الأصلية» for native |

Language-specific notes:

- **日本語:** avoid Chinese calques such as 原版, 入口, 物化, 納品 and 本機, and omit あなた where Japanese naturally drops the subject.
- **Deutsch:** write Nutzende, Surface Codes, Circuit Cutting and samplen.
- **Português:** use Brazilian Portuguese consistently (usuário, arquivo, tela, registro).
- **Русский:** a multiplier with «в» takes «раза», not «×».
- **Español, Português and Русский:** keep the established informal or formal address (tú, você, вы).

When a number format changes, keep the value and significant digits identical to the English edition and check every occurrence, including tables, headings and image alt text.
