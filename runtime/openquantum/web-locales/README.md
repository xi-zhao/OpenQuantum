# OpenQuantum interface languages

The deployment contributes Simplified Chinese (`zh`), English (`en`), Japanese (`ja`), Korean (`ko`), Spanish (`es`), French (`fr`), German (`de`), Portuguese (`pt`), Russian (`ru`) and Arabic (`ar`).

Select **Settings → General → Language**. Harness owns the selector, active language, settings persistence and rendering subscriptions. This package adds language definitions and dictionaries using the public `locale.addLanguage` and `locale.register` interfaces. It does not edit Harness dependencies or maintain another preference store. Unavailable keys from future plugins fall back to English.

`languages.json` maps the workbench language IDs to OpenMAIC's regional IDs. The learning iframe follows the Harness selection, and its own language selector sends a bounded selection back to Harness. Both directions require the expected window, exact origin, channel and registered language. Embedded changes do not overwrite the standalone OpenMAIC preference. Document language and writing direction update together; Arabic uses RTL. Technical identifiers, command inputs and code retain LTR direction.

The pinned Desktop's web settings share these dictionaries. Its operating-system menus, recovery dialogs and first-launch wizard currently ship Chinese and English only. An explicit non-Chinese preference uses English for these native dialogs, rather than reverting to the OS's Chinese. The bounded adaptation lives in the separately prepared Desktop presentation package.

## Catalog maintenance

- `harness-source.json` records the source key contracts of Harness `0.1.5-rc.1` and Desktop `2.0.7` (`5184a2ab7ab197e7405c1053feb324003409a142`). Retain namespace ownership when upgrading.
- `openquantum-source.json` owns capability settings, messaging channels and the learning launcher. Chinese source phrases remain stable keys for existing settings copy.
- `locales/*.json` contains deduplicated translations keyed by English source text. The first edition reuses matching OpenMAIC strings and includes drafts produced with local Argos Translate models; these translations have not received a complete native-speaker review.
- `reviewed.json` overrides frequent navigation, settings, learning labels and full-access confirmation copy. Review terminology and sentence meaning as well as syntax when changing translations. The homepage taglines live with the canonical brand identity.
- `licenses/` retains upstream MIT notices for reused source dictionaries and translations. Translation models and the local translation environment are not distributed and are not runtime dependencies.

Interface selection does not rewrite conversations, course materials, user-authored Skill metadata, external errors, tool results or model responses. Those are content, separate from interface copy. Built-in capability catalog descriptions are translated when their exact source text is known. Detailed scientific claims remain bounded by each integration's original contract.

Run `node --test tests/ui-locales.test.mjs` for catalog/placeholder coverage, the actual pinned Harness locale runtime, persistence restoration, fallback, disposal and iframe boundary checks. Use the real app to check layout and wording, especially long labels and RTL. README language editions live in `docs/readme/` and link back to the detailed Chinese/English documentation.

### Routine changes and upstream upgrades

1. Add application copy to `openquantum-source.json` in both source languages and call it through the owned namespace. Preserve existing keys when only wording changes; use descriptive keys for new modules. Do not put language branches into components.
2. Update the English-phrase entries in each `locales/<id>.json`. Check `reviewed.json` for an override: it takes precedence and is the place to maintain those reviewed phrases. Do not mark untranslated English as a completed translation; keep proper names unchanged.
3. Run `npm run locales:check`. It compares every installed Harness client locale registration against the source snapshot, then checks language/key coverage, named interpolation parameters, README links and startup commands, persisted switching and iframe boundaries. It is part of `npm run check`, so CI checks it on every pull request.
4. When upgrading Harness or Desktop, run `npm run locales:sync` after installing the new pinned source. Review the added, removed and changed keys, then update translations. This command only updates the source contract; it does not generate translations or silently accept missing copy. New registration syntax fails explicitly and must be reviewed in `scripts/lib/harness-locale-source.mjs`.
5. A Web-only installation skips the optional Desktop source check. `npm run desktop:verify-install` requires it in both Desktop CI jobs. Keep the Desktop version, source revision and bounded presentation patches aligned. No checker executes upstream UI code or edits installed dependencies.
   The ACP messaging entry point shares the home but has no browser host. Keep this browser-only plugin disabled in `runtime/openquantum/cc-connect/cordis.yml`, alongside the other Web extensions; the ACP integration test exercises that boundary.
6. Adding a language starts in `languages.json`. Add its catalog import, translations, brand tagline and README edition; ensure a corresponding upstream learning dictionary exists. The learning selector is generated from this same registry and fails if its source dictionary is absent. Check the actual Web and Desktop layout before delivery.

For README changes, follow [the translation guide](../../../docs/readme/TRANSLATING.md). A source catalog check cannot certify the meaning or naturalness of a translation; terminology and longer help text still need human review.
