# Maintaining translated READMEs

The root `README.md` is the detailed Chinese entry point. `README.en.md` is the detailed English edition. The other eight editions provide localized introductions, startup instructions, model configuration, Desktop, Quantum Learning and contribution guidance, with links to the detailed documentation.

When changing an installation command, requirement, product name or supported feature:

1. Update the Chinese and English descriptions together. Preserve capability limits and distinguish completed tool execution from scientific acceptance.
2. Apply the affected instructions to all editions listed in `runtime/openquantum/web-locales/languages.json`. Preserve command lines, model identifiers, URLs and credential variable names verbatim.
3. Keep the ten-language navigation on every edition. Relative links must resolve from that file's directory. The language checker verifies the navigation targets, local links and shared startup commands; it cannot detect outdated prose or certify translation quality.
4. Run `npm run locales:check` and review the Markdown diff. For UI changes, also update screenshots from the running application when the image is affected.

Use [the interface-language guide](../../runtime/openquantum/web-locales/README.md) for runtime translations. README prose is maintained separately from UI dictionaries so documentation can explain context without changing application keys. Never put machine-translated code, credentials or generated model responses into the documentation.
