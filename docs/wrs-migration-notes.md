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

## image

**Source:** `wrs-components-export/image/` — `wrs/components/commons/image`
(`sling:resourceSuperType="core/wcm/components/image/v3/image"`).

**Decision: no block was built, and no existing file was changed.**

### Why

This is a Core Components v3 proxy, not a WRS-authored component. `COMPONENT.md` and the HTL
confirm it: no project Java (`data-sly-use.image="com.adobe.cq.wcm.core.components.models.Image"`,
the stock OOTB model), no project LESS (`.cmp-image__*` is unmodified Core Components markup), and
the HTL is verbatim stock v3 except for one class-list addition:

```html
class="cmp-image${!wcmmode.disabled ? ' cq-dd-image' : ''} ${properties.imageAlignment} ${properties.removeBottomPadding}"
```

The dialog matches: it is entirely inherited from
`core/wcm/components/image/v3/image` (asset reference, alt, title, link, caption, lazy-loading —
none of that is in this bundle because none of it is project code) plus one project-added tab
with exactly two fields:

- `imageAlignment` — select, three fixed options: `text-center` ("Center"), `text-left` ("Left"),
  `text-right` ("Right")
- `removeBottomPadding` — checkbox, `value="mb-0"` / `uncheckedValue=""`

`styles/deployed-bundle-extract.css` is consistent with a proxy this thin — three of the four
component classes (`cmp-image__image`, `cmp-image__link`, `cmp-image__title`) have **no rules at
all** in the deployed bundle, and the only real styling is:

```css
.cmp-image { margin: 43px 0; }              /* 40px 0 at <=992px */
.cmp-image.mb-0 { margin-bottom: 0 !important; }
.cmp-image.mt-0 { margin-top: 0 !important; }  /* no dialog control emits mt-0 — dead in this component */
```

