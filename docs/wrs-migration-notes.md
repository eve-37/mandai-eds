# WRS migration notes

Decisions from individual component migrations that don't fit in a single block's own files,
because they concern the shared section/model layer or need a human call. Newest entries at the
bottom of each section as components are processed.

## aside

**Source:** `wrs-components-export/aside/` — `wrs/components/article/aside`
(`sling:resourceSuperType="wcm/foundation/components/parsys"`).

**Decision: no block was built. No code was changed.**

### Why

The component's entire HTL is:

```html
<aside class="${properties.classTag}" id="${properties.anchorLink}">
  <sly data-sly-resource="${'aside' @ resourceType='foundation/components/parsys'}"></sly>
</aside>
```

It renders nothing of its own — no text, no image, no logic beyond `PlaceholderManager`'s
edit-mode placeholder. Its whole job is to wrap arbitrary authored child components in a
semantic `<aside>` element carrying two authored attributes: a free-text `classTag` and a
free-text `anchorLink` id. There is no Java model logic to port (`PlaceholderManager` only emits
the "drop content here" placeholder shown in `wcmmode.edit`) and no SCSS/JS of its own
(`COMPONENT.md` confirms: no rules found for this component's markup in the deployed CSS).

A `decorate()` function has no analogue here: its children are arbitrary authored blocks/text,
not fixed cells in a known order. This is exactly the "components whose whole job is to wrap a
parsys are not blocks" case called out in the migration skill — it maps to EDS section structure,
not to a block.

I checked the target's existing section machinery before proposing anything:

- `models/_section.json` already carries a `style` (multiselect) field with one option,
  `highlight`, plus `name`.
- `scripts/aem.js` `decorateSections()` reads `div.section-metadata` and, for each key/value pair,
  either (a) if the key is `style`, splits on commas and adds each value as a CSS class on the
  section `<div>`, or (b) for every other key, sets `section.dataset[camelCase(key)] = value` — a
  `data-*` attribute, **not** the element's real `id` attribute. There is no special-cased `id`
  key today.
- The section wrapper element is **always** a `<div class="section">`, built unconditionally in
  `decorateSections()`. Nothing in `aem.js` or `scripts.js` changes the tag name based on style or
  metadata.

So, checked against the three options the brief raised:

1. **Add a `style` option for "aside".** Rejected. `classTag` in the source is free text, not a
   fixed vocabulary — the dialog is a bare textfield, not a select. There is no authored-content
   evidence in this checkout to derive a finite set from: `wrs-components-export/aside/` ships no
   authored pages, and grepping `Mandai-AEM` for other consumers of `classTag` only turns up the
   sibling `wrs/components/article/section` component (identical `classTag`/`anchorLink` contract,
   plus `ariaLabel`/`ariaLabelledBy`), not actual values ever entered into either field. Inventing
   a `highlight`-style option like `"aside"` would map a real free-text field onto a fake finite
   one and silently drop whatever classes authors actually typed — precisely the kind of invented
   field the ground rule warns against.
2. **Support an anchor id on sections.** Not present today. `decorateSections()` would need a new
   special case (`if (key === 'id') section.id = value;`, mirroring the existing `style` handling)
   before an authored `anchorLink` value could become a real DOM `id`. That is a small, generic
   change to `scripts/aem.js` shared by every section-metadata block, not something scoped to this
   one component — implementing it under the "aside" component's ticket would touch shared
   infrastructure outside this run's stated scope (`blocks/<folder>/**` and one line in
   `models/_section.json`). Flagging it rather than building it.
3. **Render a real `<aside>` element.** Not achievable without changing `decorateSections()` to
   choose a tag name conditionally — every section is unconditionally a `<div class="section">`,
   and `main > .section`, `div.section`, and the block-loading code (`aem.js` line ~136,
   `loadSection(main.querySelector('.section'), …)`) all assume that. Swapping the tag for some
   sections risks breaking selectors and JS that were written against a fixed `div.section` shape,
   for a semantics-only gain (no visual difference; `<aside>` and `<div>` render identically).
   Not recommended as part of this component's migration.

