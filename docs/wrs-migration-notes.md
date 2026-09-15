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

### Outcome — wired to the servlet

The decision above is now made: **servlet**, and `ContentFragmentServlet` (mandai-aem-cloud,
`com.facultydigital.mandai.core.servlets`) is built. This block is wired to it.

- **`scripts/wrs-cf.js`** (new, shared with `wrs-four-column-listing` below) is a thin, fixed
  client for the endpoint contract: `getBasePathBasedOnEnv()` resolves the AEM publish origin
  (`https://publish-p144127-e1488012.adobeaemcloud.com`, derived from the author host in
  `fstab.yaml`) on `aem.page`/`aem.live`/`localhost`, and `''` (relative) elsewhere, on the
  assumption that the AEM CDN fronts production — flagged in the function's own docblock as an
  assumption to revisit if EDS's CDN fronts production instead. `fetchFragment(path)` builds
  `{origin}/content/mandai-api.cfdetails.json{path}` — the path is the URL suffix, never a query
  string, and is **not** URI-encoded (browsers don't encode slashes in a path, and the suffix is
  read literally server-side) — sends no custom headers (keeps the request CORS-simple, no
  preflight), and returns the `elements` object or `null` on any failure, never throwing.
  `fetchFragments(paths)` resolves many in parallel, preserving order.
- **`decorate()` stays synchronous in its DOM-shape work.** Every authored row renders immediately
  in the unresolved placeholder state (unchanged from the shell), so first paint never waits on
  the network. Only afterwards are fragments fetched in parallel; each card independently swaps to
  resolved markup as its own fetch settles. A fragment that 404s (or fails for any other reason)
  leaves only that one card unresolved — it does not blank the block or its siblings.
- **The editor does not fetch at all.** `block.hasAttribute('data-aue-resource')` gates the fetch
  entirely — the Universal Editor runs cross-origin and authors are editing the `fragmentPath`
  field, not viewing resolved data, so rows stay in their existing unresolved-but-selectable state
  there, deliberately.
- **Images are plain `<img>`/`<picture>` against the servlet's raw DAM path, not
  `createOptimizedPicture()`.** The source's `getCompressedResizedImageURL(url, resize720|512)` is
  an AEM 6.5 transform-servlet convention (`.transform/compress/resizeNNN`) that may not exist on
  AEMaaCS; the servlet deliberately returns the raw path rather than guessing at an equivalent, and
  `createOptimizedPicture()` would append EDS media-bus query params AEM does not understand,
  yielding an unoptimised original with a misleading srcset. **Image optimisation for these two
  variants remains unresolved and is a follow-up**, not solved here.
- `show-all.js` (missing from the export bundle) is still not built — unchanged from the shell.
- **Files touched, in addition to the above:** `scripts/wrs-cf.js` (new); `wrs-featured-listing.js`
  (SEAM replaced with the real fetch/render wiring); `wrs-featured-listing.css` (styles added for
  the resolved `.wrs-featured-listing-link`/`-desc` markup, on top of the existing
  grid/card/unresolved rules); `tests/blocks.test.mjs` (3 new cases: a resolved card next to a 404
  sibling that stays unresolved, a payload with keys omitted rendering defensively, and edit mode
  performing no fetch — `global.fetch` stubbed per test, since the jsdom harness has none of its
  own). `npm run build:json`, `npm run lint` and `npm test` all pass (210/210 tests).

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

### Outcome — wired to the servlet

The decision above (lean servlet) is now confirmed and built: `ContentFragmentServlet`
(mandai-aem-cloud) serves both `mandai-things-to-do` and `mandai-things-to-do-w-operating-hours`
from the same endpoint used by `wrs-featured-listing`, and this block is wired to it — the missing
`MandaiColumnListingCFDetails.java` bean's formatting logic (the multi-value `locationLabels`/
`dateLabels`/`timeLabels`/`tags` arrays) is reproduced server-side by the servlet's own
multi-value-cap handling (`setMaxThree()`, ported as `maxMultiValue`), not reinvented client-side.

- Uses the same **`scripts/wrs-cf.js`** client as `wrs-featured-listing` (see that section's
  outcome note for the full contract: suffix-path URL, no encoding, no custom headers, `elements`
  or `null`, never throws).
- **`decorate()` stays synchronous in its DOM-shape work.** Section-level fields (title, layout,
  section CTA) and every child row's unresolved placeholder render immediately; fragments are then
  fetched in parallel and each card independently swaps to resolved markup as its own fetch
  settles. A 404/failure on one card leaves only that card unresolved.
