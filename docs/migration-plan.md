# Mandai → AEM EDS + Universal Editor: inventory and migration plan

## Context

Two sibling repos on this machine are **one system**, not two projects:

- **`Mandai-EMP-Frontend`** (this repo) — a Sutrix "fe-template" static prototype. Pug → HTML, LESS → CSS, jQuery + RequireJS, built by Grunt (+ a small Gulp layer). No Java, no `pom.xml`, no `.content.xml`. **307 Pug blocks**, 222 LESS block files, 150 JS plugins, 249 page compositions, 112 mock-data JSON files.
- **`Mandai-AEM`** — a container of **three independent AEM 6.5 Maven reactors** (no root `pom.xml`): `wrs-aem` (356 components, uber-jar 6.5.24), `mab-aem` (122, 6.5.11), `rb-aem` (19, 6.5.11). 1691 Java files, 190+ Sling servlets.

The coupling is physical and manual: `/etc/designs/wrs/clientlib-site/css/` contains `style.css`, `style-cn.css`, `style-jp.css`, `style-kr.css`, `myday.css` — exactly the LESS entry points from `app/styles/`. The frontend team runs `gulp dist`; the output is copied into the AEM repo by hand. **Dissolving that handoff is the real point of moving to EDS**, where markup, CSS and the authoring model live together in one block folder.

Neither repo has **any** EDS or Universal Editor instrumentation today: zero `data-aue-*`, no `component-definition.json` / `component-models.json` / `component-filters.json`, no `blocks/`, no `fstab.yaml`. Neither has `AGENTS.md` or `CLAUDE.md`.

A working reference sits next door at `~/Desktop/new-eds/sg-enable-aem`: AEM archetype 57, AEMaaCS, with `AGENTS.md`, `CLAUDE.md`, `skills-lock.json` and `../generate-project.sh`. Copy its conventions rather than inventing new ones.

**Decisions taken:** migrate in sections starting with the smallest app (`rb-aem`); blocks go in a **new EDS repo** and the AEM side in a **new AEMaaCS project**; where the two repos disagree, the **AEM dialog is the source of truth** for the authoring model.

## Ground rule: the two source repos are read-only

`Mandai-EMP-Frontend` and `Mandai-AEM` **do not belong to us**. For the entire duration of this work:

- **Never `git push`, `git commit`, branch, tag, or open a PR** in either repo — not to `master`, not to `develop`, not to a feature branch.
- **Never create, edit or delete a file** in either repo. That explicitly includes `AGENTS.md`, `CLAUDE.md`, `.claude/`, config, and lockfiles.
- Read them only: `Read`, `Grep`, `Glob`, and read-only `git log` / `git show`.
- **All new files go in the new EDS repo or the new AEMaaCS project.** If something seems to need changing in a source repo, stop and raise it — do not make the change.

Both repos were verified clean (`git status --porcelain` empty) after Phase 0.

---

## What each repo has

### `Mandai-EMP-Frontend` — 307 Pug blocks

| Location | Count | Character |
|---|---|---|
| `app/views/blocks/` root | 231 | Legacy park-brand set (WRS / Zoo / Night Safari / River Safari / Bird Park). Heavy duplication — `-2`, `-3`, `-v2`, `-style2` variants. |
| `app/views/blocks/mandai/` | 27 | Newest `md-*` generation. Matches the `wrs/components/mandai/*` AEM set. |
| `app/views/blocks/membership-portal/` | 35 | Account/profile/booking screens. |
| `app/views/blocks/shopping-cart/` | 2 | `calendar`, `park-selection`. |
| `app/views/blocks/styleguide/` | 12 | Buttons, links, per-park footers. |

Supporting: 23 layouts, 17 mixins, 43 client-side templates, 112 mock JSON files under `app/views/data/`. Styling is **LESS with LESS variables** (`app/styles/variable*.less`) — no CSS custom properties, so tokens must be rebuilt, not renamed. Locale builds exist for `cn`/`jp`/`kr`.

There is nothing to "convert" here in the AEM sense — no HTL, no dialog, no Sling Model. Its value is as **design reference** (markup and CSS) and as a **visual catalogue**: `dist/component-library-*.html` renders the blocks as a living gallery.

### `Mandai-AEM` — 497 `cq:Component`s across three AEM 6.5 apps