### What a human needs to decide

- **Whether `classTag` values matter at all.** If, across the live AEM content, authors only ever
  used `classTag` on `aside`/`section` for a small number of known visual treatments (e.g. a
  highlighted callout), those specific values should be enumerated from the running AEM instance
  (not derivable from this checkout) and added as real `style` options on
  `models/_section.json`, the same way `highlight` already exists. If it was used freely for
  one-off CSS, it has no EDS equivalent and content authored with it will need to be
  re-styled by hand during content migration — this is a content decision, not a code one.
- **Whether authored `anchorLink` ids need to survive as real DOM ids.** If yes, a project-wide
  `id` handler in `decorateSections()` (mirroring the `style` handling) is the right fix, scoped
  as its own change, not folded into any one component's block.
- **Whether the semantic `<aside>` tag matters for accessibility/SEO on this site.** If it does,
  changing `decorateSections()` to pick a tag conditionally on section metadata is a bigger,
  project-wide change that needs its own review — it is not a safe unilateral addition here.

**Recommendation:** treat every instance of this component as "delete the wrapper, keep the
children" during content migration — author the nested content directly into a plain EDS section
with no special metadata, unless/until the `classTag` survey above turns up real reusable styles.

### Files touched

None. No block folder was created, `models/_section.json` was read but not modified, and no other
target file was changed for this component.

## backgroundsection

**Source:** `wrs-components-export/backgroundsection/` — `wrs/components/commons/backgroundsection`
(`sling:resourceSuperType="wcm/foundation/components/parsys"`).

**Decision: no block was built. `models/_section.json` and `styles/styles.css` were extended
instead.**

### Why this is section metadata, not a block

The HTL is four mutually exclusive branches, each nothing but a wrapper `<div>` around the *same*
`par_background` parsys:

```html
<div class="bg-base" data-sly-test="${modelBackground.backgroundType == 'default' || ... == 'pattern'}">
  <div data-sly-resource="${'par_background' @ resourceType='foundation/components/parsys'}"></div>
</div>
<div class="bg-sap-white" data-sly-test="${modelBackground.backgroundType == 'bg-sap-white'}"> ... </div>
<div style="background-image: url('${modelBackground.specifiedImage}'); ..." data-sly-test="${... == 'specified'}"> ... </div>
<div style="background-color:${properties.colour}" data-sly-test="${... == 'colourPicker'}"> ... </div>
```

Same shape as `aside`: it renders nothing of its own beyond a background treatment, wraps
arbitrary authored children, and `BackgroundSectionModel` is a plain `@Model` reading injected
properties with no repository/service access — purely presentational. This is the "wraps a
parsys" case from the migration skill: section metadata, not a `decorate()` function.

### Unlike `aside`, half of this one has a real, enumerable vocabulary

`aside`'s `classTag` is a free textfield with no way to derive a finite set. Here
`backgroundType` (dialog node `bgType`) is a `granite/ui/.../form/select` with four fixed
options: `default` ("Base"), `bg-sap-white` ("Sap White"), `specified` ("Specific" image),
`colourPicker` ("Colour Picker"). Two of the four resolve to a fixed, stylable class with real
CSS behind them; the other two are per-instance free values.

**Debug artefact dropped, not ported.** The HTL wraps everything in
`<div style="border: 3px solid green;" ...>`, unconditionally rendered (unwrapped only outside
`wcmmode.edit`). That is leftover debugging, not a design decision — not carried across.

**No dedicated LESS.** `.bg-base`/`.bg-sap-white` live inside all of `md-general.less`, which
`COMPONENT.md` confirms was copied whole. `styles/deployed-bundle-extract.css` (2 rules, matching
the LESS exactly) is ground truth:

