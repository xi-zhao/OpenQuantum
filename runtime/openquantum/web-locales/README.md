# OpenQuantum interface languages

The pinned Desktop 2.0.0 / Harness 0.1.0-rc.6 interface supports Simplified Chinese (`zh`) and English (`en`). The eight other translation catalogs and all ten README editions remain in the repository; they are not advertised as selectable languages in this baseline.

Select **Settings → General → Language**. Harness owns the selector, active language, settings persistence and rendering subscriptions. This package registers dictionaries only for languages already supported by the pinned runtime, using its public `locale.register` interface. It does not call the later `locale.addLanguage` API. It does not edit Harness dependencies or maintain another preference store. Unavailable keys from future plugins fall back to English.

`languages.json` maps the workbench language IDs to OpenMAIC's regional IDs. The learning iframe follows the Harness selection, and its own language selector sends a bounded selection back to Harness. Both directions require the expected window, exact origin, channel and registered language. Embedded changes do not overwrite the standalone OpenMAIC preference. Document language and writing direction update together; Arabic uses RTL. Technical identifiers, command inputs and code retain LTR direction.

## Catalog maintenance

- `harness-source.json` records the source key contracts of Harness `0.1.0-rc.6` and Desktop `2.0.0` (`ee1235e1dd1675bbd6c52cfbe3f27b27bcfcfa81`). Retain namespace ownership when upgrading.
- `src/settings/locales/openquantum-source.json` owns capability settings, messaging channels and the learning launcher. Chinese source phrases remain stable keys for existing settings copy.
- `locales/*.json` contains deduplicated translations keyed by English source text. The first edition reuses matching OpenMAIC strings and includes drafts produced with local Argos Translate models; these translations have not received a complete native-speaker review.
- `translation-review.json` records sequential AI retranslation and semantic review of all 1219 migration phrases plus 59 phrases extracted from the actual pinned Desktop source: 1278 phrases in each of eight languages (10224 translations). That historical review is retained alongside the active baseline and 36 additional phrases recovered from 0.1.0-rc.6. The original Argos draft provenance is retained, but those drafts have been replaced. No subagents or external translation provider were used. This is **not human native-speaker certification**, and it does not certify older entries outside this list. Source and translation SHA-256 digests bind the review to the recorded wording.
- `reviewed.json` overrides frequent navigation, settings, learning labels and full-access confirmation copy. Review terminology and sentence meaning as well as syntax when changing translations. The homepage taglines live with the canonical brand identity.
- `licenses/` retains upstream MIT notices for reused source dictionaries and translations. Translation models and the local translation environment are not distributed and are not runtime dependencies.

Interface selection does not rewrite conversations, course materials, user-authored Skill metadata, external errors, tool results or model responses. Those are content, separate from interface copy. Built-in capability catalog descriptions are translated when their exact source text is known. Detailed scientific claims remain bounded by each integration's original contract.

Run `node --test tests/ui-locales.test.mjs` for catalog/placeholder coverage, the actual pinned Harness locale runtime, persistence restoration, fallback, disposal and iframe boundary checks. Use the real app to check layout and wording, especially long labels and RTL. README language editions live in `docs/readme/` and link back to the detailed Chinese/English documentation.

### Routine changes and upstream upgrades

1. Add application copy to `src/settings/locales/openquantum-source.json` in both source languages and call it through the owned namespace. Preserve existing keys when only wording changes; use descriptive keys for new modules. Do not put language branches into components.
2. Update the English-phrase entries in each `locales/<id>.json`. Check `reviewed.json` for an override: it takes precedence and is the place to maintain those reviewed phrases. Do not mark untranslated English as a completed translation; keep proper names unchanged.
   For a phrase in `translation-review.json`, re-read its source context, review all affected wording and update the corresponding digest after review, not as an automatic way to silence a test. Check referenced labels against the effective dictionary, including overrides. External plugin labels may remain English; retain their actual name in translated instructions.
3. Run `npm run locales:check`. It compares every installed Harness client locale registration against the source snapshot, then checks language/key coverage, named interpolation parameters, README links and startup commands, persisted switching and iframe boundaries. It is part of `npm run check`, so CI checks it on every pull request.
4. When upgrading Harness or Desktop, run `npm run locales:sync` after installing the new pinned source. Review the added, removed and changed keys, then update translations. This command only updates the source contract; it does not generate translations or silently accept missing copy. New registration syntax fails explicitly and must be reviewed in `scripts/lib/harness-locale-source.mjs`.
5. A Web-only installation skips the optional Desktop source check. `npm run desktop:verify-install` requires it in both Desktop CI jobs. Keep the Desktop version, source revision and bounded presentation patches aligned. No checker executes upstream UI code or edits installed dependencies.
   The ACP messaging entry point shares the home but has no browser host. Keep this browser-only plugin disabled in `runtime/openquantum/cc-connect/cordis.yml`, alongside the other Web extensions; the ACP integration test exercises that boundary.
6. Adding a language starts in `languages.json`. Add its catalog import, translations, brand tagline and README edition; ensure a corresponding upstream learning dictionary exists. The learning selector is generated from this same registry and fails if its source dictionary is absent. Check the actual Web and Desktop layout before delivery.

For README changes, follow [the translation guide](../../../docs/readme/TRANSLATING.md). A source catalog check cannot certify the meaning or naturalness of a translation; terminology and longer help text still need human review.

The 0.2.1 translation review and all reviewed wording are retained for provenance.
`translation-review.json.activeBaseline` binds the unchanged active subset to the restored 0.1.5 / 2.0.7 source; it does not claim a new review.