| App | Components | Nature |
|---|---|---|
| `wrs-aem` | 356 | Main Mandai/WRS site. Bespoke, pre-Core-Components. Ticketing funnels, membership portal, forms, 38 editable templates, XF, 17 CF models, i18n (en/fr/ja/zh). |
| `mab-aem` | 122 | "My Animal Buddy" kids portal. Parent/child auth flows, 17 auth/OTP servlets. |
| `rb-aem` | 19 | "Ranger Buddies". **React SPA** — AEM components carry a dialog but **no HTL**; rendering is `@adobe/cq-react-editable-components`. |

Two facts that shape everything:

1. **Dialogs are already Coral 3** — essentially 100%, with a single Classic exception (`wrs/components/content/makemyday/dialog.xml`). This is the single most favourable fact for an xwalk migration: `_cq_dialog/.content.xml` maps to `component-models.json` mechanically.
2. **Core Components are barely used** — 7 proxies in the entire repo. There is **no Core List / Teaser / Navigation / Breadcrumb** anywhere. Every list and nav is bespoke, so page-reference logic lives in ~20 hand-written Sling Models in `wrs-aem`, not in a component the servlet-bridge skill recognises out of the box.

---

## What both repos need to reach EDS + Universal Editor

### Structural gaps (apply to the whole estate)

| Gap | Why it blocks EDS/UE |
|---|---|
| **AEM 6.5, not AEMaaCS** (`uber-jar`, `maven-scr-plugin`, `content-package-maven-plugin`, `/etc/designs`, `/etc/clientlibs`, `/etc/scaffolding`, IIS `web.config` "dispatchers" in `wrs-aem/server-configs/`) | Universal Editor and Code Sync require AEM as a Cloud Service. Nothing here can host UE. |
| **No EDS repo** | No `blocks/`, `scripts/`, `styles/`, `fstab.yaml`, `paths.json`, no `aem-code-sync` app. |
| **No xwalk model JSON** | Without `component-definition.json` / `component-models.json` / `component-filters.json` there is no component palette and no properties rail. |
| **No `AGENTS.md` / `CLAUDE.md`** anywhere | Agent guidance is re-derived every session. Can only be fixed in the *new* repos — the source repos are read-only. |
| **LESS variables, not design tokens** | EDS blocks expect CSS custom properties in `styles/styles.css`. |
| **jQuery + RequireJS** | EDS blocks are plain ES modules; no jQuery, no AMD loader. |
| **Manual `gulp dist` → `/etc/designs` handoff** | The thing being eliminated. |

### Per-app, additionally

- **`rb-aem`** — React JSX is the only markup; there is no HTL to convert. Needs a JSX → `decorate()` pass instead.
- **`wrs-aem`** — ~20 bespoke Sling Models resolve page references server-side (`ContentCarouselModel`, `FeatureListingModel`, `ConservationProjectListingModel`, `ZoneAnimalHighlightsComponent`, `AnimalListingWithFilterModel`, …), plus 17 CF models and the `mandaicf*` components. **This is where `aem-eds-servlet-bridge` is required.** Also 190+ servlets, CIAM auth, payment integrations (Adyen, FomoPay, GlobalTix) — transactional flows that are a poor fit for EDS blocks and should stay in AEM or move to a separate app.
- **`mab-aem`** — gated content and 17 auth/OTP servlets; same caveat as above.

---

## Recommended approach — `rb-aem` as section 1

`rb-aem` is the right pilot for reasons beyond size:

- 18 content components, all with **Coral 3 dialogs**, all with a **1:1 React counterpart** (`MappedComponents.js` maps them explicitly).
- Models are pure `@ValueMapValue` + `@ChildResource`. Verified in `rb-aem/core/.../models/fourcoltiles/FourColTilesCompModel.java`: the only logic is `if (ctaURL.startsWith("/content")) return ctaURL + ".html"`.
- **Only `impl/HierarchyPageImpl.java` touches `PageManager`**, and that is the SPA page model, not a content component. **No component resolves page references, queries the repository, or calls a service.**
- No `/etc/designs` legacy, no i18n beyond an `fr` stub, no XF, no payment flows.

**Consequence: the pilot needs no servlet bridge.** The 13 pathfield dialogs become `aem-content` fields that the Universal Editor resolves natively. `aem-eds-servlet-bridge` stays unloaded until `wrs-aem`, where it is genuinely required — that is the correct reading of its own scope rule, not a shortcut.

### The 18 components, with their conversion shape

Source of truth per component: **dialog** (`rb-aem/ui.apps/src/main/content/jcr_root/apps/rb/components/content/<name>/_cq_dialog/.content.xml`) for the model; **React** (`rb-aem/rb-aem-react-app/src/components/<Name>/`) for markup and SCSS.