```css
.bg-sap-white { background-color: #fbebce !important; }
.bg-base { background-color: #faf5e9 !important; }
```

These values don't match any `--rb-*` token (checked against `styles/styles.css`) — WRS is a
separately-migrated brand from Ranger Buddies, same call `wrs-admission-types.css` already made
for the identical `.bg-sap-white` value. New namespaced tokens `--wrs-bg-base: #faf5e9` and
`--wrs-bg-sap-white: #fbebce` were added rather than forcing them onto the `--rb-*` palette.

### What was checked before proposing this

`models/_section.json` already has a `style` multiselect (`highlight` only) and
`decorateSections()` in `scripts/aem.js` splits the `style` metadata value on commas and adds
each as a class directly on `div.section` (see the `aside` entry above for the full mechanics —
unchanged here, this component doesn't need anything new from it).

The repo's `.rb-section`/`.bg-green|beige|brown|dark-green|missions`/`.mask-1|2` system in
`styles/styles.css` (raised in the task prompt as a possible reuse target) turned out to be a
**different mechanism, not directly reusable**: those classes are applied by individual `rb-*`
blocks (`missions.js`, `four-column-tiles.js`, `one-column-banner.js`, ...) to an *inner* wrapper
div each block builds itself in `decorate()`, not to the top-level `main > .section` element via
section metadata, and they carry Ranger Buddies torn-edge-mask artwork and a completely different
colour palette. Reusing those class names for WRS's flat `bg-base`/`bg-sap-white` fills would
either collide with the `rb-section.bg-*` rules' meaning or need scoping gymnastics for no
benefit — WRS has no torn-edge mask and no matching colours. So the `style` vocabulary was
**extended** with two new, separately-namespaced options rather than folded into the `rb-section`
system:

```json
{ "name": "WRS Background Base", "value": "bg-base" },
{ "name": "WRS Background Sap White", "value": "bg-sap-white" }
```

and matching rules added next to the existing `main .section.highlight` rule:

```css
main .section.bg-base { background-color: var(--wrs-bg-base); }
main .section.bg-sap-white { background-color: var(--wrs-bg-sap-white); }
```

An author picking "WRS Background Base" or "WRS Background Sap White" as a section style now
gets the same flat fill the AEM component produced for those two branches.

### What does not map, and is flagged rather than built

The other two `backgroundType` branches — `specified` (an arbitrary DAM image path) and
`colourPicker` (an arbitrary Granite colorfield value) — are genuinely free, per-instance values.
A `style` multiselect is a fixed vocabulary by construction and cannot hold either.

`decorateSections()` does have a second path: any metadata key other than `style` becomes a
`data-*` attribute on the section (`section.dataset[camelCase(key)] = value`). In principle a
`text` field named e.g. `backgroundImage` or `backgroundColour` could ride that path and land as
`data-background-image="/content/dam/..."` / `data-background-colour="#rrggbb"` on the section
div. But nothing today turns a `data-*` attribute into an applied style — `decorateSections()`
only special-cases `style` today, so this would need a **new, generic handler in
`scripts/aem.js`** (e.g. `if (key === 'backgroundImage') section.style.backgroundImage = ...`),
exactly the same shape of gap the `aside` entry flagged for `anchorLink` → real DOM `id`. That is
shared infrastructure used by every section-metadata-driven block, not something this
component's migration should decide unilaterally, and it's outside this run's stated scope
(`blocks/<folder>/**` plus one line in `models/_section.json` — the CSS/model change above was
explicitly permitted for this component, a new `aem.js` handler was not).

### What a human needs to decide

- **Whether free image/colour backgrounds are used enough in live content to be worth building.**
  If yes, the fix is a generic `data-*` → inline-style handler in `decorateSections()` (shared,
  reviewed on its own), plus two more `style`-sibling fields (`text`/`reference`) on the section
  model — not a per-component special case.
- **Whether `pattern` (checked in the HTL alongside `default`, `backgroundType == 'default' ||
  == 'pattern'`) is still reachable.** It has no corresponding option in the current dialog's
  `bgType` select, so it reads as dead/legacy code left over from an earlier version of the
  component; not carried into the `style` vocabulary since there is no way to author it today.
- **Content migration**: any page currently using `specified` or `colourPicker` needs its
  background re-authored by hand (an editor picks the closest of the two fixed options, or the
  section is left with no background fill) — this is a content decision, not a code one.

### Files touched

- `models/_section.json` — added two options (`bg-base`, `bg-sap-white`) to the existing `style`
  multiselect field. No other field, and no existing option, changed.
- `styles/styles.css` — added `--wrs-bg-base`/`--wrs-bg-sap-white` custom properties and two
  `main .section.bg-*` rules next to the existing `.light`/`.highlight` rule. Additive only;
  nothing existing was edited.
- `component-models.json` — regenerated via `npm run build:json` (generated file, not
  hand-edited).
- No block folder was created.

## columncontrol

**Source:** `wrs-components-export/columncontrol/` — `wrs/components/commons/columncontrol`
(`sling:resourceSuperType="wcm/foundation/components/parsys"`).

**Decision: reuse the existing `columns` block. No new block was built, and the shared block was
not modified.**

### Why this is not a new block

The HTL renders no content of its own:

```html
<sly data-sly-list="${model.colSize}">
  <div class="${model.colDesktopCss} ${model.colMobileCss} col-block" data-eq-height=".col-block">
    <sly data-sly-resource="${ 'par_content_{0}' @ format=itemList.index, resourceType='wcm/foundation/components/parsys'}" />
  </div>
</sly>
```

`ColumnControlModel.java` does exactly one thing: turns a `colDesktop` value of `1|2|3|4` into a
Bootstrap grid class `col-md-12|6|4|3`, and `colMobile` (`1|2`) into `col-xs-12|6`. It builds a
`List` of that length purely to drive the `data-sly-list` loop count — `colSize` has no content of
its own, it is a counter. No repository or service access, nothing beyond string mapping.
`PlaceholderManager` (the other Java class in the bundle) only emits the `wcmmode.edit` "no title"
placeholder on the parent component, unrelated to the column grid — EDS/UE has its own
unconfigured-block placeholder, so nothing there needs porting either.

That is precisely the "renders no content of its own, only a grid" shape the task's prior survey
predicted, and precisely what EDS's native `columns` block (`core/franklin/components/columns/v1/columns`,
already in `blocks/columns/`) is for: column count comes from the number of cells an author
creates, not from a dropdown converted to a CSS class. `blocks/columns/columns.js` adds
`columns-${n}-cols` from the actual child count and does not read `model.columns`/`model.rows` at
runtime — those two model fields are Universal Editor insert-time scaffold hints (how many
placeholder cells to create), never re-read by `decorate()`. `columncontrol`'s `colDesktop` maps
onto exactly that same "how many cells" question, one level earlier in authoring.