i.e. vertical spacing around the image, optionally zeroed at the bottom. `imageAlignment`'s CSS
(`.text-center/.text-left/.text-right`) is not in this extract — it is a shared, global utility
class (not extracted per `COMPONENT.md`'s "shared classes" note), consistent with it being a
generic text-alignment utility applied to the whole `.cmp-image` box rather than something this
component defines.

### The target already has an `image` content type — and it has no attachment point for these two fields

`models/_image.json` defines `image` as unstructured default content
(`resourceType: core/franklin/components/image/v1/image`, `template: {}` — no `model`, no fields
in the properties rail at all). There is no `blocks/image/` folder; EDS decorates a default-content
`<picture>` natively, with no `decorate()` and no dialog to extend. This is a different mechanism
from a block's model-backed fields, and it is the same one used by the two dialog fields that
*are* covered already — the reference (`image`) and alt text (`imageAlt`) fields visible in
`models/_image.json` are the Universal Editor's native asset-picker equivalents of the inherited
Core Components fields, not something built for WRS.

That leaves `imageAlignment` and `removeBottomPadding` as the only two things this component adds
on top of stock behaviour, and there is nowhere in this boilerplate to attach a per-instance select
or checkbox to a default-content image — doing so would mean inventing a dialog for a content type
that deliberately has none.

### Considered and rejected: routing through `models/_section.json`'s `style` field

`backgroundsection` (above) extended the section `style` multiselect for exactly this kind of
small, enumerable presentational toggle, so it's the obvious thing to check here too. It doesn't
fit, for a reason specific to this component rather than a blanket rule:

`backgroundsection`'s HTL wraps the **entire** parsys — one background treatment genuinely applies
to everything in the section, so section-level metadata is the right granularity. `image`'s
`imageAlignment`/`removeBottomPadding` are properties of **one image among possibly several**
pieces of content in a section (text, other images, a CTA). Promoting them to section style would
apply the same alignment/spacing to the whole section's content, not just the image that had the
setting authored on it — a divergence the ground rule explicitly warns against ("a background
colour applied to the whole card when the source puts it on the caption panel alone" is the same
shape of mistake, one level up). A multiselect also can't represent "this image is right-aligned
but that other image in the same section keeps default spacing."

### Considered and rejected: building a dedicated `wrs-image` block

Wrapping the two fields in a custom block would work mechanically (a `reference` + `imageAlt` +
`imageAlignment` (select) + `removeBottomPadding` (boolean) model, 2 cells after grouping, a thin
`decorate()` around `createOptimizedPicture`). It was rejected because it would duplicate
functionality the boilerplate's native `image` content type already provides better — the
Universal Editor's built-in asset picker, cropping, and responsive `srcset` handling for default
images — purely to carry two CSS modifier classes. That fails the ground rule's "do not add
unnecessary things" as directly as inventing a field would.

### What is lost, stated plainly

Moving to the boilerplate's default `image` content type keeps the asset reference and alt text
(`models/_image.json` already has both) but drops everything else this component's *inherited*
Core Components dialog offered, none of which has an EDS/Universal-Editor equivalent today:

- **`imageAlignment`** (center/left/right) — no field to author it; every image renders with
  whatever the surrounding content's default alignment is.
- **`removeBottomPadding`** — no field to author it; there is no `.cmp-image`-style default
  vertical margin around a default-content image to begin with, so this specific loss is largely
  moot, but any future per-image spacing control still has nowhere to attach.
- **Link** (`image.imageLink`, the `<a class="cmp-image__link">` wrapper) — inherited from stock
  Core Components, not in this bundle, and not present in `models/_image.json` either. An author
  can no longer make an image itself clickable through this component's dialog.
- **Title / caption** (`image.title`, shown as visible `<span class="cmp-image__title">` or hidden
  `<meta>` depending on `displayPopupTitle`) — same: inherited, not ported, no field in the target.
- **Lazy-loading control** (`image.lazyEnabled`) — inherited Core Components behaviour tab field;
  the target has no per-image authoring toggle for it.
- **`extraClientlibs`** (`core.wcm.components.image.v3.editor`,
  `...pageimagethumbnail.v1`) — Core Components *editor-only* behaviours (smart-crop overlay, DM
  asset editing UI). These have no Universal Editor equivalent and none is needed — the Universal
  Editor's native asset picker replaces this UI, not a functional loss of authoring capability, but
  worth recording since this dialog is the only one in the set that declares clientlibs.

### What a human needs to decide

- **Whether `imageAlignment`/`removeBottomPadding` are used often enough in live WRS content to be
  worth a real fix.** If so, the fix is a small, genuinely new field on the default `image` content
  type itself (extending `models/_image.json` with an alignment select and a spacing boolean, read
  by a light per-image CSS rule) — not a block, and not section metadata. That is a change to
  shared infrastructure (`models/_image.json` is used by every image on every page, WRS or not) and
  was out of scope for a single-component pass.
- **Whether link/caption/lazy-loading are needed anywhere in the live WRS content.** If content
  audits show these are actually authored (not just inherited-but-unused dialog fields), that is a
  larger, shared decision: whether to extend the default `image` content type for the whole site,
  or accept the loss for content migrated from this component.

### Files touched

None. No block folder was created, `models/_section.json` and `models/_image.json` were left
unchanged, and no CSS was added.

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

## featuredlistingv2

**Source:** `wrs-components-export/featuredlistingv2/` — `wrs/components/commons/featuredlistingv2`
(`sling:resourceSuperType="wcm/foundation/components/parsys"`).

**Decision: built a shell only. No fetch, no servlet, no GraphQL client.**

### Shape

This is the first Content-Fragment-backed component in the run, and it has a shape none of the
`rb-*`/other `wrs-*` blocks so far do: the dialog carries **no parent-level fields at all** — just
one multifield (`largeImages` → fieldset `./listItems`) holding a single `fragmentPath`
pathbrowser (`rootPath="/content/dam/fragments"`) per row. Confirmed by reading the dialog XML as
a tree: `<content><layout/><items><column><items><largeImages
sling:resourceType=".../multifield"><field .../fieldset name="./listItems"><items><column><items>
<fragmentPath .../pathbrowser name="./fragmentPath" rootPath="/content/dam/fragments"/>` — nothing
sits outside that nesting.

`FeatureListingV2Model.java` confirms the storage is as odd as the survey said: `@ValueMapValue
String[] listItems` is an array of **JSON strings**, not child nodes — `init()` parses each string
with GSON and reads only its `fragmentPath` key (`PROPS_PATH = "fragmentPath"`), skipping blanks
and malformed entries. Everything the HTL actually renders — `header`, `descriptionDetail`,
`image360x540`, `image1x1`, `pathHTML` — comes from resolving that path as a Content Fragment:
`resolver.getResource(cfPath + WRSConstants.FRAGMENT_DATA_RESOURCE_PATH_PROPERTIES)`, a
`WRSUtils.isTargetContentFragment(..., CONTENT_FRAGMENT_MODEL_ZONE)` model check,
`fragmentResource.adaptTo(ContentFragment.class)`, then `WRSUtils.getCFProperty(fragment, "name" /
"summary" / "imageDesktop" / "imageDesktop1x1" / "detailLink", String.class)`. Two of those are
also run through derived formatting before they reach the HTL:
`CommonUtils.getCompressedResizedImageURL(...)` (both images) and, separately,
`I18nUtils.getLabel("viewall"/"viewless", currentPage, null)` for the show/hide button copy. None
of this is dialog content — it cannot be read positionally off authored cells the way every other
block in this repo works.

`show-all.js`, wired via `data-load-plugins="[\"show-all.js\"]"` on the wrapper for the
`>6 items` view-all/view-less behaviour (`data-show-all-min="6"`), is referenced in the HTL but is
**not present** in the export bundle. Its button (`.wrapp-btn.hide-desktop`, shown only when
`featureListing.listZone.size > 6`) is therefore not built either — flagged, not invented.

### What was built

A container block, matching the dialog's own nesting exactly:

- parent `wrsfeaturedlisting` — **zero fields**, because the dialog has none at the top level.
  `PARENT_CELLS = 0` in the JS, so every row in the block is a child row.
- child `wrsfeaturedlistingitem` — one field, `fragmentPath`, component `aem-content`,
  `rootPath: "/content/dam/fragments"` (the dialog's own pathbrowser root, more precise than the
  generic `/content/dam` a DAM-rooted `aem-content` field would default to).

`decorate()` reads each child row's single cell positionally (the same
`<div><div><a href="...">label</a></div></div>` shape this repo's other lone-`aem-content`-field
cells produce, confirmed against `secondary-button` and `four-column-tiles`' `cta_link` cell), and
renders one card per authored item with a clearly-marked "Content Fragment not resolved:
`<path>`" state in place of real content. Every row keeps its own `moveInstrumentation()` call, so
it stays independently selectable and editable in the Universal Editor even though it renders no
real copy yet. A single, commented seam in `wrs-featured-listing.js` marks exactly where CF
resolution would be added once the architecture decision below is made — no fetch is implemented.

**Inversion worth noting explicitly:** in every other block in this repo, an authored cell holding
a `/content/dam/...` path is a sign the row reader is broken (DAM paths belong in image cells, not
link cells). Here it is the *opposite* — a `/content/dam/fragments/...` path is exactly what
`fragmentPath` is supposed to hold, and the shell does not reject or warn on it.

### Servlet vs GraphQL — applying the rule

Working the rule in order:

1. **Does the block need anything that lives on the page rather than the fragment?** No. Every
   field the HTL uses (`name`, `summary`, `imageDesktop`, `imageDesktop1x1`, `detailLink`) comes
   off the Content Fragment itself via `ContentFragment`/`getCFProperty`. `currentPage` is injected
   into the model, but it is used only to pass to `I18nUtils.getLabel(..., currentPage, null)` for
   the view-all/view-less button labels — a per-locale UI string lookup, not a page property being
   read onto the card. Branch 1 does not match.
2. **Does it need filtering, sorting or pagination over many fragments?** No. `listItems` is an
   author-curated, explicitly ordered list of specific fragment paths (one `fragmentPath` per
   multifield row) — there is no query, no "all fragments of model X" selection, nothing for a
   `...List` GraphQL query to do that authoring order does not already do. Branch 2 does not
   match.
3. **Neither, and no display strings derived from the data?** This is where it lands — except the
   "no derived display strings" half is false, and that is the material finding here.

**Recommendation: servlet, not GraphQL** — but flagged, because branch 3's own caveat is directly
in play and worth stating plainly rather than waving through:

- `CommonUtils.getCompressedResizedImageURL(imageDesktop, RESIZE_720, true)` and
  `..getCompressedResizedImageURL(imageDesktop1x1, RESIZE_512, true)` are exactly the "derived
  display string" case the rule calls out. Under GraphQL, that resize/compress logic would have to
  move into the block's `decorate()` (client-side) or a build/edge step — this repo does have
  jsdom tests, so that formatting *could* be unit-tested here, unlike most GraphQL migrations. That
  mitigates but does not remove the concern: it is still image-processing logic moving from a
  known-good server-side utility into hand-written client JS, for two image variants specifically
  sized for this card (720 and 512), not something a generic query result would already contain.
- `I18nUtils.getLabel("viewall"/"viewless", currentPage, null)` is server-side i18n resource
  bundle lookup keyed by the current page's language root. There is no client-side equivalent
  already in this repo, and reimplementing it is exactly the kind of thing the rule warns is easy
  to wave through under "no derived strings."
- The GraphQL HTTP-200-with-`errors` risk applies here too: a persisted `...List`/single-fragment
  query for the `CONTENT_FRAGMENT_MODEL_ZONE` model would return 200 even if `imageDesktop1x1` (or
  any of the five fields) were renamed or removed from the model, silently rendering "no data" with
  nothing in the console — versus a servlet whose named-key contract makes that field's absence
  explicit.
- A servlet reads the **master variation only** unless variation support is written in — no
  evidence in this bundle (dialog, HTL, or model) that featuredlistingv2 uses CF variations at all,
  so this is a disclosure, not a known gap.
- A persisted GraphQL query has a fixed selection set; a servlet whose key list already names
  `name`/`summary`/`imageDesktop`/`imageDesktop1x1`/`detailLink` would pick up no *new* CF model
  field without a code change either way, since it names exactly those five keys today — this cuts
  both ways here rather than favouring one option, so it did not move the recommendation.

The deciding factor is the two image-resize calls plus the i18n label lookup: real, non-trivial
server-side logic that a GraphQL migration would have to reinvent client-side, not just a
convenience the servlet happens to already provide. A servlet function that wraps
`getCompressedResizedImageURL`/`getCFProperty`/`I18nUtils.getLabel` and returns the five named
fields plus the two button labels is the safer target.

### What a human needs to decide

- **Whether to build the servlet** (recommended above) or accept the GraphQL tradeoffs (client-side
  image URL construction + a client-side i18n label source) — this is an architecture decision, not
  a mechanical one, and neither was implemented here.
- **`show-all.js` is missing from the export bundle.** Its view-all/view-less behaviour
  (`data-show-all-min="6"`) is not built. Either source it from `Mandai-EMP-Frontend` and port it,
  or decide the `>6 items` case is out of scope for this migration pass.
- **Whether Content Fragment variations matter for this component.** Not evidenced in this bundle;
  worth confirming against live authored content before building the servlet, since a servlet
  defaults to master-only unless told otherwise.

### Files touched

- `blocks/wrs-featured-listing/_wrs-featured-listing.json` — new (parent `wrsfeaturedlisting` with
  zero fields; child `wrsfeaturedlistingitem` with one `aem-content` field; parent filter naming
  the child).
- `blocks/wrs-featured-listing/wrs-featured-listing.js` — new; shell `decorate()`, no fetch, one
  commented seam for the CF-resolution architecture decision above.
- `blocks/wrs-featured-listing/wrs-featured-listing.css` — new; ports the grid/card geometry that
  does not depend on CF data from `styles/deployed-bundle-extract.css`, plus a visible
  "unresolved" placeholder style that is not a source port.
- `models/_section.json` — appended `"wrsfeaturedlisting"` to the `section` filter's `components`
  array (child id intentionally not added — reachable only through the parent's own filter).
- `tests/blocks.test.mjs` — added 6 cases: normal render (two CF paths), the DAM-path inversion
  called out above, instrumentation-moved, a blank/unpicked row, unconfigured-outside-editor, and
  unconfigured-in-editor placeholder.
- `npm run build:json`, `npm run lint` and `npm test` all pass (89/89 tests).

## footer

**Source:** `wrs-components-export/footer/` — `wrs/components/structure/footer`
(`sling:resourceSuperType="wcm/foundation/components/parsys"`). 32 top-level dialog fields across
19 fieldsets, plus 8 multifields (`footerIcons`, `staticLinks`, and `items1`…`items6` — a
hand-unrolled six-copy multifield behind `rootTitle1..6`/`rootPath1..6`). `FooterModel.java` is 584
lines; it also pulls in the 684-line `PagePropertiesInheritance.java`.

**Decision: a partial migration.** Only the `conservationBannerTab` panel (10 dialog fields) is
built as a block, `blocks/wrs-conservation-banner/`. Everything else is flagged, not built.
`blocks/footer/` (the site's actual footer, a `/footer` document-fragment loader) is untouched, per
the task constraint — it already covers where most of the flagged content belongs.

### Why the whole component does not fit as one block, or even as one container

- 32 top-level fields cannot fit 4 cells under any grouping the skill allows — grouping collapses
  *related* fields, it does not shrink an inventory of unrelated site furniture (address, social
  icons, six nav columns, legal links, help button) down to four slots.
- A container block has exactly one `filter`, and therefore one accepted child shape. This dialog
  has eight distinct multifields with different field shapes (`footerIcons`: 6 fields;
  `items1`…`items6`: 2 fields each, but six *separate* fields, not one shared one;
  `staticLinks`: 2 fields). That is eight child types, not one — a single container cannot express
  it, and per the skill, a block item cannot itself be a container either, which rules out nesting
  columns-of-links-as-containers-of-containers too.
- `rootTitle{1..6}`/`rootPath{1..6}`/`items{1..6}` is a multifield that someone unrolled by hand
  into six numbered copies rather than authoring it as one repeatable field, apparently to get
  Granite's fixed-columns layout to lay out six fieldsets side by side in the dialog. In EDS this
  collapses back to what it always was: one repeatable "nav column" structure, not six.

### Why even the conservation banner needed a closer look before building it

`FooterModel` has two code paths, chosen by a `cancelFooterInheritance` page property
(`processFooterInherited()` vs `processCancelFooterInherited()`). Read side by side (lines
276–391), **every** `conservation*` getter — not just address/opening-hours — is populated the
same way as the rest of the footer's config: by default, `processFooterInherited()` walks up to 5
ancestor pages via `HierarchyNodeInheritanceValueMap` looking for the nearest one with a `footer`
child resource, and reads the conservation fields off *that* resource. Only when an author checks
"cancel footer inheritance" on a page does `processCancelFooterInherited()` read the fields off the
current page's own footer node directly.

So the conservation banner is content-shaped (10 flat fields, no repository queries, no OSGi
services, no request context — genuinely presentational data, unlike the opening-hours lookup
below) but it is **not** authored per-page in the source; it is authored once on an ancestor page
and cascades to every descendant that does not opt out. That cascade has no EDS equivalent — EDS
resolves a page's own content, not an inherited ancestor's. Building the block does not restore
this: every page that should show the banner will need it placed explicitly. This is called out
both here and in the block's own docblock, and is a real behaviour change a human should sign off
on (e.g. deciding whether a small number of pages genuinely need the banner individually authored,
versus whether the inheritance behaviour needs a different solution — a shared library/library
block, or template defaults — before this migrates further).

`hideConservation` (a checkbox, default shown) is dropped from the model: in EDS, not placing the
block is how an author hides it. A checkbox on top of block-presence would just be a second, easily
-desynced way to say the same thing.

### The conservation banner block

- Folder: `blocks/wrs-conservation-banner/`, id `wrsconservationbanner`, per the naming rule
  (`template.name` "WRS Conservation Banner" → slugified folder). Registered in
  `models/_section.json`'s `section` filter.
- **Cell model (9 fields — `hideConservation` dropped — into 4 cells):**
  - `content_title`, `content_description`, `content_gradient` → **`content`** cell. Grouped
    because all three describe the text panel painted over the banner (heading, rich-text copy,
    and whether the radial gradient behind it is on) — an author edits them together, and the
    source itself paints them as one `.wrapp-content` unit.
  - `bg_desktop`, `bg_mobile` → **`bg`** cell. Same `bg_desktop`/`bg_mobile` shape and
    `backgroundUrl()` rewrite already proven in `blocks/one-column-banner/` for the source's
    desktop/mobile image swap (`conservationBannerImage`/`conservationBannerImageMobile`).
  - `tagImage`, `tagImageAlt` → collapses to **one** cell via the `imageAlt` suffix rule (source:
    `conservationTagImage` + `conservationTagAltText`, the small badge/tag graphic inside the
    banner-box).
  - `cta_link`, `cta_linkText` → **`cta`** cell (source: `conservationCtaLink` +
    `conservationCtaText`). No variant/new-tab fields exist for this CTA in the source dialog — the
    HTL anchor carries no `target` — so only the two fields the dialog actually has are modelled.
- The CTA is deliberately **not** built with the shared `buildCta()`/`.rb-cta` torn-edge button used
  elsewhere in this repo. The source renders a plain rounded pill button (`.md-button-big`),
  visually unrelated to the Ranger Buddies CTA shape — the ground rule is to port what the source
  does, not what looks consistent with sibling blocks. `readCta()` is still reused for the grouped
  cell read (it tolerates the absent variant/newTab fields); the rendered markup and CSS are this
  component's own.
- CSS ported from `styles/deployed-bundle-extract.css`, selectors `.md-short-masthead-component`,
  `.cover-picture`, `.wrapp-content`, `.banner-box`, `.desc`, `.md-button-big` (extract lines
  ~1807–1841, ~5017–5234), rewritten mobile-first under new doubly-scoped class names
  (`.wrs-conservation-banner-*`), matching the house style in `wrs-admission-types.css`. One gap is
  called out in the CSS file itself: the extract's own header lists `wrapp-content` as a shared,
  too-broad-to-extract site-wide class (414 rules), so no `position`/centering rule for it is in
  this bundle — the `position: absolute; left: 50%; transform: translateX(-50%)` centering used
  here is a reconstruction, not a verified port, flagged for re-check once authored.

### What was flagged, not built, and where it belongs

- **The six nav columns** (`columnOne`…`columnSix`, each `rootTitle{n}`/`rootPath{n}` plus an
  `items{n}` multifield of up to 6 links) — site navigation furniture, not a content-shaped block.
  Belongs in the `/footer` document that `blocks/footer/` already loads via `loadFragment()`,
  authored as a nav list in the document itself. If it needs to be author-editable as structured
  data rather than free document markup, that is a "should footer nav become a block" architecture
  call for a human, out of scope here.
- **Social/footer icons** (`footerIcons` multifield: path, Font Awesome class, default/hover image,
  alt, QR code — 6 fields) and **static links** (`staticLinks`: title + path) — same call: belongs
  in the `/footer` document as authored content, not a block.
- **Address panel** (`titleAddress`, `descAddress`) and **social section title**
  (`titleFollowUs`) — plain text, belongs in the `/footer` document.
- **Copyright/legal** (`copyright`, `subCopyright`) — plain text, belongs in the `/footer`
  document.
- **Help button** (`hideHelpButton`, `helpButtonRedirectPath`) — a single link, belongs in the
  `/footer` document, or as a small dedicated block if it needs to appear on pages independent of
  the footer fragment — a human call, not made here.
- **Opening hours** (`dataOpenHours`, a pathbrowser field) — needs an explicit architecture
  decision, not a document/authoring one. `dataOpenHours` is a *path to a different page's config
  node*: `FooterModel` calls
  `ResourceUtils.getResourceByResourceType(resourceResolver, SLING_RESOURCE_TYPE_FOOTER_CONFIG,
  dataOpenHours)`, then reads `timeOpenHours`/`descOpenHours`/`titleOpenHours` off *that* resource's
  `ValueMap` — a live repository read of a separate content node by resource type, at request time.
  There is no EDS/GraphQL equivalent to "resolve a path to a node and read fields off whatever
  resource type is found there" without a servlet or an equivalent server-side/edge lookup; this is
  exactly the "reads other pages" case the skill says to flag rather than invent a client-side
  substitute for. Per the skill, this would call for the `aem-eds-servlet-bridge` skill and a human
  decision before building anything, once opening-hours is prioritized.
- **The main-section/top-section/legal-section `hide*` booleans** (`hideTopSection`,
  `hideMainSection`) apply to groups of the content above, not to anything built here — they travel
  with whatever authoring solution is chosen for those sections.

### What a human needs to decide

- Whether the conservation banner's lost page-hierarchy inheritance (cascades from an ancestor page
  to all descendants in the source; requires explicit per-page placement in EDS) needs a
  compensating authoring convention, or whether explicit per-page placement is acceptable.
- Whether the six nav columns, social icons, static links, address, copyright and help button
  become structured blocks (author-editable fields) or stay as free-form content inside the
  `/footer` document — this is a real content-modelling choice, not something this pass should
  decide by default.
- The opening-hours architecture (servlet bridge vs. some other resolution of the
  `dataOpenHours` → config-node lookup) before any opening-hours UI is built.
- `PagePropertiesInheritance` (684 lines: `AddThisServices`, `Externalizer`,
  `LiveRelationshipManager`, `SlingSettingsService`, cookies) backs `pageProperties.hideInMFA` and
  `pageProperties.mfaUserAgent` in the footer HTL, used on the conservation banner's own wrapping
  `<div>` in the source (`... ${pageProperties.hideInMFA ? 'hide' : ''}`) as well as the help button
  and main `<footer>`. None of this reached the migrated block — it is a page-property/OSGi-service
  condition, not a dialog field of this component — but a human should confirm no MFA-specific
  hide behaviour is expected of the conservation banner block before it goes live.

### Files touched

- `blocks/wrs-conservation-banner/_wrs-conservation-banner.json` — new; single leaf model
  (`wrsconservationbanner`), no container/filter (no multifield in this panel).
- `blocks/wrs-conservation-banner/wrs-conservation-banner.js` — new; `decorate()` reading the 4
  cells above, including a from-both-ends read for the `content` cell so a multi-paragraph rich
  description cannot shift the trailing gradient boolean.
- `blocks/wrs-conservation-banner/wrs-conservation-banner.css` — new; ports
  `styles/deployed-bundle-extract.css`'s conservation-banner rules under new scoped class names,
  with the `wrapp-content` centering gap called out above.
- `models/_section.json` — appended `"wrsconservationbanner"` to the `section` filter's
  `components` array.
- `tests/blocks.test.mjs` — added 8 cases: normal render (title/rich description), gradient
  modifier toggle, both background images resolving through `backgroundUrl()`, tag image alt text,
  CTA anchor/button shape (and that it is *not* `.rb-cta`), instrumentation on content/tag/CTA,
  the multi-paragraph-description/trailing-boolean boundary case, and the
  unconfigured-outside-editor / unconfigured-in-editor-placeholder pair.
- `npm run build:json`, `npm run lint` and `npm test` all pass (98/98 tests).
- `blocks/footer/` was **not** touched, as required — it already covers the destination for most of
  the flagged content (the `/footer` document it loads).

## header

**Source:** `wrs-components-export/header/` — `wrs/components/structure/header`
(`sling:resourceSuperType="wcm/foundation/components/parsys"`). 17 top-level dialog fields across
4 tabs, plus 5 multifields (`navItems`, `languageItems`, `memberSettings`, `mainNavItems`,
`visitOurParksItems`). `HeaderModel.java` is 870 lines; it also pulls in the 684-line
`PagePropertiesInheritance.java`.

**Decision: a partial migration, the narrowest of the run.** Only the `visitOurParksItems` panel
(3 dialog fields) is built as a container block, `blocks/wrs-visit-our-parks/`. Everything else —
navigation, language switcher, login/logout, ticket/cart, the `topparkadvisory` embed, the
transparent/solid toggles — is flagged, not built. `blocks/header/` (the site's actual header, a
`/nav` fragment loader plus its own branded CSS) is untouched, per the task constraint.

### Why the whole component does not fit as one block, or even as one container

Same structural argument as `footer`, confirmed independently here:

- 17 top-level fields do not fit 4 cells under any grouping the skill allows — `useTransparent`,
  `makeHeaderSolid`, `linkPage`, `urlLogo`, `urlLogoTransparent`, `title`, `searchAltText`,
  `searchLink`, `loginText`, `loginUrl`, `welcomeText`, `welcomeUrl`, `logoutMessage`,
  `logoutCtaLabel`, `redirectPath`, `ticketLabel`, `ticketLink` are 17 unrelated settings, not a
  set of related fields grouping collapses.
- A container block has exactly one `filter`. This dialog has five distinct multifields with five
  different field shapes (`navItems`: 2 fields; `languageItems`: 3; `memberSettings`: 3, one a
  checkbox; `mainNavItems`: 3, one a checkbox; `visitOurParksItems`: 3, one a `/content/dam`
  image) — five child types, not one. `mainNavItems` is also, per the source's own
  `PageManager`/`pageChildren` walk (`headerModel.lstPageMain`, `mainNav.pageChildren`,
  `childNav.pageChildren`), a **three-level** menu (top nav → child nav → sub-child nav) — deeper
  than the skill's already-ruled-out two-level container nesting, so it cannot be built as a
  container at all without inventing a shape the dialog itself does not have (the dialog only
  captures the top level explicitly; the deeper levels come from resolving `path` against the
  live page tree, not from authored rows — see below).

### The inheritance finding, confirmed and generalised beyond `footer`

`footer`'s entry found that `conservationBannerTab` is read through
`HierarchyNodeInheritanceValueMap.getInherited(...)`, cascading from an ancestor page rather than
being authored per page. Reading `HeaderModel.getDataHeaderByResource()` (lines ~370–446) shows
the **same mechanism governs nearly every field in this component**, not just one panel:
`navItems`, `visitOurParksItems`, `searchAltText`/`searchLink`, `ticketLabel`/`ticketLink`,
`loginText`/`loginUrl`, `welcomeText`/`welcomeUrl`, `title`/`linkPage`/`urlLogo`/
`urlLogoTransparent`, `mainNavItems` and `memberSettings` are all read via
`inheritCompProps.getInherited(fieldName, ...)` off a `HierarchyNodeInheritanceValueMap` built
from the current resource — walking up ancestor pages for the nearest header configuration.
`languageItems` goes through the same mechanism via a second, separately-constructed
`InheritanceValueMap` off `getResource()`. So the header, in the source, is configured once
(typically near the site root) and every descendant page inherits it unless it overrides its own
copy — this component is site chrome authored once, not per-page content. EDS has no equivalent:
a block placed on one page renders only on that page. This is the same open question `footer`
raised, now confirmed to apply to essentially the whole header, not one panel — worth resolving
once, for both components together, rather than twice.

### `visitOurParksItems` — the one panel built

Confirmed content-shaped and safe to port: `HeaderModel.setDataToVisitOurBarks()` (lines
476–488) does nothing beyond parse the stored JSON-string array into a `VisitOurParksBean` and
resolve the URL with `CommonUtils.getProperURL()` — no repository query, no OSGi service, no
request/session state. Its only dependency on the inheritance mechanism above is the panel's
authoring cascade, not its rendering logic. The HTL (`header.html` lines 222–232) renders it as a
plain image-link list:

```html
<div class="wildlife-park">
  <div class="grid">
    <ul class="list-park" data-sly-list.parkNav="${headerModel.listVisitOurPark}">
      <li><a href="${parkNav.url}" title="${parkNav.title}">
        <img src="${parkNav.image}" alt="${parkNav.title}" width="100" height="40"/>
      </a></li>
    </ul>
  </div>
</div>
```

Confirmed against the dialog XML (`mobileMenuSectionTab` → `parkItems` multifield → fieldset
`./visitOurParksItems`): three fields per row, `title` (text), `image` (pathbrowser, `rootPath`
`/content/dam`), `url` (pathbrowser, field name `./url`, `rootPath` `/content/wrs`) — none share
an underscore prefix and none is a collapsible suffix of another, so they stay three separate
cells, in that order.

- Folder: `blocks/wrs-visit-our-parks/`, parent id `wrsvisitourparks` (zero fields — no sibling
  field exists at the multifield's own level in the dialog), child id `wrsvisitourpark` (`title`
  text, `image` reference, `url` aem-content — 3 cells, dialog order). Registered in
  `models/_section.json`'s `section` filter.
- `decorate()` reads each child row positionally (title, image, url — confirmed no grouping
  applies) and renders a plain anchor around the authored `<picture>`, setting the anchor's
  `title` and the image's `alt` from the authored title (matching the source's own
  `title="${parkNav.title}"` / `alt="${parkNav.title}"` duplication). A row authored without an
  image yet still renders as a text link rather than being dropped, so it stays visible and
  editable.
- **CSS gap, stated rather than papered over.** In the source, this panel has **no desktop
  design** — its base (no-media) rule is `display:none`; it is shown only inside the header's
  mobile hamburger flyout via `@media (max-width:991px)`, and the ONLY reason it is ever visible
  is that positioning context, which `.md-header .mobile-header .wildlife-park` supplies and
  which this standalone block does not have (per the task constraint, `blocks/header/` was not
  touched or extended to host it). `wrs-visit-our-parks.css` ports only the mobile ruleset and
  applies it at all widths, un-gated, rather than inventing a desktop layout with no source
  evidence — flagged in the CSS file's own docblock as an extrapolation needing design review
  once this block is actually authored, not a verified port.

### What was flagged, not built, and why — the stateful half

**login/logout/welcome** (`loginText`, `loginUrl`, `welcomeText`, `welcomeUrl`, `logoutMessage`,
`logoutCtaLabel`, `redirectPath`) and **`memberSettings`** (each row: `textLink`, `urlLink`,
`isLogout` checkbox) govern **per-visitor CIAM auth state**. The HTL never renders these dialog
values as static content — `headerModel.settings` drives `#headerMemberSettingsLogin` /
`#headerMemberSettingsLoginMobile`, both authored `hidden` by default and toggled by
`header.js`/`sidebar-menu.js` (JS runtime, not in this bundle) reading live CIAM session state at
request time; `HeaderModel` itself resolves `isCIAMIntegratedPage`
(`CIAMHelper.isCIAMIntegratedPage(currentPage.getPath())`) and, when true, calls
`ConfigurationUtils.getServiceReference(CIAMServices.class)` to build a live logout endpoint URL
(`ciamLogoutEndpoint`, embedding `client_id` and a post-logout redirect). None of that is dialog
content that a block's `decorate()` can read positionally — it is a live OSGi service call, the
exact "calls an OSGi service" case the skill says to flag rather than invent an equivalent for.

**ticket/cart** (`ticketLabel`, `ticketLink`) reach the same problem from the commerce side.
`ticketLink` itself is dialog content and safe, but the HTL also renders a live cart count next to
it (`<span class="count-number" data-number="${headerModel.numberTicket}">`), and
`HeaderModel.getNumberTicket()` (lines 337–362) reads it out of `request.getSession()`
(`TicketConstants.TICKET`), parses it as `CartInfoParent`/`ProductCart`/`TicketStep` JSON, and
sums quantities across the cart and any add-on products. `ticketLink` itself is further
overridden at render time by `getCurrentStepURL()` (lines 591–609) — again read off the session
cart — whenever the visitor is mid-checkout and not on a thank-you/maintenance page.

**Why a cached endpoint is the wrong shape for both, stated plainly:** EDS content — including
anything a servlet-backed block would fetch through a path-cached endpoint — is shared across
every visitor who requests that path. Login state and cart contents are **per-visitor session
state**, not per-page content. Serving one visitor's "Welcome, Jane" or their 3-item cart count
out of a cache keyed by URL means the next visitor to hit that same cached response sees Jane's
name and Jane's cart — not a stale-content nuance, a correctness and privacy failure. The only
shapes that do not leak one visitor's state to another are (a) a client-side call the visitor's
own browser makes, authenticated with their own session, to the existing CIAM/commerce services
directly, bypassing EDS's page cache entirely, or (b) leaving this panel in AEM, where
per-request server-side rendering already handles it correctly. Building a servlet or GraphQL
endpoint for either would be inventing a client-side substitute for genuinely stateful,
per-visitor server logic — exactly what the skill says to flag rather than invent.

**`topparkadvisory` embed.** `header.html` line 14:
`<div data-sly-resource="${'topparkadvisory' @ resourceType='wrs/components/commons/topparkadvisory'}" data-sly-unwrap></div>`
— the only wrs→wrs component reference in the whole 19-component set. `topparkadvisory` is
component 19 of this run and is itself blocked (JCR traversal + OSGi service, per its own survey
entry) — flagged here as a dependency, not re-solved.

**`useTransparent` (dialog node `removePadding`) / `makeHeaderSolid`.** Pure presentation toggles
— `useTransparent` controls top padding and (combined with `makeHeaderSolid` and
`headerModel.hideBreadcrumb`) a `transparent` CSS modifier class on `.wrapper-header`
(`header.html` line 123); `makeHeaderSolid` forces the solid variant regardless. Both are genuine
per-instance dialog booleans with no repository/service dependency, so — unlike everything above
— these are safe to port mechanically. They were not built here only because they belong to
`blocks/header/`'s own model, not to `wrs-visit-our-parks`, and `blocks/header/` was explicitly
out of scope for this pass (constraint: do not modify it). If/when `blocks/header/`'s model is
extended for WRS branding, these two map cleanly onto boolean fields there, alongside the
`logo`/`logo-transparent`/`linkPage`/`title` fields the same tab holds.

**`navItems`, `languageItems`, `mainNavItems`, `searchAltText`/`searchLink`.** Content-shaped site
navigation, same call `footer`'s entry made for its six nav columns: belongs in whatever document
or fragment `blocks/header/` loads (its `/nav` fragment today), authored as navigation content,
not as new dialog-shaped blocks. `mainNavItems`' three-level nesting (top nav → resolved page
children → resolved grandchildren, driven by `PageManager`/`pageChildren` walks over the live page
tree, not by authored rows past the top level) has no direct multifield equivalent regardless —
it would need either a hand-authored nav structure at all three levels, or a page-tree-aware nav
component, which is an architecture decision for whoever designs the `/nav` document's authoring
model, not something this component's migration should invent.

