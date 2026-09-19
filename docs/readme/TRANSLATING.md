# Maintaining translated READMEs

The root `README.md` is the detailed Chinese entry point. `README.en.md` is the detailed English edition. The other eight editions provide localized introductions, startup instructions, model configuration, Desktop, Quantum Learning and contribution guidance, with links to the detailed documentation.

When changing an installation command, requirement, product name or supported feature:

1. Update the Chinese and English descriptions together. Preserve capability limits and distinguish completed tool execution from scientific acceptance.
2. Apply the affected instructions to all editions listed in `runtime/openquantum/web-locales/languages.json`. Preserve command lines, model identifiers, URLs and credential variable names verbatim.
3. Keep the ten-language navigation on every edition. Relative links must resolve from that file's directory. The language checker verifies the navigation targets, local links and shared startup commands; it cannot detect outdated prose or certify translation quality.
4. Run `npm run locales:check` and review the Markdown diff. For UI changes, also update screenshots from the running application when the image is affected.

Use [the interface-language guide](../../runtime/openquantum/web-locales/README.md) for runtime translations. README prose is maintained separately from UI dictionaries so documentation can explain context without changing application keys. Never put machine-translated code, credentials or generated model responses into the documentation.

## Brand and reading order

Keep the category explicit: OpenQuantum is an open-source quantum agent and application platform. The Chinese lead is “让量子想法运行起来”; the English adaptation is “Put your quantum ideas to work.” The existing “量子计算，就在指尖” remains the closing signature. Translate the intent naturally without changing product or upstream names.

Explain value through supported actions: start from a question and use specialist tools; preserve results and methods for further work; contribute capabilities that others can use. Support these themes with examples and recorded evidence. Avoid unsupported uniqueness, speed, quantum-advantage or user-adoption claims. RSI remains a long-term research direction whose proposed loop is not implemented.

The detailed editions follow value → capabilities and applications → startup → results → development → roadmap → contribution → open-source acknowledgments. Compact editions may combine sections while retaining the same core claims and limitations. Keep first-run instructions together. Show core tasks, application features and product screenshots directly; use one level of expansion for setup details, technical catalogs and verification procedures. Catalogs stay complete and grouped by purpose; source, activation policy and permissions remain separate fields. Add new entries to an existing group whenever appropriate.

Grouping must preserve the substance of the value arguments and every distinct roadmap track, including its rationale and scope. Put the full explanation under its theme rather than replacing it with a short aggregate row. Do not use catalog completeness alone as evidence that a README rewrite preserves the product story.

Maintain one primary location for each installation step, capability limit, service setting and upstream attribution. Use navigation or FAQ links to that explanation instead of repeating it; value sections explain why a capability matters, while task sections explain what users can do and inspect. Preserve established anchors when moving or renaming sections, and check incoming links from all language editions and the documentation index. Catalog checks verify that regrouping retains every entry and its declared behavior. Also review value, roadmap detail and default visibility against the previous edition.