| Component | React | Shape |
|---|---|---|
| `freeform`, `richtext` | `FreeForm`, `RichText` | simple — richtext field only |
| `primarybutton`, `secondarybutton` | `PrimaryButton`, `SecondaryButton` | simple + `aem-content` pathfield |
| `image` | `Image` | reference + alt |
| `subheader`, `masthead`, `onecolbanner`, `onecolfeature`, `onecolnews` | matching | simple + pathfield |
| `testimonial` | `Testimonial` | **container** (multifield) |
| `tabs`, `fourcoltiles`, `threecoltiles`, `missions`, `onecolbannercarousel` | matching | **container** (multifield + pathfield) |
| `header`, `footer` | `Header`, `Footer` | site chrome — becomes `nav` / `footer` documents, **not** blocks |

Six multifield components become container blocks (parent definition + `"filter"`, child definition on `…/block/v1/block/item`, and a `component-filters.json` entry), per step 6 of `aem-eds-migration`.

### Phases

**Phase 0 — Groundwork** — ✅ **done**, except the GitHub steps

| Done | Detail |
|---|---|
| ✅ AEMaaCS project | `mandai-aem-cloud/` — archetype 57, `appId=mandai`, `groupId=com.facultydigital`, `package=com.facultydigital.mandai`, `languageCountry=en_sg`, SDK `2026.8.27830`. Generated by `mandai-aem-cloud/mandai-generate-project.sh`. Git repo initialised, scaffold committed. |
| ✅ EDS repo | `mandai-eds/` — cloned from `adobe-rnd/aem-boilerplate-xwalk`, git history removed, re-initialised, pristine scaffold committed. |
| ✅ Toolchain verified | `npm run build:json` regenerates the root JSON byte-identically (clean `git status`); `npm run lint` passes (eslint + stylelint). |
| ✅ AGENTS.md | Both scaffolds ship their own; a "Mandai project specifics" section was **appended** to each, never overwritten. `CLAUDE.md` in both already points at `AGENTS.md`. |
| ✅ GitHub repos | `eve-37/mandai-eds` and `eve-37/mandai-aem-cloud`, both private, pushed. The `Build` workflow (lint) passes on `main`. |
| ✅ fstab | Points at `author-p144127-e1488012` with the `eve-37/mandai-eds` delivery path. |
| ✅ Code Sync | Installed on `eve-37/mandai-eds`. Verified: the served `styles/styles.css` hashes identical to local. |
| ✅ UE site | Created via the Sites wizard against the existing repo, and published. `/`, `/nav`, `/footer` all 200; preview and live both 200. |

Phase 0 is complete — the loop is proven end to end, from a local edit through Code Sync to the CDN.

The site currently holds the boilerplate's sample content (hero, columns, cards). Useful as a control:
if a block ever misbehaves, check whether the stock blocks still render before suspecting the pipeline.

### Environment

| | |
|---|---|
| EDS repo | `eve-37/mandai-eds` (private) |
| AEM project repo | `eve-37/mandai-aem-cloud` (private) |
| AEM author | `https://author-p144127-e1488012.adobeaemcloud.com` — program 144127, env 1488012 |
| Preview | `https://main--mandai-eds--eve-37.aem.page/` |
| Live | `https://main--mandai-eds--eve-37.aem.live/` |

Owner is a **personal account**. Moving the repos to `MandaiWildlifeReserves` later changes the
`aem.page` URL, so settle that before anyone bookmarks or shares links.

### GitHub runbook

Two environment facts worth keeping, because both cost time to rediscover:

- **The agent sandbox blocks Keychain access**, so `gh` reports "the token in keyring is invalid" and
  TLS failures (`x509: OSStatus -26276`) even when auth is perfectly fine. Every `gh` and `git push`
  call has to run with the sandbox disabled. A human terminal is unaffected.
- **SSH does not resolve from the sandbox**, so remotes are **HTTPS**, not `git@github.com`.

The boilerplate's `cleanup-on-create` workflow **did not fire** — it triggers on branch *creation*,
which does not happen when pushing an existing history into a new repo. Its work was done by hand:
`{repo}`/`{owner}` substituted in `README.md`, `AGENTS.md` and the PR template, and the workflow plus
`.renovaterc.json` removed. Nothing further is owed here.

### Remaining steps, both browser-only