### Desktop grid: full equivalence, checked against the deployed CSS

`styles/deployed-bundle-extract.css` (the ground-truth extract) carries **no grid/width rules at
all** for `col-md-*`/`col-xs-*` — those come from the site's global Bootstrap, not from this
component's own stylesheet. Everything in the extract is either typography inherited by nested
rich text (`.column-control-blocks [class*=col-] { padding, font-size, line-height }`, `.rich-text
.grid`) or **other AEM brand skins'** link/heading colours (`.zoo-style`, `.mrr-style`,
`.bird-park-style`, `.night-safari-style`, `.river-safari-style` — Mandai's other properties, not
this repo). Only `.wrs-style .column-control-blocks a { color:#999a28; }` and `.wrs-style
.column-control-blocks h1–h5 { color:#333; }` are WRS's own rules, and they target elements
*inside* the nested parsys content (rich text links/headings), not the grid or the `columns` block
shell itself — they belong with whatever rich-text/heading block renders that content, not with
the column layout. So there is no component-specific grid CSS to port: Bootstrap's equal-width
`col-md-N` split and `blocks/columns/columns.css`'s `flex: 1` equal-width columns (`@media (width
>= 900px)`) produce the same visual result — N equal columns above the breakpoint.

### The one real gap: `colMobile`, checked and confirmed

`colMobile` is a genuine, always-present dialog field (`1` or `2`, defaulting to **`2`** —
`<two selected="{Boolean}true" .../>`) letting an author choose a 2-up mobile layout independent
of the desktop count. `blocks/columns/columns.css` has no equivalent: below `900px` every
`.columns > div` is forced to `flex-direction: column`, i.e. every instance collapses to a single
stacked column on mobile regardless of how many cells were authored. Confirmed by reading the CSS
directly, not inferred — there is no narrow-viewport media query that ever produces two columns.

This is a real capability the source has and the reused block does not. I chose **not** to extend
`blocks/columns/**` to close it, for two reasons specific to this block rather than general
caution:

1. **`columns` is the native EDS component**, `core/franklin/components/columns/v1/columns`, not
   a generic custom `block/v1/block`. Its `columns`/`rows` model fields are Universal-Editor
   insert-time scaffold parameters, confirmed unread by `decorate()` at runtime — the field
   pattern an ordinary custom block model uses (an authored field that becomes a rendered cell)
   does not apply cleanly here. Adding an authored `mobileColumns` field would be departing from
   how this specific native component's model is actually used elsewhere in the repo, with no
   existing precedent in this codebase to check the result against.
2. **It is shared, load-bearing infrastructure.** `columns` is already used outside this WRS
   migration (the `rb-*` side of this repo). A behavioural change to its mobile breakpoint affects
   every existing and future use of the block, not just `columncontrol` instances — exactly the
   kind of change the run's constraints ask to justify narrowly or avoid, and I could not point to
   WRS-side evidence (no authored WRS pages exist in this checkout) showing how often `colMobile=2`
   is actually used versus the default simply never being changed.

So, weighed honestly: this is a real, confirmed gap, not a maybe — but fixing it means changing
shared native-component behaviour on inference alone, with no authored content to check it
against. That is a human call, not a mechanical one.

### What a human needs to decide

- **Whether 2-up mobile columns are used enough in live WRS content to be worth building.** If
  yes, the fix is a small, additive change to `blocks/columns/columns.css` — e.g. an author-set
  `mobileColumns` scaffold-style hint or a manually-added CSS class per section — reviewed on its
  own as a change to shared infrastructure, not folded into this component's migration.
- **Content migration consequence:** every existing `columncontrol` instance with `colMobile="2"`
  (the dialog default, so likely the common case) will render as a single stacked column on mobile
  after conversion to `columns`, instead of the two side-by-side columns the AEM site currently
  shows below the tablet breakpoint. This is a visible, if usually minor, layout regression on
  small screens for every page using the default configuration, not just edge cases — worth
  flagging to content owners before/during migration, not just to developers.
- **Authoring freedom inside columns.** `columncontrol`'s parsys accepts any AEM component; the
  migrated `columns` block's filter (`blocks/columns/_columns.json`) restricts children to `text`,
  `image`, `button`, `title`. Pages that nested richer content (e.g. another container component)
  inside a `columncontrol` column will need that content re-authored using only the block types
  `columns` accepts — also a content-migration task, not a code gap in this component specifically
  (every EDS container block works this way, not something particular to this migration).

### Files touched

None. `blocks/columns/**` and `models/_section.json` were both read but not modified — `columns`
is already registered in the `section` filter's `components` array, so no second edit was needed
either. `npm run build:json`, `npm run lint` and `npm test` were re-run to confirm the repo is
unchanged and still green (83/83 tests passing).