- **The editor does not fetch at all**, same gate and same rationale as `wrs-featured-listing`.
- **`hideCTAButton`** (authored on the dialog's own child row, not the fragment) is read and
  applied at render time — the resolved card's CTA is suppressed whenever it is checked, even if
  the fragment itself carries `ctaText`/`ctaLink`, porting
  `MandaiCFFourColListingModel.getCFDetails()`'s server-side clearing of `ctaText`.
- **Images are plain `<img>`, not `createOptimizedPicture()`** — same reasoning as
  `wrs-featured-listing`'s outcome note; flagged as an open follow-up here too.
- Every resolved-element read is defensive (`elements.field ?? `/`Array.isArray(...) &&`), since
  this one endpoint serves two fragment models with disjoint element sets and the servlet omits
  absent keys rather than sending null.
- `match-height.js` remains not built — CSS Grid's row-stretch still covers it, unchanged from the
  shell; re-verify once real content shows whether any resolved card breaks out of the grid cell
  (e.g. an absolutely-positioned element), per the shell's own original caveat.
- **Files touched, in addition to the above:** `scripts/wrs-cf.js` (new, shared with
  `wrs-featured-listing`); `wrs-four-column-listing.js` (SEAM replaced with the real fetch/render
  wiring); `wrs-four-column-listing.css` (no rule changes needed — the `.all-content`/
  `.md-icon-text`/`.md-tag-label`/`.md-link-with-arrow`/`.md-button-big.item-with-button` rules
  ported ahead of time in the shell now style real, resolved markup); `tests/blocks.test.mjs` (4
  new cases: a resolved card next to a 404 sibling that stays unresolved, `hideCTAButton`
  suppressing a CTA the fragment does have, a payload with keys omitted across both models, and
  edit mode performing no fetch — `global.fetch` stubbed per test). `npm run build:json`,
  `npm run lint` and `npm test` all pass (210/210 tests).

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

## mandaimastheadcarousel

**Source:** `wrs-components-export/mandaimastheadcarousel/` — `wrs/components/mandai/mandaimastheadcarousel`
(`sling:resourceSuperType="wcm/foundation/components/parsys"`). 3 parent fields
(`viewportScaling`, `isAutoplayCarousel`, `carouselSpeed`) plus one `bannerItems` multifield of 33
fields, gated by a `mediaOption` select into five branches (image / video / youtube / vimeo, plus a
countdown-timer panel nested inside the image branch's own show/hide target).

**Decision: built, split into a container plus FOUR sibling child block types** — image, video,
youtube, vimeo — not one child model, not two, not a "build image only" deferral.

### The split, and what was rejected

One child model cannot hold 33 fields — even grouped into the underscore-prefixed cells every
other block in this repo uses, that is well past the 4-cell maximum a single model is allowed.
Three shapes were weighed (per the task prompt):

1. **One container, one child model holding all branches.** Rejected outright for the reason
   above — this is the shape the task prompt itself already ruled out.
2. **One container, one MERGED "video" child (video/youtube/vimeo combined behind a `source`
   select), plus the image child.** Rejected. The three video-ish branches share almost no fields:
   youtube has no mobile-fallback-image pair at all (the dialog genuinely omits it — confirmed by
   reading the dialog XML tree, not an oversight in this port), vimeo has a `videoPlaybackBehavior`
   toggle neither of the others has, and video/vimeo each have their own distinct mute/play-pair
   naming. A merged model needs the union of all three branches' fields, which puts the count
   problem right back where option 1 left it, in exchange for a field grouping ("video vs
   youtube vs vimeo, picked by a select") that does not exist anywhere in the source dialog. The
   ground rule ("do not add fields the dialog does not have") weighs against inventing that
   merge more than it weighs against a fourth child model.
3. **Image-only now, others flagged as follow-up.** Rejected. Unlike `featuredlistingv2`'s Content
   Fragment resolution or `header`/`footer`'s inherited site-chrome panels — genuine
   architecture gaps with no client-side answer — video/youtube/vimeo here are ordinary,
   client-renderable HTML (a `<video>` tag, two flavours of iframe). There is no architectural
   reason to leave them unbuilt, only an effort one, and the task explicitly asked for that
   tradeoff to be made deliberately rather than by default.

**Chosen: option 2 read literally as FOUR child types, not two.** Checked field-by-field, each
branch's own fields — grouped exactly the way every other multi-field block in this repo groups
fields — fit comfortably inside 4 cells **on its own**:

| Child | Source fields | Cells | Grouping |
|---|---|---|---|
| `wrsmastheadimageslide` | 16 (11 image/content/cta + 5 countdown) | 4 | `image_*`, `content_*` (+bottomSpacing), `cta_link`/`cta_linkText`, `countdown_*` |
| `wrsmastheadvideoslide` | 6 | 3 | `video_*`, `fallback_*`, `controls_*` |
| `wrsmastheadyoutubeslide` | 2 | 1 | `youtube_*` |
| `wrsmastheadvimeoslide` | 8 | 4 | `vimeo_*`, `fallback_*`, `playback_*`, `controls_*` |

A container's filter can name multiple accepted child components (`blocks/tabs/_tabs.json` already
does this for `rbtab`/`rbtabtile`), so `wrsmastheadcarousel`'s filter names all four. This is the
"block item cannot itself be a container, flatten nested multifields to siblings" technique the
skill documents, applied to four sibling types instead of two.

### Telling four child types apart, not two

`tabs.js` distinguishes 2 child types by re-reading an existing `align` select's value — reusing a
field that was going to be authored anyway. Four types is one too many to safely overload a shared
field this way (there is no field common to all four branches at all), so each child model was
given one dedicated, first-declared marker field: `image_kind` / `video_kind` / `youtube_kind` /
`vimeo_kind`, each a `select` with exactly one fixed, pre-selected option. This is a field the
source dialog does not have — a deliberate, and here explicitly logged, exception to the ground
rule, because it is precisely the discriminator the migration skill itself prescribes for this
exact situation ("a select with a default, whose values are distinct from every other select in
the block"), not an authoring convenience invented on top of the dialog.

`rowKind()` in `wrs-masthead-carousel.js` asks `data-aue-model` first (reliable in the editor from
the moment a row is created); on a published page, with no instrumentation at all, it falls back to
reading the first value of the row's first cell, which is always that kind marker. Covered by its
own test (`wrs-masthead-carousel: child kinds are told apart on a published page with no
data-aue-model at all`) with all four kinds interleaved in a non-declaration order, specifically to
rule out any accidental reliance on row position.

### The `gmt` datasource — a curated finite list, not the live ~600 IDs

`gmt`'s dialog datasource (`datasource/listTimeZoneDataServlet`) is an OSGi servlet with no
Universal Editor equivalent — confirmed by reading `TimeZoneDataServlet.java` (included in the
bundle): it builds its option list from `TimeZone.getAvailableIDs()` (~600 entries) at request
time, formats each as `(GMT±H:MM) <id>`, and pre-selects `Asia/Singapore`. Inlining ~600 options is
not a sane finite list. `countdown_gmt` in the built model is a curated 19-entry `select`:
`Asia/Singapore` (default, matching the servlet's own default and the site's primary market) plus
the other Asia-Pacific zones a Singapore-based wildlife park's other content plausibly touches
(Malaysia, Indonesia, Thailand, Philippines, Hong Kong, mainland China, Japan, Korea, India, UAE,
Australia ×2, New Zealand) and the obvious major Western source markets (UK, France, US ×2) plus
UTC as a catch-all. This is my own judgement call, stated as such — there is no authored WRS
content in this checkout to derive an actual-usage list from. If a country outside this set turns
out to matter, extending the list is a one-line addition to `_wrs-masthead-carousel.json`, not a
redesign.

**`gmt` is modelled but NOT used to compute the countdown's target time** — see the next section.

### `timer-countdown.js` — referenced by the HTL, absent from the bundle

The HTL loads `timer-countdown.js` via `data-load-plugins` on the countdown markup; it is not in
the export. Rather than leave the countdown entirely unbuilt, a minimal countdown **was**
implemented (`initCountdown()` in `wrs-masthead-carousel.js`), built from what the markup itself
implies (`<span class="days">`/`.hours`/`.minutes`/`.seconds` inside a fixed `<ul>`, a
`data-time-end`/`data-url-redirect` pair) — not copied from any source, because there is no source
to copy. It ticks down from `Date.parse(countdown_timer)` and, once outside the editor, redirects
to `countdown_redirectLink` at zero, matching the HTL's own `data-mode="publish"` guard against
redirecting an author out of the page they are editing.

The stated, unverifiable assumption: `countdown_gmt` is read into the model but not used to build
the target `Date` — AEM Cloud's `datetime`-typed datepicker serialises with its own UTC offset
already, so `Date.parse()` alone resolves to the correct absolute instant, and `gmt` has nowhere in
this markup to be rendered as auxiliary "this countdown is in GMT+8" copy either. If the real,
missing `timer-countdown.js` combined the two fields differently, this needs revisiting once that
script — or real authored/published output — is available to test against. This is exactly the
kind of choice the task asked to be made and stated, not silently guessed.

### A second undocumented gap, found while building the controller buttons

Neither `masthead-carousel.js` nor `video-banner.js` (the two scripts this component's HTL
actually loads) wires clicks for `.md-masthead__volume-button`/`.md-masthead__play-button` — the
controller markup this component itself renders. `video-banner.js`'s `embedSoundControl()` targets
a different, older `.sound-controller` pattern used elsewhere on the site, not this one. So the
mute/play button behaviour in `wrs-masthead-carousel.js` (`buildControls()`, native `video.muted`/
`.play()`/`.pause()` for the mp4 branch, the documented YouTube and Vimeo postMessage protocols for
the other two — no extra SDK script load for either) is original code providing equivalent UX, not
a verified port of anything in this bundle. Flagged here as its own finding, separate from the
already-known `timer-countdown.js` gap.

### The gradient classes — a reconstruction

`item.imageGradient`/`item.textGradient` in the HTL are computed by `MastheadCarouselItem.java`,
which is **not** in this bundle (only the parent `MandaiMastheadCarouselModel.java` is). The
dialog's own `gradientOption` values are `onText`/`onImage`; the deployed CSS extract's gradient
rules are keyed on differently-named classes (`gradients-right-left`/`gradients-bottom-top`/
`gradients-left-right`) with no visible mapping back to those two dialog values, because the bean
that would resolve one into the other is missing. `wrs-masthead-carousel.css` ports `onImage` as a
bottom-anchored dark fade over the picture (the extract's `gradients-bottom-top` shape — the one
gradient direction that does not depend on `content_textAlignment`, and the most common masthead
treatment) and `onText` as a soft radial gradient behind the text panel. Both are this migration's
own best-effort reconstruction from the CSS alone, explicitly flagged in the CSS file's own header
— re-check once authored.

### What is built, what is not

- **Image slides: built completely.** Desktop/mobile image swap at the source's own 1025px
  breakpoint, heading, sub-heading, CTA (reusing `readCta()`), gradient overlay, text alignment,
  bottom-spacing, `fetchPriority`, and the countdown described above.
- **Video (mp4) slides: built.** Desktop/mobile `<source>` swap at the shared 992px breakpoint
  (matching `blocks/masthead/masthead.js`'s own `DESKTOP` constant, duplicated rather than
  imported — see "Consolidation" below), mobile fallback image, mute/play controller buttons.
- **YouTube slides: built.** Lazy iframe embed via `IntersectionObserver` (matching
  `blocks/masthead/masthead.js`'s own lazy-Brightcove rationale — a masthead is the LCP element,
  third-party JS/iframes should not load ahead of it), mute/unmute via the documented YouTube
  postMessage command protocol.
- **Vimeo slides: built, with one sub-branch NOT built.** Lazy iframe embed, "inline" playback
  behaviour, mute/play via Vimeo's documented postMessage protocol. The **"popup" playback
  behaviour's actual modal is not built** — `#vimeoModal` in the source HTL is shared, page-level
  markup living outside this component's own DOM, wired by a script not present in this bundle
  either. "Popup" falls back to rendering the same inline embed "inline" uses, rather than being
  invented from nothing — flagged in the JS's own docblock, not silently dropped.
- **One field genuinely unverifiable, flagged rather than guessed past:** how a DAM **video**
  asset renders through a `reference` field is not evidenced anywhere in this repo — every other
  `reference` field example (images) confirms a `<picture>`, but there is no video-asset precedent
  to check against. `readAssetPairCell()` is deliberately defensive (tries `<img>`, then
  `<source>`, then `<a>`) rather than assuming one shape; flagged for re-check once this block has
  been authored with a real video asset.

### Consolidation with `blocks/masthead/` and `blocks/hero/`

Not attempted, and neither block was touched, per the task's constraints. Two things worth a human
decision later, both noted in `wrs-masthead-carousel.js`'s own docblock:

- `blocks/masthead/masthead.js`'s `DESKTOP = 992` breakpoint constant is duplicated here rather
  than imported, because it is a private convention of that module, not an exported shared
  constant. Promoting it to a shared helper once both blocks have real authored content (and this
  one's actual media-type usage is known) would remove the duplication cleanly — not done
  speculatively here.
- Structurally, this block is a strict superset of `masthead` (a single slide vs a multi-slide
  carousel, over the same four media types once `masthead`'s own sibling `mandaimasthead` — if in
  scope elsewhere in this run — is checked). If that turns out to need the same four media types,
  unifying the two behind one shared renderer would be the natural next step. Not attempted here,
  to avoid touching a block outside this task's stated scope (`blocks/masthead/` and
  `blocks/hero/` were both explicitly off-limits).

### Files touched

- `blocks/wrs-masthead-carousel/_wrs-masthead-carousel.json` — new; parent `wrsmastheadcarousel`
  (3 fields, 3 cells, `filter` naming all four children) plus four child models
  (`wrsmastheadimageslide`, `wrsmastheadvideoslide`, `wrsmastheadyoutubeslide`,
  `wrsmastheadvimeoslide`) as detailed in the table above.
- `blocks/wrs-masthead-carousel/wrs-masthead-carousel.js` — new; `rowKind()` discrimination, four
  per-kind cell readers and renderers, the fetchPriority pass (ported exactly from
  `MandaiMastheadCarouselModel.init()`), the minimal countdown, and the controller-button wiring —
  all flagged where reconstructed rather than ported, per this entry's own sections above.
- `blocks/wrs-masthead-carousel/wrs-masthead-carousel.css` — new; ports
  `styles/deployed-bundle-extract.css`'s `banner__content-item`/`cover-picture`/`md-button-big`/
  `countdown-wrapper`/`md-masthead__controller` rules, doubly-scoped under
  `.wrs-masthead-carousel`, with the gradient/base-text-panel gaps called out in its own header
  comment.
- `models/_section.json` — appended `"wrsmastheadcarousel"` to the `section` filter's `components`
  array (child ids intentionally not added — reachable only through the parent's own filter).
- `tests/blocks.test.mjs` — added 11 cases: all four kinds rendering together, image content/
  CTA/countdown together, instrumentation on every slide (not the track), child-kind discrimination
  on a published page with no `data-aue-model` at all (the case the task explicitly asked for),
  the fetchPriority high/low/absent sequencing across mixed kinds, an image slide with only a
  header (no CTA/sub-heading/countdown), `viewportScaling`/`isAutoplayCarousel` read from the
  parent rows, and the unconfigured-outside-editor / unconfigured-in-editor-placeholder pair.
- `npm run build:json`, `npm run lint` and `npm test` all pass (161/161 tests).

## mandaiquotecarousel

**Source:** `wrs-components-export/mandaiquotecarousel/` — `wrs/components/mandai/mandaiquotecarousel`
(no `sling:resourceSuperType`, standalone leaf component). Simplest component in the run: 2 parent
fields, one 2-field multifield, a 19-line `@ChildResource` model, one clean 1:1 LESS match.

**Decision: built as a new container block, `blocks/wrs-quote-carousel/`.** Considered reusing the
existing `testimonial` block first, since both are "a heading/settings plus a repeated
quote+attribution list" — the same shape `four-column-tiles` was checked against for component 10.
Here the overlap is closer than that precedent, but still not close enough to reuse outright.

### Why not `testimonial`

Read `blocks/testimonial/testimonial.js`, `.css` and `_testimonial.json` before deciding. Two real,
dialog-level differences, not just naming:

- **The field models don't match.** `testimonial`'s parent model is one field, `title`. This
  component's dialog has no title field at all, but has two `testimonial` doesn't: a `backgroundColor`
  select (`bg-base`/`bg-sap-white` — the same two values `backgroundsection` already added to
  `models/_section.json`'s `style` field) and a free-text `ariaLabel`. Reusing `testimonial` would
  silently drop both — a real authoring capability the source dialog has, gone, with no field to
  recover it. Per the ground rule, dropping an authored field the source has is exactly the kind of
  divergence not to make quietly.
- **`quote` is rendered as raw HTML in the source** (`${item.quote @context='html'}`), unlike
  `testimony`'s plain-text `message`. `testimonial`'s model has no field that preserves markup here.
- **Visually they diverge too.** `testimonial` always wraps its content in a forced
  `.rb-section.mask-1.bg-dark-green` band and deliberately ships with no dots (a documented choice in
  its own CSS docblock — slides peek at 80% instead). This component varies its background per
  instance between two light neutral fills, shows exactly one full-width quote at a time (no peek),
  and the deployed CSS carries visible dot navigation (`.slick-dots`, with a yellow active state) that
  the source actually used. These are different presentation contracts, not a styling nuance.

Given both the field model and the render contract differ, building a separate block is the direct
port; forcing this component's authored fields (or its background variation) into `testimonial`'s
fixed one-field, one-look shape would be the "improve the source" mistake the ground rule warns
against, not a legitimate simplification.

### Cell model

- Parent (`wrsquotecarousel`, 2 cells — `backgroundColor` and `ariaLabel` don't share a prefix, so
  no grouping applies): `backgroundColor` (select, `bg-base`/`bg-sap-white`, default `bg-base` per
  the dialog's own `selected="true"`), `ariaLabel` (text).
- Child (`wrsquote`, 2 cells — `nameDescription` doesn't match any of the five collapsing suffixes,
  so it stays its own cell): `quote` (**richtext**, not `text` — the closest Universal Editor field
  with an HTML value, modelling the dialog's textarea-rendered-as-html contract described above),
  `nameDescription` (text).

`quote` is read via `innerHTML` (falling back to `textContent`) rather than `cellText()`'s plain-text
read, specifically to keep any authored markup — the one place in this component where the dialog
widget (plain textarea) and the rendered contract (html context) disagree, and the render contract
wins per the ground rule.

### Carousel mechanics

Source: Slick, `slides-to-show-desktop/tablet/mobile="1"` — one full quote at a time at every
breakpoint, no peek, plus prev/next arrows and dots. Ported to this repo's shared
`.rb-track`/`.rb-dots` scroll-snap primitives (`buildDots()` in `rb-helpers.js`), consistent with
the same substitution already made for `wrs-feature-carousel` and `wrs-experience-carousel`.
`.rb-track`'s shared default (`grid-auto-columns: 100% / 1.1`, a deliberate peek) is overridden back
to a plain `100%` in `wrs-quote-carousel.css`, because a peek is not what this component's source
did — unlike `testimonial`, whose peek is source-accurate for testimonial's own component. Arrows
are not ported; dot navigation plus native swipe/keyboard scrolling covers the same "move to the next
quote" affordance the arrows provided, matching the pattern already accepted elsewhere in this run.

### Files touched

- `blocks/wrs-quote-carousel/_wrs-quote-carousel.json` — new; parent `wrsquotecarousel` (2 fields,
  `filter` naming the child), child `wrsquote` (2 fields).
- `blocks/wrs-quote-carousel/wrs-quote-carousel.js` — new; `decorate()` reading the 2 parent + 2
  child cells above, richtext-safe quote read, scroll-snap track + dots.
- `blocks/wrs-quote-carousel/wrs-quote-carousel.css` — new; ports
  `styles/deployed-bundle-extract.css`'s `md-quote-carousel`/`md-quote-carousel__message` rules
  (breakpoints 992px/1200px, the source's own, not this repo's 900px default), plus the two
  `--wrs-bg-base`/`--wrs-bg-sap-white` tokens already defined for `backgroundsection`. Slick's own
  arrow/dot CSS is not ported (mechanics are `.rb-track`/`.rb-dots`); the one piece that does carry
  across is the yellow active-dot colour (`#fc0`), the only part of Slick's own styling not
  superseded by the shared primitive's default green.
- `models/_section.json` — appended `"wrsquotecarousel"` to the `section` filter's `components`
  array (child id `wrsquote` intentionally not added — reachable only through the parent's own
  filter).
- `tests/blocks.test.mjs` — added 11 cases: normal render with richtext markup preserved, the
  `backgroundColor` cell applying the matching class, the `ariaLabel` cell reaching the track,
  dots present/absent at 2 vs 1 items, the `bg-base` default when `backgroundColor` is blank, a
  blank `ariaLabel` leaving no attribute, a blank `nameDescription` not crashing `decorate()`,
  instrumentation moving from the child row onto the rendered item, and the
  unconfigured-outside-editor / unconfigured-in-editor-placeholder pair.
- `blocks/testimonial/` was **not** touched, as required.
- `npm run build:json`, `npm run lint` and `npm test` all pass (172/172 tests).

## mandaisocialcontentgrid

**Source:** `wrs-components-export/mandaisocialcontentgrid/` — `wrs/components/mandai/mandaisocialcontentgrid`
(standalone `cq:Component`, no `sling:resourceSuperType`). Built as `blocks/wrs-social-grid/`
(`template.name` "WRS Social Grid"), parent id `wrssocialgrid`, child id `wrssocialtile`,
registered in `models/_section.json`'s `section` filter.

### The 12→4 collapse — checked against the Java bean, not just inferred from the dialog

The survey's "four show/hide branches" undercounted by one: `socialIcon`'s
`cq-dialog-dropdown-showhide` select has **five** options/branches — facebook, instagram, twitter,
text, image — each showing a different subset of 12 total dialog fields (`socialFeedImage` /
`facebookSocialFeedImage` / `instagramSocialFeedImage`; `message` / `twitterMessage`;
`facebookSocialHandle` / `instagramSocialHandle` / `twitterSocialHandle`;
`facebookSocialFeedUrl` / `instagramSocialFeedUrl` / `twitterSocialFeedUrl`). Confirmed by reading
the dialog XML as a tree — five `option-showhide-target` containers, not four.

That reads as 12 unrelated fields, but it is not: `MandaiSocialContentGridItem` — the child Sling
Model each `./slides` row is adapted to (`item.adaptTo(MandaiSocialContentGridItem.class)` in
`MandaiSocialContentGridModel.init()`) — is a `sg.com.wrs.core.mandai.objects` class, not shipped
in this bundle (an "objects" package, out of the Java scope `COMPONENT.md` copies), but its
accessors are used directly and exclusively throughout the HTL: `item.socialFeedImage`,
`item.message`, `item.socialHandle`, `item.socialFeedUrl` — **one accessor per concept**, never a
per-network name, and never once a `facebookSocialHandle`-style name. The item bean itself already
does the collapse this model makes explicit; the HTL is proof, not inference, since it is
impossible to read `item.socialFeedImage` for a Facebook item unless the bean maps
`facebookSocialFeedImage` onto that same getter internally. So this is not the mechanical
converter's "12 cells, wrong" case the task described flattened away — it is a direct,
field-for-field port of the component's own backing bean, four cells deep:
`socialIcon` · `socialFeedImage` · a grouped `link` cell (`link_url` + `link_handle`) · `message`.

### richtext `message` vs textarea `twitterMessage` — an inconsistency in the source, not a real distinction

Kept as **one** richtext field, not two. The source itself treats them identically at render time —
every `item.message` reference in the HTL renders through the same expression,
`${item.message @context='html'}`, with no branch that changes behaviour for twitter. The dialog
widget difference (RTE for `message`, a bare `<textarea>` for `twitterMessage`) reads as an
authoring-time guard against pasting formatted text into what was historically a 280-character
platform, not a content-model difference the render path respects. A `richtext` field is a safe
superset — it can hold unformatted plain text exactly as well as a `<textarea>` can — so the model
field carries a description telling authors to keep Twitter items unformatted, rather than
inventing two fields for one rendered concept. This is the one place in this collapse that is a
policy call rather than a mechanical fact about the bean (the other three cells are a direct port);
flagged here rather than decided silently.

### `tileOrder` is derived, not authored — confirmed, re-expressed as a CSS modifier class

Confirmed in `MandaiSocialContentGridModel.init()`: `tileOrder = socialFeedList.size() <= 4 ?
"order:1" : ""`, written into the main tile's `style` attribute
(`style="${modal.tileOrder @context='styleString'}"`) — there is no dialog field for it anywhere.
It exists because `.social-grid-component__column:nth-of-type(1) { order: 5; }` in the deployed CSS
normally pushes the main title tile behind up to 4 feed items; when there are 3 or fewer items
(≤4 columns total), that would push the title to *last* place instead, so the inline style forces
it back to first.

Re-derived in `decorate()` as a `wrs-social-grid-compact` modifier class on the block (added when
`1 + tiles.length <= 4`, `tiles.length` being the authored row count, unfiltered — the same count
`.size()` used) instead of a JS-computed inline `order` value. `wrs-social-grid.css` reads it:
`.wrs-social-grid-compact .wrs-social-grid-column.main { order: 1; }`. Below the 992px breakpoint
`nth-of-type(1)` is already `order: 1` by default (the source's own mobile media query), so the
class is a no-op there and, like the source's inline style, only actually changes anything at the
desktop breakpoint.

### The three bundled JS plugins are unrelated to this component — none reimplemented

`social-content-grid.js` (`[data-social-content]`, fetches `/bin/socialcontentgrid.servlet.*.json`
via Handlebars), `list-social.js` (`.list-social li` hover/click icon popups) and
`animal-personality-social-grid.js` (`#animal-personality-view-more`,
`.animal-personality-social-grid__box`) ship in this bundle, but **none** of their selectors appear
anywhere in this component's own HTL. They belong to sibling components sharing
`Mandai-EMP-Frontend/app/scripts/plugins/`, bundled by folder proximity, not by relevance — the
same "check the selector before porting" caution the migration skill gives for CSS applies here to
JS. This component's own HTL has no interactive JS hook of its own beyond `.lazyload`, a generic
sitewide lazy-load class with no component-specific logic, superseded by EDS's own `<picture>`
handling. Nothing was ported.

### The Java model — clean, confirmed

`MandaiSocialContentGridModel` does one repository-adjacent thing (`item.adaptTo(...)` over its own
`./slides` children, a direct child-resource adaptation, not a query) plus the `tileOrder` string
computation above. No `QueryBuilder`, no OSGi service lookups, no request/session context. The
second Java file in the bundle, `PlaceholderManager`, only emits the `wcmmode.edit` "no content"
placeholder — EDS/UE has its own unconfigured-block placeholder (`renderEmpty()`), so nothing there
needed porting either.

### The shared RTE config — cross-referenced, not re-argued

`message` uses `/apps/wrs/widgets/richtext/text`, the same shared custom RTE config already flagged
for its lack of a Universal Editor restricted-style-list equivalent (see component 1's entry).
Cross-referenced, not repeated here.

### Files touched

- `blocks/wrs-social-grid/_wrs-social-grid.json` — new; parent `wrssocialgrid` (1 field, `title`)
  with a `filter` naming the child; child `wrssocialtile` (4 cells from 5 fields — `socialIcon`,
  `socialFeedImage`, grouped `link_url`/`link_handle`, `message` — after the 12→4 collapse above).
- `blocks/wrs-social-grid/wrs-social-grid.js` — new; `decorate()` reading the parent title cell and
  4 child cells positionally, the photo/text-column branch matching the source HTL exactly, the
  `tileOrder` re-derivation, no seams (no server-side logic to flag).
- `blocks/wrs-social-grid/wrs-social-grid.css` — new; ports every rule in
  `styles/deployed-bundle-extract.css` traceable to this component's own classes, breakpoints
  rewritten mobile-first at the source's own 992/1024/1200/1440px cutoffs, literal hex colours (no
  `--rb-*`/`--wrs-*` token matches this component's own dark-green/twitter-green/cream palette).
- `models/_section.json` — appended `"wrssocialgrid"` to the `section` filter's `components` array
  (child id `wrssocialtile` intentionally not added — reachable only through the parent's own
  filter).
- `tests/blocks.test.mjs` — added 15 cases: the title cell becoming the heading with instrumentation
  moved, one case per feed type (facebook, instagram, twitter, text, image) exercising the 12→4
  collapse directly, instrumentation moving from a child row onto its column, the compact modifier
  present at 4 total columns and absent at 6, a link cell with a blank handle, a link cell that is
  entirely blank, and the unconfigured-outside-editor / unconfigured-in-editor-placeholder pair.
- `npm run build:json`, `npm run lint` and `npm test` all pass (185/185 tests).

## richtext

**Source:** `wrs-components-export/richtext/` — `wrs/components/commons/richtext`, the only
component in this run with `sling:resourceSuperType="foundation/components/parbase"`. No Java
model backs it at all (`PlaceholderManager` only emits the `wcmmode.edit` "no content" placeholder,
same as everywhere else) — every branch renders straight off `${properties.x @ context='html'}`.
15 top-level dialog fields, no multifield: `richtextOptions` (select, the layout switch),
`showTypes` (select, only consulted for one of the five `richtextOptions` values), `gridSmall`
(checkbox), 9 RTE fields and 3 pathbrowsers.

**Decision: mostly reuse `columns` (no code), plus one small new leaf block,
`blocks/wrs-pull-quote/`, for the two showType treatments that have real, confirmed CSS.**
`disclaimer` and the `default` showType are default content, not a block. `columncontrol`'s and
`image`'s already-established reasoning both apply here, and are cross-referenced rather than
re-argued at length.

### The render matrix, read from the HTL as a tree, not counted from the dialog

The HTL's `data-sly-test`s show `showTypes` is not a sibling switch of `richtextOptions` — it is
nested *inside* the `oneColumn` branch only. Every other `richtextOptions` value (`twoColumn`,
`threeColumn`, `oneColumnOneImage`, `twoColumnTwoImage`) never tests `showTypes` at all. So the
actual mutually-exclusive render matrix is 8 branches, not the "seven layouts" the survey estimated
— the survey undercounted by one because it likely treated `oneColumn`'s `default` sub-branch as
not worth counting separately from "one column", when the HTL in fact has four distinct
`data-sly-test`s for it (`default`/`disclaimer`/`inlineQuote`/`haftPage`), each its own `<div>`:

| # | richtextOptions | showTypes | Renders | EDS mapping |
|---|---|---|---|---|
| 1 | `oneColumn` | `default` | plain text | default content, no block |
| 2 | `oneColumn` | `disclaimer` | plain text, different class | default content, no block (see below) |
| 3 | `oneColumn` | `inlineQuote` | `<blockquote>“ text ”</blockquote>` | **`wrs-pull-quote`**, `variant: quote` |
| 4 | `oneColumn` | `haftPage` | same blockquote, narrower, no margin | **`wrs-pull-quote`**, `variant: halfPage` |
| 5 | `twoColumn` | n/a | 2-up text row | `columns`, 2 text cells |
| 6 | `threeColumn` | n/a | 3-up text row | `columns`, 3 text cells |
| 7 | `oneColumnOneImage` | n/a | image + text, 2-up | `columns`, image cell + text cell |
| 8 | `twoColumnTwoImage` | n/a | 2-up, each image+text stacked | `columns`, 2 cells each holding an image and a paragraph |

### Why 5–8 are `columns` with no new code, checked against the deployed CSS, not assumed

Same shape of finding as `columncontrol`: `styles/deployed-bundle-extract.css` carries **no
grid/width rules at all** for the two/three-column rows — Bootstrap's `.row`/`.col-sm-12
.col-md-{6,4}` classes come from the site's global grid, not this component's own stylesheet, and
the only component-owned rules touching them are typography/spacing (`margin-bottom`, list
`font-size`) already handled by `blocks/columns/`'s and the boilerplate's own defaults.
`blocks/columns/columns.js` derives its column count from the number of authored cells
(`columns-${n}-cols`), not from a dropdown, so a 2- or 3-cell `columns` block is a direct
equivalent of `twoColumn`/`threeColumn` with no field to model.

Rows 7–8 (image + text) are not a harder case than plain columns, and this is the pleasant
surprise of this component: `blocks/columns/columns.js` already special-cases a column whose only
content is a `<picture>` — `columns-img-col`, `order: 0` — putting the image first and the rest of
that column's content (`order: 1`) after it, in normal document flow. That is *exactly* the
`one-column-text-image`/`two-column-text-image` shape (`<img>` then text, in the same column), for
free, because `columns`' own filter (`text`, `image`, `button`, `title`) already lets a single cell
hold both an image and a paragraph as separate default-content blocks. No new field, no new CSS.

The two things ported from the deployed extract for these rows are margin-only and go in
`styles.css`'s existing `.columns` conventions, not a new file — but were **not** added here,
because they are 1.25rem top/bottom margins on `.one-column-text-image`/`.two-column-text-image`
specifically, a component-scoped selector `columns` does not carry, and adding them would mean
editing the shared `blocks/columns/**`, which this run's scope and the `columncontrol` precedent
both rule out doing unilaterally for one component's spacing preference. Flagged, not built.

### `disclaimer`: checked, and the evidence says "no distinguishing style", not "unknown"

`COMPONENT.md`'s own header lists `column-disclaimer` under "NOT EXTRACTED — too broad, 820 rules,
shared/inherited" in the deployed bundle. The one piece of evidence available in this checkout —
`styles/md-richtext.less`, confirmed stale elsewhere in this run but still evidence — puts
`.column-disclaimer` in the *same* selector group as `.one-column-only-text` (the `default`
branch's own class), sharing identical declarations (`font-family`, `color`, `font-size: 20px`,
`line-height: 26px`). That is direct evidence the two showTypes rendered identically at the point
that checkout was taken, not merely an absence of evidence. Treated as default content, same as
`default` — but flagged, because the LESS is stale and a live-site check before go-live is cheap
and worth doing: if `disclaimer` has since grown real fine-print styling on the live site that
never made it into either source in this bundle, that is a small, additive CSS class to add later,
not a reason to build a block now on no evidence.

### `inlineQuote`/`haftPage`: the one place a block is genuinely warranted

Unlike `disclaimer`, these have real, confirmed CSS in the ground-truth extract
(`.blockquote blockquote`, `.blockquote.haftpage`, plus a WRS-brand-specific colour/weight
override) — a distinct visual treatment `columns`/default content cannot produce: quote-mark
wrapping, a styled `<blockquote>`, and (for `haftPage`) a narrowed, margin-collapsed variant of the
same element. That is exactly the shape of thing `columncontrol` and `image`'s entries say *is*
worth a small dedicated block, as opposed to duplicating something EDS already does for free.

Built as `blocks/wrs-pull-quote/` (id `wrspullquote`, **not** `wrsquote` — that id is already taken
by `wrs-quote-carousel`'s child model). Two fields only: `text` (richtext) and `variant` (select,
`quote`/`halfPage`, default `quote`) — a direct, minimal port of the two fields the source actually
varies (`oneColumnText`, `showTypes`, restricted to its two styled values). `default` and
`disclaimer` are deliberately not options on this block's `variant` select: offering them here
would give authors two different ways to produce the same "plain paragraph" output (this block with
`variant` unset in spirit, or plain default content), which is exactly the kind of redundant,
easily-desynced authoring surface the ground rule warns against. The model field's own description
tells authors as much.

The curly quote marks (`&ldquo; ... &rdquo;`) are rendered as literal text nodes wrapping the
content in `decorate()`, matching the source's own literal HTL markup, not a CSS `::before`/`::after`
pair — ported as the source does it, even though wrapping already-block-level richtext HTML in
inline quote characters like this is an odd thing for the source itself to do.

`gridSmall` ("Using in accordion") is not ported anywhere. It narrows the *whole component's*
outer wrapper for use inside an accordion tab panel, and `blocks/wrs-accordion-tabs/` already
constrains its own panel width independently of anything nested inside it — so a pull quote (or
any other content) placed inside a tab panel is already width-constrained by its container. Flagged
for re-check once a pull quote is actually authored inside a live accordion tab, not built as a
speculative second width toggle.

### The naming trap in the brief, checked directly against the dialog XML — does not fire, but only by luck of exact wording

`oneColumnText` looks, by the collapsing-suffix rule (`<base>` + `Text`/`Title`/`Type`/`Alt`/
`MimeType`), like it should merge into a field named `oneColumn`. Walking the dialog XML as a tree
(not grepping `name=` attributes) shows there is **no field literally named `oneColumn`** anywhere
in this dialog — `oneColumn` only exists as (a) one `<items>` *value* of the `richtextOptions`
select, and (b) the `id` of a `cq-dialog-dropdown-showhide` container `<div>` that has no `name`
attribute and stores nothing. The collapsing rule's own precondition — "only if the base field
exists" — is not met, so `oneColumnText` correctly stays its own field. This is a real trap for any
mechanical converter that derives fields by scanning for `name="..."`/`value="..."` strings across
the whole file rather than walking the tree and checking `sling:resourceType`, because the string
`oneColumn` genuinely appears three times in this dialog for three unrelated reasons (a select
value, a container id, and the real field name's own prefix) and only the tree walk tells them
apart — exactly the caution the skill gives for reading dialogs as trees, confirmed concretely here.

`oneColumnOneImageText`, by contrast, collapses onto `oneColumnOneImage` correctly *and*
desirably: `oneColumnOneImage` is a real pathbrowser field (`name="./oneColumnOneImage"`), and the
pairing is exactly the semantic pairing an author would expect (the image and the text that goes
with it in that one layout). Not that it matters for this component's actual model — no built block
here groups these two fields; `oneColumnOneImage`'s image and text are two separate `columns` cells,
not one grouped cell — but it is worth recording as the one case in this dialog where the mechanical
rule and human intent for once agree, unlike `oneColumnText`'s near-miss above.

### The custom RTE style vocabulary — the component where it matters most, given a real answer here

Nine of this component's fifteen fields are exactly the same shared RTE config,
`/apps/wrs/widgets/richtext/text` (`aem-widgets/richtext/.content.xml`), cross-referenced from
several earlier entries in this document (`mandaiexperiencecarouselfeature`,
`mandaisocialcontentgrid`) as lacking a Universal Editor equivalent. This component is where that
gap has the most surface area — its entire authored content, in every layout, is this RTE — so it
gets the full answer here instead of another cross-reference.

**The gap, stated precisely.** AEM Classic's RTE `styles` plugin gives authors a "Styles" toolbar
pulldown (`styles:getStyles:styles-pulldown` in the widget config above) that wraps a text
selection in `<span class="cssName">`, from a fixed, author-facing list of named choices. This
project's target model (`component-models.json`'s `richtext` field component) has no equivalent
config surface — the field is a plain rich text editor with the Universal Editor's own fixed
toolbar (bold/italic/underline, links, lists, headings, sub/superscript), and there is nowhere in
the xwalk model schema used by this repo to declare a restricted, named style list for it. This is
a platform gap, not something this component's migration can code around.

**What the eight declared styles actually are, checked against both available sources, not
assumed to all be equivalent:**

| `cssName` | Evidence in this bundle | What it is |
|---|---|---|
| `text-green` | `md-richtext.less`: `font-size: 26px` (20px ≤tablet), bold serif, dark green, `!important` | confirmed — a large accent-heading emphasis style |
| `small-note` | `md-richtext.less`: `font-size: 12px; line-height: 16px` | confirmed — fine-print/footnote sizing |
| `cta-touring-button` | `cssName="fa fa-map-marker"` | not a text style at all — a Font Awesome icon glyph class, misusing the styles pulldown to inject an icon |
| `fa-train` | `cssName="fa fa-train"` | same — another FA icon glyph, not text styling |
| `red-hightlight` | none in either LESS or the deployed extract | unverifiable — name implies a colour treatment, no confirmed values anywhere in this bundle |
| `desc-font-20` / `desc-font-22` / `desc-font-24` | none in either source | unverifiable — presumably `font-size: 20/22/24px`, no confirmed values |

Two further, compounding findings: (1) this target repo does not ship Font Awesome (confirmed
already in the `wrs-accordion-tabs`/`wrs-admission-types` entries, which both replace FA glyphs
with Unicode characters) — so `cta-touring-button`/`fa-train` cannot render as intended in this
target *regardless* of the RTE-config gap; and (2) of the six genuine text styles, only two
(`text-green`, `small-note`) have any confirmed CSS anywhere available to this migration, from a
LESS checkout already established elsewhere in this run to be stale.

**What happens to content authored with these styles, stated plainly:**

- **Going forward, authors cannot apply any of these eight styles through the Universal Editor.**
  There is no styles pulldown; the richtext toolbar this repo's `richtext` field exposes is fixed
  and does not include a mechanism for a project-defined class list. This is true everywhere this
  RTE config is used, not only here — restated here because this component has nine fields' worth
  of surface area for it, the most of any component in this run.
- **For content carried over from the old site, the literal markup (e.g. `<span
  class="text-green">…</span>`) can in principle survive a raw-HTML paste into the new richtext
  field**, since the field ultimately stores/renders HTML — but this is not guaranteed: most rich
  text field implementations sanitise pasted HTML to a safe subset and may strip class attributes
  not on an allow-list, and this repo's target model does not define or test for one. Whether the
  Universal Editor's richtext field actually preserves an arbitrary `class` attribute on save needs
  to be verified against the real editor, not assumed either way, before anyone relies on it during
  content migration.
- **Even if the class survives migration, only `text-green` and `small-note` have anywhere to land
  visually** — this repo's `styles.css` does not define either class today. Porting them (two small,
  global, standalone typography rules with no other component dependency — unlike `image`'s
  rejected per-component routes, these do not collide with anything) would be a cheap, additive fix
  *if* a human confirms they are still wanted, but is a change to shared `styles.css` typography
  used everywhere the `richtext` field appears, not scoped to one block's `blocks/<folder>/**` —
  out of this run's authorised scope for a single component, same reasoning `backgroundsection`'s
  entry gives for why its analogous shared-infrastructure fix was flagged rather than built.
- **Practical migration guidance:** for every existing `richtext` instance, whoever migrates the
  content should check its stored HTML for these eight class names before pasting it into the new
  field. `red-hightlight`/`desc-font-*`/the two FA-icon styles have no confirmed target treatment at
  all and should be treated as lost — strip them or flag the specific page for a human style
  decision. `text-green`/`small-note` are the only two worth attempting to preserve, and only once
  (a) the two classes exist in this repo's `styles.css` and (b) the Universal Editor is confirmed to
  keep the `class` attribute through a save round-trip.

### The content-migration consequence of the `columns` mapping, stated concretely

There is no automatic converter in this run from an AEM `richtext` instance's flat properties
(`twoColumnFirstText`, `twoColumnSecondText`, …) into a `columns` block's per-cell structure — this
was true for `columncontrol` too, and is restated here because `richtext` is likely the more common
of the two components in live content. For every existing page using `richtext` in a multi-column
or image+text layout, migrating it means a human:

1. Opens the page in the Universal Editor and inserts a `columns` block with the right cell count
   (2 for `twoColumn`/`oneColumnOneImage`/`twoColumnTwoImage`, 3 for `threeColumn`).
2. Copies each source field's rendered content into the correct cell, **in the dialog's own field
   order** — `twoColumnFirstText` → first cell, `twoColumnSecondText` → second cell, and so on —
   since that order is the only thing that determines left-to-right position once the content is
   flat `columns` cells with no field names attached.
3. For the two image layouts, places the image as its own default-content block at the top of the
   relevant cell (ahead of the paragraph text) so `columns.js`'s existing `columns-img-col`
   ordering picks it up automatically — no new field or setting to configure, but the image has to
   be the *only* other content in that slot of the cell for the ordering rule to recognise it as an
   image column.
4. For `inlineQuote`/`haftPage` content, inserts a `wrs-pull-quote` block instead and picks the
   matching `variant`.

None of this is scriptable from the AEM repository's stored properties alone without a bespoke
one-off migration tool (out of scope for this component pass); it is page-by-page manual
re-authoring work, and should be budgeted as such rather than assumed to be a mechanical property
copy.

### Files touched

- `blocks/wrs-pull-quote/_wrs-pull-quote.json` — new; single leaf model `wrspullquote` (2 fields:
  `text` richtext, `variant` select `quote`/`halfPage`), no container/filter (no multifield in this
  component at all).
- `blocks/wrs-pull-quote/wrs-pull-quote.js` — new; `decorate()` reading the 2 cells positionally,
  joining a positionally-read richtext cell's children into HTML (`joinRichText()`, the same
  technique `wrs-feature-carousel`/`wrs-conservation-banner` use), wrapping it in literal curly
  quote text nodes, no seams (no server-side logic anywhere in this component to flag).
- `blocks/wrs-pull-quote/wrs-pull-quote.css` — new; ports `styles/deployed-bundle-extract.css`'s
  `.blockquote`/`.blockquote.haftpage` rules plus the WRS-brand colour override, applied directly
  since this repo only migrates WRS content.
- `models/_section.json` — appended `"wrspullquote"` to the `section` filter's `components` array.
- `tests/blocks.test.mjs` — added 7 cases: normal quote render with curly-quote wrapping, a
  multi-paragraph quote keeping each paragraph's own markup, the `halfPage` modifier class, a blank
  variant cell defaulting to `quote`, instrumentation moving onto the rendered element, and the
  unconfigured-outside-editor / unconfigured-in-editor-placeholder pair.
- `blocks/columns/**` was **not** touched, as required — rows 5–8 of the matrix above reuse it with
  no code changes; the minor spacing gap noted above was flagged, not built, for the same
  shared-infrastructure reason `columncontrol`'s entry gives.
- `npm run build:json`, `npm run lint` and `npm test` all pass (192/192 tests).

## section

**Source:** `wrs-components-export/section/` — `wrs/components/article/section`.

**Decision: no block was built. No code was changed.** Same outcome as `## aside` above.

### Why

Identical in kind to `aside` — the whole HTL is a `<section>` wrapping
`foundation/components/parsys`, with no model logic, no styles and no JS:

```html
<section class="${properties.classTag}" id="${properties.anchorLink}"
         aria-label="${properties.ariaLabel}" aria-labelledby="${properties.ariaLabelledBy}">
  <sly data-sly-resource="${'section' @ resourceType='foundation/components/parsys'}"></sly>
</section>
```

The `decorateSections()` analysis in the `## aside` entry applies unchanged and is not repeated
here: a `style` metadata key becomes CSS classes, every other key becomes a `data-*` attribute,
there is no `id` special case, and the wrapper is unconditionally `div.section`.

`classTag` and `anchorLink` carry over from `aside` with the same two open questions.

### The one thing `aside` did not have: `ariaLabel` and `ariaLabelledBy`

This is the genuinely new finding, and it is worse than it first looks.

Section metadata turns every non-`style` key into a `data-*` attribute. So an authored
`ariaLabel` becomes `data-aria-label="..."` on the section div — **which does nothing at all for
a screen reader.** It is not a wrong value; it is an inert attribute with a similar name. Nothing
errors, nothing looks different, and the accessible name is silently gone.

It compounds with the tag finding from `aside`. In the source this is a real `<section>` with an
accessible name, which is what makes it a **landmark** that screen-reader users can navigate
between. In EDS it is a `<div class="section">` with an inert `data-aria-label`: not a landmark,
and not named. Both halves of the semantics are lost, not one.

**What it would take to fix:** a generic handler in `decorateSections()` mapping known ARIA keys
to real attributes (`if (key === 'ariaLabel') section.setAttribute('aria-label', value)`), which
is the same shape of shared-infrastructure change as the `id` handler flagged under `## aside` —
and ideally the same change, since a landmark with `aria-labelledby` needs a real `id` on the
element it points at. Doing it properly probably also means the conditional-tag change, so that
named sections render as `<section>`. That is three related changes to shared section decoration,
which is why it is flagged as one piece of work rather than bolted onto this component.

### What a human needs to decide

- **Whether these sections are actually named in live content.** If `ariaLabel`/`ariaLabelledBy`
  were filled in on real pages, this is an accessibility regression that ships silently, and the
  `decorateSections()` work above should be scheduled before migration rather than after. If they
  were left blank in practice, there is nothing to lose and the fields can be dropped.
- The `classTag` and `anchorLink` questions already recorded under `## aside`.

**Recommendation:** same as `aside` — drop the wrapper and author the children into a plain EDS
section — **unless** the accessibility survey above finds real authored ARIA values, in which case
the shared section work is a prerequisite, not a follow-up.

### Files touched

None.

## sectiontitle

**Source:** `wrs-components-export/sectiontitle/` — `wrs/components/commons/sectiontitle`.

**Decision: built `blocks/wrs-section-title/`** (leaf block, id `wrssectiontitle`).

### Why a block rather than default content

A heading with an optional link is close to default content, and the boilerplate already has a
`title` model — so this was weighed, not assumed.

What decided it: the source carries four presentation fields alongside the text — `style` (which
of h1–h6), `align`, `bottomPadding`, and `anchorLink`. Default content gives the heading level
for free (the author writes the heading), but has nowhere to put alignment, bottom padding or an
anchor id.

Pushing those to section metadata was rejected on the same granularity grounds the `## image`
entry used, one level down: they are properties of *this title*, not of the section it sits in,
and a section can hold other content alongside the title. Extending the shared `title` model was
rejected for the same reason it was under `## image` — it is site-wide infrastructure affecting
every heading on every page, and this is one component's migration.

### Cell model — 6 fields into 4 cells

- `title`
- `opt_style` + `opt_anchorLink` — the same pairing `wrs-accordion-tabs` uses for the identical
  fields, disambiguated by keyword (a value matching the fixed h1–h6 set is the style; anything
  else is the free-text anchor)
- `display_align` + `display_bottomPadding` — two more fixed, non-overlapping vocabularies. Unlike
  the two same-domain booleans that forced `wrs-accordion-tabs` to spend a cell each, none of
  these four values can be mistaken for another
- `link`

### Confirmed behaviour difference — `getProperURL` is not fully ported

`SectionTitleModel` is plain injected strings plus one call, `CommonUtils.getProperURL(link,
resourceResolver)`. Reading `CommonUtils.java` directly shows it does two things:

1. resolves `link` as a page and, if that page's `cq:template` is the WRS redirect-page template,
   substitutes its `redirectTarget` property instead
2. appends `.html` to `/content` paths

Part 2 is a pure formatting rule and is ported, via the same `resolveHref()` helper every other
block's internal link uses. **Part 1 is not ported** — it is a live read of a *different* page's
template and `redirectTarget` at request time, which is the "reads other pages" case that needs a
bridge rather than an invented client-side substitute.

**Consequence:** an authored `link` pointing at a WRS redirect page will link to the redirect page
itself here, where the source silently followed it to its target. Blast radius is small (it only
matters for links into redirect pages) but it is a real, confirmed difference, not a theoretical
one.

### Styles

`.section-title` is one of the site-wide shared classes the bundle extract deliberately does not
attribute to any one component — it appears in hundreds of rules, most of them *other* components
scoping it (`.main-footer .section-title`, `.md-feature-carousel .section-title`, …). Only
genuinely unscoped base rules were taken. This is the trap component 1 hit, and the reason the
rendered appearance of this component in AEM is context-dependent in a way the EDS block
deliberately is not.

### What a human needs to decide

- Whether links into redirect pages are used with this component, and if so whether the
  redirect-following behaviour needs restoring (which makes this a bridge case).
- Whether the block's fixed base styling is acceptable given that the source's appearance varied
  with whatever ancestor component happened to scope `.section-title`.

### Files touched

- `blocks/wrs-section-title/` — `_wrs-section-title.json`, `.js`, `.css` (new)
- `models/_section.json` — appended `wrssectiontitle`
- `tests/blocks.test.mjs` — cases for the heading level, align, both padding modifiers, the
  linked and unlinked forms, instrumentation, and the unconfigured/editor placeholder

## topparkadvisory

**Source:** `wrs-components-export/topparkadvisory/` — `wrs/components/commons/topparkadvisory`
(`sling:resourceSuperType="wcm/foundation/components/parsys"`). 4 top-level dialog fields
(`icon` pathbrowser, `pageToOpen` pathbrowser, `parkTag` Granite tagfield, `hideTopParkAdvisory`
checkbox). This is component 19 of 19, and the one the run's survey flagged as most blocked.

**Decision: built nothing.** No block folder, no model partial, no `models/_section.json` entry.
Read `featuredlistingv2` and `mandaicffourcollisting` first, per the task — this component reuses
their servlet-vs-GraphQL rule but lands on a different branch, and the reasons below explain why
even a shell (which both of those got) is not the right call here.

### Confirming the survey against the source

`TopParkAdvisoryModel.init()` (`@PostConstruct`) does, in order: `getSlingScriptHelper()
.getService(ServiceUtils.class)` to obtain a `ResourceResolver` (an **OSGi service call**,
distinct from the resolver Sling would normally inject — this class deliberately gets its own),
`resourceResolver.adaptTo(Session.class)` then `session.logout()` in `finally` (a **raw JCR
session**, opened and closed by hand), `HierarchyNodeInheritanceValueMap` for `icon`,
`pageToOpen`, and `parkTag` (the same ancestor-cascade mechanism `footer` and `header` found —
none of the three dialog values this component reads are necessarily authored on the instance the
author is editing), and then, if not hidden, `retrieveAnnouncements()`:
`NodeUtils.getListNode(session, getAnnouncementsPath())` returns a raw `NodeIterator`, walked node
by node, filtered to `dam:Asset`, then to nodes whose `jcr:content/data` resource passes
`WRSUtils.isTargetContentFragment(..., CONTENT_FRAGMENT_MODEL_TOP_PARK_ADVISORY)`, then adapted to
`ContentFragment`, then filtered again to `category == "topParkAdvisory"`, then filtered a third
time to `tags.contains(parkTag)` **and** a publish/unpublish date window checked against
`Calendar.getInstance()` — "today" — before a `NotificationBean` is added to the render list.
`getAnnouncementsPath()` itself branches on `currentPage.getLanguage()` (en/zh/ja/ko), each a
different hardcoded CF folder path constant. `getOfLabel()` calls `I18nUtils.getLabel(…,
getCurrentPage(), null)`, server-side resource-bundle i18n. All of this matches the survey; nothing
in it changed on inspection. The HTL renders `notification`, `important`, `interval`,
`notificationCount`, `ofLabel` — every one of those five values is repository/service-derived, and
none of the HTL's rendered content maps to any of the four dialog fields directly (the dialog
fields are inputs to the lookup, not the output).

### Servlet vs GraphQL — working the rule, and why it differs from the other two CF components

1. **Does the block need anything that lives on the page rather than the fragment?** Yes — and in
   two independent ways, which is new relative to `featuredlistingv2`/`mandaicffourcollisting`
   (both landed "no" here). First, `icon`/`pageToOpen`/`parkTag` are read via
   `HierarchyNodeInheritanceValueMap`, so the *effective* values for a given page depend on where
   in the tree that page sits, not on what (if anything) is authored on the instance itself —
   exactly the mechanism `header`'s entry generalised beyond `footer`. Second,
   `getAnnouncementsPath()` branches on `currentPage.getLanguage()`, so the folder being listed is
   itself a page property, not a fragment property. Branch 1 matches, decisively.
2. **Does it need filtering, sorting or pagination over many fragments?** Yes, and this is the
   point the task asked to work through explicitly. Unlike `featuredlistingv2`'s
   `listItems`(author-curated array of specific fragment paths) and `mandaicffourcollisting`'s
   `cfPath`-per-row (confirmed, by reading the model, to be individual CF picks despite the
   dialog's misleading "folder" label), `topparkadvisory` performs a genuine **listing** operation:
   `NodeUtils.getListNode(session, path)` returns every child of an announcements folder, and the
   model applies three successive filters (CF-model check, category, tag) plus a date-window test
   over the *entire* result set. There is no authored list of specific fragment paths anywhere in
   this dialog — `parkTag` is the only per-instance input, and it selects a subset of an
   author-independent folder's contents. **This is squarely branch 2** — the branch the other two
   sibling components explicitly did not land on. Under the rule as applied consistently across
   all three components, branch 2 is where a GraphQL persisted query is the natural fit: "list
   Content Fragments of model X, filtered by tag, ordered/limited" is exactly the shape a
   persisted `...List` query is designed for, and AEM as a Cloud Service's GraphQL endpoint
   supports `_tags` filtering and date-range filtering with no bespoke server code — arguably a
   *better* fit here than the servlet route the other two components leaned toward, since there is
   no bespoke derived-string logic like `getCompressedResizedImageURL` in this model (the fields
   rendered — `notification`, `important`, `interval` — are used as-is, no resize/compress/format
   step). That said, the recommendation below is not simply "use GraphQL" — see the cache-key
   finding, which cuts across both options.

### The cache-key finding — stated plainly, since the task asked for it directly

Whichever of servlet or GraphQL is chosen, the endpoint would in EDS practice be reached through a
**path- or query-string-cached** fetch (a CDN-fronted persisted query, or a path-cached servlet
response) — that is the whole point of moving data access out of per-request AEM rendering. That
model assumes the correct response is a pure function of the request URL. It is not, here, on two
independent axes:

- **`parkTag` varies by page**, because it is inherited from wherever in the tree it was last set,
  not authored per-instance in the ordinary EDS sense. Two pages that both embed this component
  can legitimately need different filtered announcement sets. If the cache key is the endpoint
  path alone (or a persisted-query id with no variables), the *first* visitor's page determines
  what every subsequent visitor to *every* page sees, regardless of which page they are actually
  on — a correctness bug, not a staleness nuance. This is fixable in principle by making the
  resolved `parkTag` (and locale, which drives the folder path) explicit query parameters /
  persisted-query variables, so the cache key becomes `(tag, locale)` rather than just the
  endpoint — that part of the problem has a real fix.
- **The date window does not.** `today.compareTo(publishDate) > 0 && today.compareTo(unpublishDate)
  < 0` means the correct answer for a *fixed* `(tag, locale)` pair changes at the moment an
  announcement's publish or unpublish timestamp is crossed, with no page-path or query-string
  signal that changes alongside it. A long-lived CDN cache entry keyed by `(tag, locale)` will keep
  serving an announcement past its unpublish time, or withhold one past its publish time, for as
  long as the cache entry lives — the classic case a path/query-keyed cache cannot represent at
  all, because "now" is not part of the key. The only real fixes are a short TTL / no-cache on this
  specific endpoint (defeating much of the reason to front it with a CDN in the first place for a
  component whose entire job is a time-sensitive banner) or resolving it client-side per page load
  (the browser's own request, evaluated at request time, not cached at the edge).

So: **the cache key can be made correct for `parkTag`/locale, but not for the date window** — and
because this component's whole purpose is "should this be showing right now," the date-window
half is not a side issue, it is close to the entire point of the component. That is a materially
worse fit for a cached endpoint than either sibling CF component, neither of which had a
time-window filter at all. This is also why the "lean servlet" recommendation from the two prior
components does not simply transfer here even though branch 2 might otherwise suggest GraphQL: the
caching problem is orthogonal to servlet-vs-GraphQL and defeats the caching benefit of *either*
choice for this specific field. A human deciding this needs to weigh short-TTL/no-cache serving
(server- or edge-side) against a client-side fetch made by the visitor's own browser at page-load
time — not decide servlet-vs-GraphQL as if that were the whole question.

### The tagfield — what would replace it, and whether it depends on the servlet decision

Granite's `cq/gui/components/coral/common/form/tagfield` has no Universal Editor equivalent — it
picks against AEM's `/content/cq:tags` taxonomy, a repository-resident, hierarchical, open-ended
vocabulary, and UE has no comparable picker. But look at how the model actually consumes it before
reaching for a replacement: `private String parkTag` is declared and read as a **single `String`**,
not an array, and the comparison is `parkTags.contains(parkTag)` — a plain string-membership test
against the CF's own `tags` array. Whatever multi-select capability the tagfield widget offers in
the Granite dialog, this component's own logic only ever uses **one** tag value. That is a finding
worth keeping: the dialog is more capable than the code that reads it, same shape of "widget offers
more than the model uses" gap `parkTag`'s neighbours don't have, but real.

Given that, the replacement is a single string field, and the choice is between a `select` (a fixed,
enumerated list of known park-tag values — `zoo`, `river-safari`, `night-safari`, `bird-park`,
`rainforest-wild`, `wrs`, going by the CSS class vocabulary the deployed stylesheet actually
carries: `.zoo-style`, `.mrr-style`, `.bird-park-style`, `.night-safari-style`,
`.river-safari-style`, `.wrs-style`) or free `text` (if the tag vocabulary is open-ended or
maintained outside this bundle — the CF tag taxonomy itself is not in the export). **This does not
depend on the servlet-vs-GraphQL choice** — either endpoint shape receives the same single tag
string as a parameter either way; the field type in the block's own model is orthogonal to how the
value is transported. It does depend on confirming the actual `/content/cq:tags` vocabulary against
`Mandai-AEM`, which this bundle does not contain (COMPONENT.md's "Not copied" list stops at direct
dependencies) — the CSS class names above are suggestive evidence, not confirmation.

### The header dependency — ordering consequence, stated for the human deciding this run

`header`'s own entry (component 8) already found the embed and flagged it without re-solving it:
`header.html` line 14 unconditionally embeds this component
(`data-sly-resource="${'topparkadvisory' @ resourceType='wrs/components/commons/topparkadvisory'}"`)
— the only wrs→wrs cross-component reference in the export. That embed is unconditional (no
`data-sly-test` gating it out), so in the source, every page rendering `header` also renders this
component's markup shell (visibility then governed by `hideTopParkAdvisory`, the inheritance
cascade, and `show-notice.js`/`display:none` at runtime).

The ordering consequence: `header`'s own migration was explicitly scoped to one panel
(`wrs-visit-our-parks`) and left navigation, login/cart, and this embed flagged rather than built.
Nothing in this component's analysis removes that block — if anything it adds detail confirming
why: this component depends on an OSGi service, a raw JCR session, `NodeIterator` traversal, and a
date-sensitive, non-cacheable-by-path listing query — a strictly harder set of blockers than
anything `header` itself carries directly. **`header` cannot be considered fully resolved — its
architecture decision closed — until a human decides what replaces this embed**: drop the advisory
bar from the EDS header entirely (a scope decision), build the client-side/no-cache fetch this
entry's cache-key finding argues for and wire it into wherever `header`'s eventual markup lives, or
leave both `header`'s remaining panels and this component served from AEM behind a reverse-proxy
boundary. Any of those is legitimate; none of them is this migration pass's call to make
unilaterally, and none of them can be decided by working on `topparkadvisory` in isolation from
`header`'s own open decisions (login/cart, nav) — they are the same class of question (per-visitor
or per-page-tree state that EDS's per-page, cache-fronted model does not represent) and are worth
resolving together, exactly as `header`'s own entry already said for the inheritance cascade.

### Why building a shell here would be worse than building nothing

`featuredlistingv2` and `mandaicffourcollisting` both got shells because their dialogs are
genuinely content-shaped: an author picks specific fragment paths, and a "Content Fragment not
resolved" placeholder per authored row is an honest, useful stand-in for real content once the
architecture decision is made. None of that carries over here:

- **None of the four dialog fields are the rendered content.** `icon`, `pageToOpen`, `parkTag`,
  `hideTopParkAdvisory` are all *inputs to a lookup* — configuration, not copy. A shell block's
  `decorate()` would have nothing authored to echo back as an "unresolved" placeholder per field
  the way `wrs-featured-listing` echoes back each picked path; it would render one static "not yet
  implemented" message regardless of what the author fills in, which is exactly what building
  nothing already communicates, with no added value from having a block folder to maintain.
- **The dialog's own field semantics don't survive the move to EDS's per-instance model.** In the
  source, `icon`/`pageToOpen`/`parkTag` are read through ancestor inheritance — an author two pages
  down the tree from where these were last set sees them without setting anything. EDS block models
  are per-instance; there is no equivalent mechanism. Building the four fields as ordinary UE
  fields would silently misrepresent how this component actually worked — it would look like a
  normal per-instance config panel and behave like nothing of the sort, which is a worse trap than
  an honest "not built."
- **The CSS itself confirms this is park-context chrome, not standalone content.** Every rule past
  the base `.top-park-advisory` selector in `deployed-bundle-extract.css` is scoped under a park
  identity class on an ancestor (`.zoo-style .md.top-park-advisory …`, `.bird-park-style …`, six of
  them, repeated for `.icon-info`, `.icon-close`, `.slider-wrapper`) — this component's appearance
  is itself inherited from page context, the same pattern its data access has.
- **Two of the three JS behaviours this component depends on are missing from the bundle, not one.**
  `show-notice.js` (open/close, the `data-show-notice`/`data-close-notice` wiring) and `landing.js`
  (the `data-slider-thumbnails` carousel config on `.slider-wrapper`) are both referenced in the
  HTL and both absent — only `simple-carousel.js` is present, and nothing in the HTL's own
  `data-load-plugins` lists references it directly for this component, so its relevance here is
  unconfirmed. A shell cannot demonstrate even the interaction chrome (open/close, sliding between
  notices) without inventing behaviour this bundle does not evidence, on top of having no data.

Given all of that, a `wrs-park-advisory` block in the palette would be selectable, would build,
lint, and pass tests — and would do zero of the real job while implying, by existing at all, that
part of the work is done. That is a worse outcome than the honest gap left by building nothing:
this write-up plus the "not built" line in the closing table is the more accurate signal for the
next person to act on.

### What a human needs to decide

- **Whether this banner is in scope for the EDS migration at all**, given that its entire purpose —
  a time-sensitive, per-visitor-irrelevant but per-page-tree-variable notice — has no clean fit in
  EDS's cache-fronted, per-page-instance model. This is the most upstream question; the rest are
  moot if the answer is "leave it in AEM behind a proxy" or "drop it."
- **If it proceeds: servlet or GraphQL**, informed by the branch-2 finding above (GraphQL's native
  tag/date filtering is a closer fit than either sibling CF component had), but decided together
  with the cache-key finding, not independently of it — the date window defeats path/query caching
  regardless of which is chosen, so this is really a caching-strategy decision first and a
  servlet-vs-GraphQL decision second.
- **How to serve the date-window filter**: short-TTL/no-cache at the edge, or a client-side fetch
  made at page-load time bypassing EDS's page cache entirely (the same shape `header`'s entry
  proposed for per-visitor CIAM/cart state, though this is a per-page-tree, not per-visitor,
  variability — a different reason, same architectural shape of fix).
- **The `parkTag` vocabulary** — confirm against `/content/cq:tags` in `Mandai-AEM` before building
  a `select`; the CSS class names above (`zoo`, `mrr`, `bird-park`, `night-safari`,
  `river-safari`, `wrs`) are suggestive, not confirmed.
- **The `header` embed** — resolve together with `header`'s own remaining open decisions (login/
  cart, navigation), not in isolation; `header` cannot be marked fully resolved until this is
  decided.
- **`show-notice.js`/`landing.js`** — both missing from the export; source them from
  `Mandai-EMP-Frontend` and read them before attempting any interaction-layer build, even after the
  data question is resolved.

### Files touched

None. No block folder, no `models/_section.json` change, no test cases — building any of those
would have required inventing content this bundle does not evidence (see above). `npm run
build:json`, `npm run lint` and `npm test` were run to confirm the repo's existing state (all other
18 components) is undisturbed by this component's non-build; results below.

---

# Cross-cutting findings

Things that emerged across the run and belong to no single component. Written at the end of the
19-component pass.

## 1. The ancestor-page inheritance cascade has no EDS equivalent

Found in `footer`, then `header`, then `topparkadvisory`, and it is the single largest
content-migration consequence of this run.

WRS site chrome is authored **once on an ancestor page** and inherited down the tree via
`HierarchyNodeInheritanceValueMap` / `getAbsoluteParent(...).getChild(...)`. In `header` it governs
nearly every field; in `footer` the conservation banner and the address/opening-hours panels; in
`topparkadvisory` it decides which announcements a given page even sees.

EDS has no cascade. Every page needs its content placed explicitly, or a shared fragment authored
and referenced. **This is not a per-component fix** — it is a decision about how WRS site chrome
is authored at all after migration, and it should be made before content migration starts rather
than discovered during it.

## 2. Shared section infrastructure needs one piece of work, not three

Three components independently hit the same gap in `decorateSections()`:

- `aside` — an authored `anchorLink` cannot become a real DOM `id` (non-`style` metadata keys
  become `data-*`)
- `section` — an authored `ariaLabel` becomes an inert `data-aria-label`, so the section is
  neither named nor a landmark
- `aside` / `section` — the wrapper is unconditionally `div.section`, so the semantic tag is lost

These are one change, not three: a named landmark needs a real tag, a real accessible name, and a
real `id` for `aria-labelledby` to point at. Scheduling them separately would mean touching shared
section decoration three times.

**Accessibility note:** the loss is silent. Nothing errors and nothing looks different — the page
simply stops exposing landmarks to screen readers. If live content fills these fields, this is a
regression that ships quietly.

## 3. Assets and fonts the target repo does not have

Hit independently by `wrs-accordion-tabs`, `wrs-admission-types` and others:

- **Font Awesome** is not in this repo. Every `fa-*` glyph in WRS markup was substituted with a
  Unicode character carrying the same size/colour/position treatment. Two source RTE styles
  (`cta-touring-button`, `fa-train`) are Font Awesome icon hacks and cannot render here at all.
- **WRS brand fonts** are not here either. `--primary-font-bold` and `Poppins-Regular` fall back to
  Arial. Colour values that matched no `--rb-*` token were kept literal and namespaced `--wrs-*`
  rather than forced onto the Ranger Buddies palette.

Each substitution is documented in its own block's CSS docblock. Collectively they mean **no
migrated block is pixel-accurate to the source yet**, and that is a design decision to confirm, not
a defect to file.

## 4. Grouped cells and freeform siblings — a real limit, and a refinement worth taking

AEM omits a blank field from a grouped cell rather than emitting a placeholder. So when a grouped
cell holds **more than two freeform values with no distinguishing vocabulary**, positional reading
misattributes them if an author leaves an earlier one blank. Surfaced most sharply by
`wrs-experience-carousel`'s eight colours. `key-value: true` is the real escape hatch; it was not
applied because it restructures a block's whole markup.

Where values *do* have distinct vocabularies (a mask keyword, a heading tag, an alignment), grouping
is safe and is used throughout.

**Refinement found mid-run, and a recommended retrofit.** `wrs-accordion-tabs` (component 1) spent
one cell each on `noTopPadding` and `noBottomPadding`, because two same-domain booleans render as
bare `true`/`false` with nothing to tell them apart. Component 10 found the better answer:
collapse both into a single four-value select covering the same reachable states — unambiguous by
content match, and one cell instead of two. Components 10 onward use it.

Component 1 was left as built rather than churned at the end of a long run. **But if it is to be
changed, now is the only cheap moment:** no content has been authored against these models yet, and
the project rule is that a field cannot be removed once authored content exists (the property
survives in AEM, keeps emitting a row, and shifts every positional read after it). After first
authoring, this retrofit stops being free.

## 5. What "done" means for this run

Every block here is lint-clean, unit-tested and registered in the author palette. **None has been
authored in the Universal Editor or published.** Per the migration skill's own standard, "passes
CI" is meaningfully weaker than "has been authored once" — and every test fixture in this run is
constructed from this repo's confirmed cell shapes rather than copied from real published markup.

Expect a review pass. The failures that survive this kind of run are cell-parsing and layout
faults that only appear against real published DOM.

## 6. Pre-authoring audit

Run before the first Universal Editor authoring session, because some of this stops being
cheap once content exists.

### Automated checks — all passing

Across all 31 block partials and 52 definition ids in the repo (WRS and the earlier `rb-*` set):

- every block folder name equals its slugified `template.name` (a mismatch 404s the JS with
  nothing in the console explaining it)
- every definition's `model` and `filter` id resolves
- no duplicate definition ids anywhere
- every parent id is in the section filter; no child item id is
- every block has its `<folder>/<folder>.js`
- no orphan collapsible fields
- **every model is within the 4-cell limit**, and every `PARENT_CELLS` constant in a
  `decorate()` equals the parent cells its model actually yields after grouping

### Fixed during the audit: the 8-colour cell

`wrsexperiencecarousel`'s `color_*` cell held 8 freeform text fields with **no defaults**, read
positionally by index. AEM omits a blank field from a grouped cell rather than emitting a
placeholder, so an author filling the 5th colour and leaving the first four blank would have had
every value land on the wrong property — silently, with no error.

Each field is now seeded with the value the block's CSS already falls back to, so AEM always emits
all 8 and positions cannot shift. The defaults double as the real starting palette an author sees.

### Still carrying positional shift risk — guidance, not a defect

Eight cells hold two or more optional free-text values read positionally. The same rule applies:
leave an earlier field blank while filling a later one and the values misattribute.

| Block / model | Cell | Fields |
|---|---|---|
| wrs-accordion-tabs / wrsaccordiontab | tab | tab_name, tab_title, tab_description |
| wrs-feature-carousel / wrsfeaturecarousel | heading | heading_title, heading_ariaLabel, heading_description |
| wrs-masthead-carousel / wrsmastheadvimeoslide | vimeo | vimeo_desktop, vimeo_mobile |
| wrs-conservation-banner / wrsconservationbanner | content | content_title, content_description |
| wrs-experience-carousel / wrsexperiencecarousel | card | card_title, card_description |
| wrs-experience-carousel / wrsexperiencecarouselitem | content | content_title, content_description |
| wrs-feature-carousel / wrsfeaturecarouselitem | content | content_title, content_description |
| wrs-masthead-carousel / wrsmastheadimageslide | content | content_header, content_subHeader |

Most are low severity: the first field is a title an author fills anyway, and getting it wrong is
visible immediately. Two deserve attention:

- **`vimeo_desktop` / `vimeo_mobile`** — a mobile-only video is a plausible authoring choice, and
  it would be read as the desktop id. The most likely of these to actually bite.
- **the two 3-field cells** — more positions, more ways to shift.

They were left as-is rather than re-modelled: the fix is either a default per field (only sensible
where a default value is meaningful — it is not, for a video id) or `key-value: true`, which
bypasses the 4-cell limit but restructures the block's whole markup. Worth doing if it bites in
practice; not worth pre-emptively churning eight blocks for.

**Authoring guidance meanwhile:** fill these fields in order and avoid skipping one. An empty
field between two filled ones is the failure case, not an empty field at the end.