**1. Install aem-code-sync** on `eve-37/mandai-eds`: <https://github.com/apps/aem-code-sync/installations/new>

Until then the site is unregistered and every URL 404s with `x-error: Missing configuration (404)` —
which is the config service saying it has no record of the site, not a content or code problem. Confirm
it worked with:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://main--mandai-eds--eve-37.aem.page/blocks/cards/cards.js"     # expect 200
```

**2. Create the Universal Editor site** in AEM on `author-p144127-e1488012`, via the Sites wizard.

Then check the content source in the config service at
<https://tools.aem.live/tools/site-admin/index.html>. Two traps:

- Once Code Sync registers the site, **`fstab.yaml` stops being consulted** — the config service holds
  the content source from then on, and a correct-looking fstab proves nothing.
- A content source pointing at `api.aem.live/<org>/sites/<site>/source` is **circular**. It should be
  `https://author-p144127-e1488012.adobeaemcloud.com/bin/franklin.delivery/eve-37/mandai-eds/main`.
  AEM reports preview as successful even when the fetch behind it failed, so read the `x-error` header
  rather than trusting the success message.

Two traps worth knowing before debugging anything here:

- The **content source in the config service** is what actually matters once Code Sync registers the
  site; `fstab.yaml` stops being consulted and a correct-looking fstab proves nothing. Check it at
  <https://tools.aem.live/tools/site-admin/index.html>.
- A content source pointing at `api.aem.live/<org>/sites/<site>/source` is **circular** — it should be
  the `author-p…/bin/franklin.delivery/…` form above. AEM reports preview as successful even when the
  fetch behind it failed, so check the `x-error` header rather than trusting the success message.

Three corrections worth carrying forward, all found by doing it:

1. **`artifactId` is `mandai-aem-cloud`, not `mandai-aem`.** macOS is case-insensitive, so `mandai-aem` collides with the read-only `Mandai-AEM` repo in the same directory. The generator's own guard caught it. `appId` stays `mandai`, so `/apps` paths and the Java package are unaffected.
2. **The xwalk boilerplate is `adobe-rnd/aem-boilerplate-xwalk`, not `adobe/`.** `adobe/aem-boilerplate` exists but is the *document-authoring* boilerplate — no `models/`, no `component-*.json`, so it is the wrong starting point for Universal Editor work.
3. **Block model partials live in `blocks/<name>/_<name>.json`, not in `models/`.** The glob `../blocks/*/_*.json#/models` in `models/_component-models.json` picks them up, so adding a block requires no edit to anything under `models/`. The root `component-definition.json` / `component-models.json` / `component-filters.json` are **build output** — edit them and `npm run build:json` silently discards the work.

Local note: this machine's `~/.npm` cache holds root-owned files, so plain `npm install` fails. Use `npm install --cache "$TMPDIR/npm-cache"` or run the `sudo chown` npm suggests.

**Phase 1 — Design tokens and shell**
Port `rb-aem-react-app/src/scss/{Variables,Base,Fontface}.scss` into `styles/styles.css` as CSS custom properties. Build `nav` and `footer` documents from `Header` / `Footer`. Do this before any block, so blocks have tokens to reference.

**Phase 2 — Two vertical slices, proven end to end**
Take `primarybutton` (simple + pathfield) and `fourcoltiles` (multifield container + pathfield). Prove the full loop — palette → properties rail → authored content → published render → in-place edit — before scaling. Per component, following `aem-eds-migration`:

1. Read dialog, React JSX, SCSS and Sling Model **in full** before writing anything.
2. Dialog → the `models` array in `blocks/<name>/_<name>.json`. Keep original property names (`title`, `subtitle`, `ctaURL`, `maskType`) so authored content maps across without a migration script. Pathfields → `"component": "aem-content"` with `rootPath` at the site root. **Field order is the contract** — `decorate()` reads positionally.
3. `.content.xml` `jcr:title` → the `definitions` array in the same partial; `template.name` must match the block folder name. Containers also get a `filters` entry — copy the shape from `blocks/cards/_cards.json`. Then `npm run build:json`.
4. JSX → `blocks/<name>/<name>.js`. Plain ES modules. Port the `.html`-appending logic. Call `moveInstrumentation()` whenever an element is replaced. Guard every optional cell.
5. SCSS → `blocks/<name>/<name>.css`, flattened and scoped under `.<name>.block`.

**Phase 3 — Remaining 16 components**, simple ones first, containers last.

**Phase 4 — Verify** (see below), then write up what the pilot taught before starting `mab-aem`.