**Hardcoded asset.** `/etc/designs/wrs/clientlib-site/images/mandai/md-tick.svg` (the logout-modal
success icon, `header.html` line 104) — an `/etc/designs` path, not portable as-is; belongs with
whatever logout-modal UI is eventually built (see login/logout above), re-hosted under
`/content/dam` or bundled as a static asset, a decision for that build, not this one.

### What a human needs to decide

- **Login/logout/welcome and `memberSettings`** — whether and how to surface per-visitor CIAM
  state client-side (a script that calls the existing CIAM services directly from the browser,
  bypassing EDS's cache), or leave this panel served from AEM. Not a content-authoring question;
  an architecture one.
- **Ticket/cart count and current-step redirect** — same call, for the existing commerce/ticketing
  service. `ticketLink`/`ticketLabel` as static dialog content are safe to migrate whenever the
  navigation content above is; the live cart count and mid-checkout redirect are not.
- **The page-hierarchy inheritance cascade**, now confirmed to govern nearly the whole component
  (not just `visitOurParksItems`) — whether it needs a compensating authoring convention (e.g. a
  header/footer configuration authored once and referenced, rather than EDS's per-page model), or
  whether explicit per-page block placement is acceptable. Worth resolving once, together with the
  same question `footer`'s entry raised, rather than per component.
- **`topparkadvisory`** — blocked on its own survey; no action from this component's side beyond
  noting the dependency.
- **Whether `useTransparent`/`makeHeaderSolid` and the nav/language content are worth adding to
  `blocks/header/`'s own model** — a scoped, reviewable change to shared site-chrome
  infrastructure, not something this component's migration pass should do unilaterally (the task
  constraint here was explicit: do not modify `blocks/header/`).

### Files touched

- `blocks/wrs-visit-our-parks/_wrs-visit-our-parks.json` — new; parent `wrsvisitourparks` (zero
  fields) with a `filter` naming the child; child `wrsvisitourpark` (`title`/`image`/`url`, 3
  cells, no grouping).
- `blocks/wrs-visit-our-parks/wrs-visit-our-parks.js` — new; `decorate()` reading the 3 child
  cells positionally, rendering a plain image-link list (no `.rb-cta` — the source has no CTA
  styling here, just a linked logo).
- `blocks/wrs-visit-our-parks/wrs-visit-our-parks.css` — new; ports only the source's mobile
  ruleset for `.wildlife-park`/`.list-park` (the only one with a real design), applied at all
  widths since this block has no hamburger-flyout host to inherit visibility from — flagged as an
  extrapolation in the file's own docblock, not a verified desktop port.
- `models/_section.json` — appended `"wrsvisitourparks"` to the `section` filter's `components`
  array (child id intentionally not added).
- `tests/blocks.test.mjs` — added 7 cases: two-park normal render, title/href/alt correctness per
  row (no cross-row bleed), instrumentation moved onto the item not the row, a park authored
  without an image yet, and the unconfigured-outside-editor / unconfigured-in-editor-placeholder
  pair.
- `npm run build:json`, `npm run lint` and `npm test` all pass (105/105 tests).
- `blocks/header/` was **not** touched, as required — it already covers the destination for the
  navigation content flagged above (the `/nav` fragment it loads).

## mandaicffourcollisting

**Source:** `wrs-components-export/mandaicffourcollisting/` — `wrs/components/mandai/mandaicffourcollisting`
(no `sling:resourceSuperType` — a standalone `cq:Component`). 11 top-level dialog fields, one
composite multifield (`listingitems` → fieldset `./cfItems`, 2 fields per row).

**Decision: built a shell, same shape as `featuredlistingv2` above.** No fetch, no servlet, no
GraphQL client. Read that entry first — this one is the second Content-Fragment-backed component
in the run and reuses its analysis rather than repeating it.

### The dialog's own label is wrong — checked, not assumed

The survey that scoped this component flagged `cfPath` as possibly enumerating a **folder**
(`fieldLabel="Content Fragment Folder Path"`, `fieldDescription="Please Provide Content Fragment
Folder Path"`), which would put it on a different servlet-vs-GraphQL branch than
`featuredlistingv2`'s single-fragment-per-row shape (branch 2, filtering/listing, not branch 3).
Reading `MandaiCFFourColListingModel.getAllCFDetails()`/`isValidCF()` settles it the other way:

```java
private void getAllCFDetails(String path, boolean hideCTAButton) {
    Resource cfResourceOne = resourceResolver.getResource(path);   // path IS the CF, not a folder
    if (cfResourceOne == null) { return; }
    getContentFragmentList(cfResourceOne, hideCTAButton);
}
```

There is no `NodeIterator`, no `QueryBuilder`, no `resourceResolver.getResource(path).listChildren()`
anywhere in the class — `isValidCF()` checks `cfResource.getChild("jcr:content/data")`'s own
`cq:model` directly, and `getCFDetails()` adapts `cfResource`'s own `jcr:content/data/master` child.
`cfPath` has to be a Content Fragment's own path for this to work at all; a folder path would fail
`isValidCF()` and the row would silently render nothing. The dialog's field label is simply
misleading — probably copy-pasted from a sibling component that genuinely does take a folder — not
a listing operation. Combined with the multifield's own `eaem-min-items="1" eaem-max-items="4"`
cap, this is exactly `featuredlistingv2`'s shape: an author-curated set of up to a handful of
individually-picked fragment paths, one per row, not a query over a folder's contents.

### Where this DOES differ from `featuredlistingv2`, and why it matters

`featuredlistingv2`'s recommendation (servlet, not GraphQL) rested on a specific, visible finding:
`FeatureListingV2Model` itself calls `CommonUtils.getCompressedResizedImageURL()` for both image
variants and `I18nUtils.getLabel()` for the button copy — real derived-string logic that a GraphQL
migration would have to reinvent client-side. Working the same rule here:

1. **Page-level data?** No — `getCtaPath()` calls `CommonUtils.getProperURL(ctaPath,
   resourceResolver)`, the same simple internal-link-resolution idiom this repo's own
   `resolveHref()` already ports elsewhere; `resourceResolver` is otherwise used only to resolve
   `cfPath`. No page property reaches a card. Branch 1 does not match.
2. **Filtering/sorting/pagination?** No, per the "folder" finding above — author-curated rows,
   confirmed. Branch 2 does not match.
3. **Branch 3, with the same "no derived strings" caveat `featuredlistingv2` raised — except here
   it cannot be checked at all**, and that inability is the material finding for this component:
   everything the HTL renders per item — `title`, `locationLabels`, `dateLabels`, `timeLabels`,
   `tags`, `shortDescription`, `image`, `imageAltText`, `imageIsDecorative`, `ctaText`, `ctaLink` —
   comes from `masterResource.adaptTo(MandaiColumnListingCFDetails.class)`. That bean class is a
   **transitive dependency not in this bundle** (COMPONENT.md's "Not copied" list: Java imports
   under `.models.beans.*` were not followed). `featuredlistingv2`'s derived-string logic was found
   because it sat directly in the Sling Model that WAS in the bundle; this component's equivalent
   logic, if any, is invisible from here.

   The HTL's own hints lean toward "yes, there is formatting logic to find": three of the ten CF
   fields render as **lists** (`data-sly-list.locationLabel="${item.locationLabels}"`, `dateLabels`,
   `timeLabels`) and a fourth (`tags`) does too — plural getter names on a bean adapting a single CF
   resource strongly suggest the bean parses/splits a raw CF field into an array (the same shape of
   work `FeatureListingV2Model` did explicitly for its two image variants), which is exactly the
   kind of logic the rule says a GraphQL migration would have to reinvent client-side rather than
   reuse from a known-good server-side class.

**Recommendation: lean servlet, consistent with `featuredlistingv2`, but with lower confidence** —
the missing bean means this cannot be confirmed to the same standard. `MandaiColumnListingCFDetails.java`
(package `sg.com.wrs.core.mandai.objects`, per the model's import) must be sourced from
`Mandai-AEM` and read before either architecture decision is finalized. If it turns out to do
nothing but expose raw CF fields with no parsing/formatting, the GraphQL branch becomes viable here
even though it was rejected for `featuredlistingv2` — a genuine case where the two sibling
components could reasonably land on different answers, not an inconsistency to resolve away.

### What was built

A container block, matching the dialog's own nesting:

- parent `wrsfourcollisting` — the 9 non-multifield dialog fields (`title`, `style`, `align`,
  `anchorLink`, `bgColor`, `alignItems`, `noTopPadding`, `noBottomPadding`, `ctaStyle`, `ctaText`,
  `ctaPath` — 11 fields total) collapsed into **3 cells**:
  - `title` — its own cell, unchanged.
  - `cta_link` (`ctaPath`, aem-content) + `cta_linkText` (`ctaText`) + `cta_style` (`ctaStyle`) —
    grouped by the shared `cta_` prefix, the section-level "view all" CTA at the bottom of the
    component (`modal.ctaPath && modal.ctaText`), not the per-item CTA (that one is CF-derived,
    see above).
  - `layout_style` / `layout_align` / `layout_bgColor` / `layout_alignItems` / `layout_anchorLink`
    / `layout_padding` — grouped by the shared `layout_` prefix. Six model fields represent the
    remaining seven dialog fields; see the boolean trap below for where the count changes.
- child `wrsfourcollistingitem` — `cfPath` (aem-content, `rootPath: /content/dam/fragments`) +
  `hideCTAButton` (boolean), 2 cells, no grouping needed (fits the brief's prediction).

**The boolean-grouping trap, and the fix chosen.** `noTopPadding`/`noBottomPadding` are two
same-shape checkboxes (dialog text: "Grouped with item above" / "Grouped with item below") that,
if placed in the same grouped `layout_` cell, would each render as a bare `true`/`false` `<p>` with
no field name attached — indistinguishable from each other, exactly the trap the task brief
describes. Two ways to avoid it were considered:

1. **Keep them in separate cells** (positional index tells them apart). Rejected: this component's
   cell budget already groups everything else into `layout_`, and splitting these two into their
   own cells each would burn 2 of the remaining budget for two fields that are visually two facets
   of ONE setting (how the section's own padding works), while other, more clearly-distinct fields
   (`anchorLink`) would still need a place — more fragile bookkeeping for no benefit.
2. **Collapse both into one select field with a distinct vocabulary** — the fix built here:
   `layout_padding` with four values, `none` / `no-top` / `no-bottom` / `no-top-bottom`, covering
   exactly the four states the two checkboxes could combine into. Because every value in this
   vocabulary is unique and known ahead of time, the block's reader (`readLayout()`) can identify
   it by content match the same way it identifies `layout_style`/`layout_align`/`layout_bgColor`,
   with no risk of two values in the same cell being confused for each other. This is a genuine
   field-shape change (2 checkboxes → 1 select) but loses no authoring capability — the same four
   reachable combinations are still reachable, just via one control instead of two.

   One residual, deliberately-accepted risk, called out in the block's own docblock: the free-text
   `layout_anchorLink` field sits in the same cell as this vocabulary. If an author ever typed an
   anchor id that happened to exactly match one of the enumerated values (`none`, `h2`,
   `title-center`, `bg-base`, `items-center`, …), the reader would misclassify it. This was accepted
   rather than engineered around because every other value in the cell already carries a real,
   pre-existing default from its own `select`'s `value` attribute (so it always emits something
   distinguishable), leaving `anchorLink` as the only genuinely free-text field in the group — the
   same "whatever is left over" pattern `four-column-tiles`' own `readParent()` already uses for its
   title/subtitle pair, not a new risk this component introduces.

- **CSS**: ported from `styles/deployed-bundle-extract.css`, scoped by class name to
  `md-4-col-content-fragment`/`md-4-col-content-fragment__item` and the shared bare classes
  (`md-button-big`, `md-link-with-arrow`, `md-tag-label`). The sibling `.less` file in the same
  bundle (`md-3-col-content-fragment-with-filter-and-cta.less`) and the matching
  `md-3-col-content-fragment-with-filter-and-cta__item` rules in the extract belong to a
  **different, 3-column component**, not this one — excluded by selector, per the extract's own
  warning that a rule can appear because it shares a class with another component. One dead rule
  found and NOT ported: the extract's `.md-4-col-content-fragment.no-padding-bottom .row
  .col-md-3:last-child` targets a class (`no-padding-bottom`) the HTL never emits — the HTL's own
  toggle classes are `no-top-padding`/`no-bottom-padding` — read as a stale leftover from an earlier
  markup revision, not carried across. The desktop 4-up grid itself is a reconstruction (Bootstrap
  `col-md-3`, not in this repo and not in the extract, which has no grid/width rules at all for this
  component per its own header note) — flagged for re-check once authored, same caveat
  `columncontrol`'s entry raised for the same missing-Bootstrap-grid situation.
- `match-height.js` (`data-load-plugins="[\"match-height.js\"]"` on each item, `data-match-height`)
  is referenced in the HTL but, per the task brief, is not in this component's own export bundle —
  it IS present in the `columncontrol` bundle. Not built: it exists to equalize card heights across
  a row, which this port already achieves for free via CSS Grid's default row-height behaviour
  (`display: grid` rows stretch every cell in the row to the tallest by default) — a case where the
  native layout primitive replaces the JS rather than needing it ported, not an omission.

### Should this merge with `four-column-tiles`?

Read `blocks/four-column-tiles/` before answering, as instructed — **not recommended**, and for
reasons specific to what each component actually is, not just surface naming:

- `four-column-tiles` is a Ranger Buddies component: a horizontally-scrolling, dot-navigated
  carousel (`rb-track`/`rb-dots`, native scroll-snap) of image+caption tiles inside the `rb-section`
  torn-edge-mask band system, with a single shared parent CTA.
- `wrs-four-column-listing` is a WRS component: a static wrapping grid of Content-Fragment-backed
  cards (image, tags, multi-line meta, description, per-item CTA), no carousel, no mask artwork, a
  flat `bg-base`/`bg-sap-white` fill instead of `rb-section`'s masked bands, and a per-item CTA
  whose data isn't even resolved yet.
- The only real overlap is "four columns of things on desktop" and the coincidence of both source
  names containing "4 col" / "Four Column" — the same shape of false-cognate `backgroundsection`'s
  entry already found when checking `rb-section.bg-*` against WRS's own flat backgrounds. Forcing
  one block to cover both would mean branching most of `decorate()` on which brand's shape is
  authored, for a code-reuse gain smaller than the branching complexity it would add.

### What a human needs to decide

- **Source and read `MandaiColumnListingCFDetails.java`** before finalizing servlet vs GraphQL —
  this is the one piece of evidence `featuredlistingv2`'s equivalent decision had and this one
  does not.
- Whether to build the servlet (leaning recommendation above) or accept the GraphQL tradeoffs, same
  choice `featuredlistingv2` left open, once the bean is read.
- `match-height.js`'s equalize-height behaviour is treated here as already covered by CSS Grid — if
  a Content-Fragment card render (once built) breaks out of a simple grid cell (e.g. an
  absolutely-positioned element), re-verify this assumption.

### Files touched

- `blocks/wrs-four-column-listing/_wrs-four-column-listing.json` — new; parent `wrsfourcollisting`
  (11 dialog fields in 3 cells: `title`, `cta_*`, `layout_*`) with a `filter` naming the child;
  child `wrsfourcollistingitem` (`cfPath`, `hideCTAButton`, 2 cells).
- `blocks/wrs-four-column-listing/wrs-four-column-listing.js` — new; shell `decorate()`, no fetch,
  one commented seam for the CF-resolution architecture decision above.
- `blocks/wrs-four-column-listing/wrs-four-column-listing.css` — new; ports the section/heading/
  button/tag/link-arrow geometry that does not depend on CF data from
  `styles/deployed-bundle-extract.css`, plus a reconstructed grid (see above) and the same
  "unresolved" placeholder style pattern as `wrs-featured-listing`.
- `models/_section.json` — appended `"wrsfourcollisting"` to the `section` filter's `components`
  array (child id intentionally not added).
- `tests/blocks.test.mjs` — added 15 cases: title/heading-level render, bgColor modifier, anchorLink
  extraction (including the specific case that caught a real bug during development — `'none'`
  being misread as the anchor id until added to the padding vocabulary), alignItems, one
  unresolved card per authored path (with the `hideCTAButton` marker), the section CTA, 
  instrumentation on title/item/CTA, all four `layout_padding` states, blank title/CTA, a blank
  Content Fragment pick, and the unconfigured-outside-editor / unconfigured-in-editor-placeholder
  pair.
- `npm run build:json`, `npm run lint` and `npm test` all pass (120/120 tests).
- `blocks/four-column-tiles/` was **not** touched or extended, per the constraint and the
  not-recommended finding above.

## mandaiexperiencecarouselfeature

**Source:** `wrs-components-export/mandaiexperiencecarouselfeature/` —
`wrs/components/mandai/mandaiexperiencecarouselfeature`. 16 top-level dialog fields (including 8
Granite colorfields), one composite multifield (`colItems` → `./imageCarousel`, 7 fields per row).
Built as `blocks/wrs-experience-carousel/`, a container block: parent `wrsexperiencecarousel` (4
cells: `card_*`, `cta_*`, `layout_padding`, `color_*`), child `wrsexperiencecarouselitem` (3
cells: `image`, `content_*`, `cta_*`).

### The per-instance `<style>` block → CSS custom properties

The HTL injects an inline `<style>` block per instance, keyed on
`#mecf-${resource.path.hashCode}`, generating up to 8 rules from 8 Granite colorfields. Checked
for a reason this would not translate (the brief specifically asked to check hover-state usage):
all 8 are plain `background-color`/`color` declarations, the 4 hover variants gated on a
Modernizr `.no-touch` class this repo already replaces with
`@media (hover: hover) and (pointer: fine)` elsewhere. No blocker — built as documented, CSS
custom properties set on the block root in `decorate()`, consumed with fallbacks matching the
deployed bundle's own defaults so an unconfigured instance still looks like the live site.

### The naming trap — avoided

`contentBodyTitle` = `contentBody` + `Title`, and `contentBodyText` = `contentBody` + `Text`,
both exactly matching this project's collapsing-suffix convention, with `contentBody` genuinely
present as a sibling field. Kept as source names, the model build would have silently merged
`contentBody`/`contentBodyTitle`/`contentBodyText` into one cell, discarding two of three colours
— caught before building, not after. All 8 are modelled with an explicit `color_` prefix
(`color_body`, `color_bodyHover`, `color_bodyTitle`, …), so underscore grouping (which runs before
the suffix rule) puts all 8 in one cell together, deliberately, instead of any pair being silently
absorbed into another.

### A residual limitation, accepted and flagged, not solved — needs a decision if it bites

All 8 colours are freeform text with no shared vocabulary (unlike this codebase's other grouped
cells — a heading tag, `true`/`false`, a mask keyword — which are told apart by matching a known
small value set). They are read **positionally**, in field-declaration order, the same mechanism
every other grouped cell in this codebase uses (`cellValues()`). This repo's own `masthead`
fixture demonstrates AEM omits a blank field from a grouped cell entirely rather than emitting an
empty placeholder for it, so if an author leaves an *earlier* colour blank (e.g. `color_bodyTitle`)
while setting a *later* one (e.g. `color_bodyArrow`), positional reading will misattribute the
later value into the earlier slot. The same limitation applies to the card's `title`/`description`
pair in the same cell (also freeform, also no vocabulary), following the exact technique
`wrs-accordion-tabs`' `readTab()` already uses for its own title/description pair rather than
inventing a new one.

This is a genuine architectural limitation of the "≤4 grouped cells, no vocabulary" model for
fields with more than two freeform optional siblings, not an oversight in this one block — see the
xwalk `key-value: true` escape hatch in `component-definition.json`'s `template`, which would
solve it completely by rendering every field as an explicit label/value row, but restructures the
**entire** block's markup (all-or-nothing per model), not just one cell, so it was not applied here
on the strength of a single component. If the 8-colour cell (or the title/description pair) turns
out to be authored out of order in practice once this block is live, `key-value: true` on this
specific model — accepting the markup-shape change — is the real fix; re-verify against real
published markup first, per every WRS block's standing caveat.

### The Java model — clean, confirmed

`MandaiExperienceCarouselFeatureModel.getImageCarousel()`/`getCtaLink()` do only presentational
work: `CommonUtils.getProperURL()` for link resolution (the same idiom already ported elsewhere
as `resolveHref()`), and `resourceResolver.getResource(image + "/jcr:content/metadata")` reads to
read an asset's own `tiff:ImageWidth`/`tiff:ImageLength` for the `<img>` width/height attributes —
a direct resource lookup on the asset itself, not a query, tag read, or service call. Nothing
flagged; width/height attributes were not carried into the port (EDS's own optimised `<picture>`
markup does not need them), a deliberate simplification, not a gap.

### Two RTE fields, shared custom config — not re-flagged at length

`card_description` and `content_description` both use `/apps/wrs/widgets/richtext/text`, the same
shared custom RTE config already flagged for its lack of a Universal Editor restricted-style-list
equivalent (see component 1's entry). Cross-referenced, not repeated here.

### `md-carousel.js` — reimplemented, not ported

Shared with two other components in this run. It is a thin Slick wrapper
(`slides-to-show-desktop/tablet/mobile="1"` here — always one slide at a time). Reimplemented
using this repo's shared `.rb-track`/`.rb-dots` native scroll-snap primitives (`buildDots()` from
`scripts/rb-helpers.js`), the same substitution `one-column-banner-carousel` already made, rather
than porting jQuery/Slick. Slick's own arrow/dot chrome was not ported; native touch/keyboard
scrolling plus dots replace it. The dot colours are overridden away from `.rb-dot`'s shared Ranger
Buddies palette, since WRS is a separately-migrated brand with its own colours.

### Files touched

- `blocks/wrs-experience-carousel/_wrs-experience-carousel.json` — new; parent
  `wrsexperiencecarousel` (16 dialog fields in 4 cells) with a `filter` naming the child; child
  `wrsexperiencecarouselitem` (7 dialog fields in 3 cells).
- `blocks/wrs-experience-carousel/wrs-experience-carousel.js` — new; full `decorate()`, no seams —
  every field in this dialog is presentational, unlike the two Content-Fragment-backed components
  above.
- `blocks/wrs-experience-carousel/wrs-experience-carousel.css` — new; ports
  `styles/deployed-bundle-extract.css`'s `md-feature-carousel-experience`/`md-feature-carousel__*`
  rules, with the 8 colour rules rewritten as `var(--wrs-ecf-*, <deployed default>)`.
- `models/_section.json` — appended `"wrsexperiencecarousel"` to the `section` filter's
  `components` array (child id intentionally not added).
- `tests/blocks.test.mjs` — added 15 cases: card title/heading/CTA, description markup, placement
  modifier class, the 8 colours landing as 8 distinct custom properties (guards the naming trap
  directly), item count, `image_disableGradient` toggling `text-gradient`, item CTA presence, item
  title/description, dots for a multi-item carousel, instrumentation on the title block and each
  item, all four `layout_padding` states, no-CTA rendering, no-colours rendering (fallback path),
  a blank optional description, and the unconfigured-outside-editor /
  unconfigured-in-editor-placeholder pair.
- `npm run build:json`, `npm run lint` and `npm test` all pass (140/140 tests).