### Then: `mab-aem`, then `wrs-aem`

`wrs-aem` last, and split again — `mandai/*` (20 components, the newest and cleanest, matching the 27 `md-*` Pug blocks and the `mandai-*` CF models) as its own section before anything touching ticketing, membership or CIAM. That slice is where `aem-eds-servlet-bridge` gets loaded: the `mandaicf*` components read Content Fragments, so its **servlet-vs-GraphQL rule** must be applied per component — and `mandai-banner`, `mandai-things-to-do`, `mandai-notices`, `mandai-benefits` are fragment-shaped reads that may well land on GraphQL rather than a servlet.

Ticketing, membership, CIAM and payment flows should be assessed as **candidates to stay in AEM**, not migrated. That is a product decision, and worth raising before anyone plans that work.

---

## Critical files

**Read first, per component:**
- `Mandai-AEM/rb-aem/ui.apps/src/main/content/jcr_root/apps/rb/components/content/<name>/_cq_dialog/.content.xml`
- `Mandai-AEM/rb-aem/ui.apps/src/main/content/jcr_root/apps/rb/components/content/<name>/.content.xml`
- `Mandai-AEM/rb-aem/rb-aem-react-app/src/components/<Name>/` (JSX + SCSS)
- `Mandai-AEM/rb-aem/core/src/main/java/sg/com/rb/core/models/<name>/`

**Reference:**
- `Mandai-AEM/rb-aem/rb-aem-react-app/src/components/MappedComponents.js` — the authoritative AEM ↔ React mapping
- `Mandai-AEM/rb-aem/rb-aem-react-app/src/scss/Variables.scss` — token source
- `~/Desktop/new-eds/sg-enable-aem/AGENTS.md`, `~/Desktop/new-eds/generate-project.sh`
- `Mandai-EMP-Frontend/dist/component-library-*.html` — rendered block gallery

**Created — new repos only:** `blocks/<name>/<name>.{js,css}`, `component-definition.json`, `component-models.json`, `component-filters.json`, `styles/styles.css`, `nav`/`footer` documents, and `AGENTS.md` / `CLAUDE.md` in the new AEMaaCS project.

**Not modified — zero files, zero commits, zero pushes:** everything in `Mandai-EMP-Frontend` and `Mandai-AEM`.

---

## Verification

Per component:
- All three root JSON files parse; the definition's `model` id resolves to a real model, and `filter` too where present.
- Cell count read by `decorate()` **equals** field count in the model. Watch `fourcoltiles`: its child has `caption`, `image`, `imagealt`. Because the field is named `imagealt` and not `imageAlt`, it should get its own row — **confirm against author-rendered HTML rather than assuming**, since an `<image>Alt`-style name is rendered as the image's `alt` attribute and gets no row, which silently shifts every later cell.
- `npm run lint` passes in the EDS repo.
- Block asset actually resolves: `curl -s -o /dev/null -w '%{http_code}\n' "https://main--<repo>--<owner>.aem.page/blocks/<slug>/<slug>.js"` → 200.

Read-only guarantee — run after every work session:
- `git -C ~/Desktop/new-eds/Mandai-EMP-Frontend status --porcelain` → empty
- `git -C ~/Desktop/new-eds/Mandai-AEM status --porcelain` → empty

Any output means something was written that should not have been; revert it.

End to end:
- Component appears in the UE palette under the expected group.
- Every dialog field appears in the properties rail with its original label.
- Pathfields open a page picker rooted at the site root and resolve to a working link (the old `.html` behaviour).
- Container blocks accept, reorder and delete children; instrumentation survives — an author can still select and edit each child in place.
- Published render matches the React output; compare against the prototype at `dist/component-library-*.html`.
- An unconfigured block still renders something selectable in edit mode, and nothing on the published site.

---

## Open questions worth settling before Phase 2

1. **Is `rb-aem` (Ranger Buddies) still live?** Migrating a retired site is the cheapest possible pilot but teaches less about production constraints. If it is retired, it is still a good rehearsal — worth knowing which.
2. **Do the 112 mock JSON files in `app/views/data/` reflect real authored content?** If so they are useful test fixtures; if stale, they will mislead.
3. **Locale builds** (`cn`/`jp`/`kr`) exist in the frontend and `wrs-aem` has en/fr/ja/zh i18n, but `rb-aem` has only an `fr` stub. Multilingual strategy does not need answering for the pilot, but does before `wrs-aem`.
