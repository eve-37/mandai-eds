/**
 * Shared helpers for the Ranger Buddies blocks.
 *
 * Several migrated components repeat the same three things: they resolve an
 * internal path the way every rb-aem Sling Model did, they read a grouped
 * `cta_` cell, and they turn a row of children into a scroll-snap carousel.
 * In the source these were a shared PrimaryButton component and a shared Slick
 * config, so they belong in one place here too.
 *
 * This is NOT a general utility dumping ground - it holds only what more than
 * one block needs.
 */

export const VARIANTS = ['green', 'yellow'];
export const MASKS = ['mask-1', 'mask-2'];

/** Trimmed text of an element, safe on null. */
export function cellText(el) {
  return el?.textContent?.trim() ?? '';
}

/**
 * The values held by one cell, in model order.
 *
 * A cell grouping several fields renders one `<p>` per value; a cell holding a
 * single value renders that text bare, with no `<p>` at all. Both shapes have
 * to work, so paragraphs are preferred and the element's own text is the
 * fallback.
 *
 * Do NOT widen the selector to `'p, div'`. That also matches the containing
 * cell, whose textContent is every value run together - which is how the
 * missions title once came out as "Missionsmore description heremask-1".
 */
export function cellValues(el) {
  if (!el) return [];
  const parts = [...el.querySelectorAll('p')]
    .map((p) => p.textContent.trim())
    .filter(Boolean);
  if (parts.length) return parts;
  const own = el.textContent.trim();
  return own ? [own] : [];
}

/**
 * The values held by one cell, ONE ENTRY PER FIELD SLOT, positions preserved.
 *
 * `cellValues()`'s `.filter(Boolean)` drops empty paragraphs, so callers that
 * destructure its result positionally (`values[0]` is field A, `values[1]`
 * is field B, ...) get every value shifted left by one for each earlier
 * field an author left blank. `cellSlots()` is the same read WITHOUT that
 * filter - a blank field still occupies its own index, as `''`.
 *
 * What is known vs assumed, stated plainly (see docs/wrs-migration-notes.md
 * "## 6. Pre-authoring audit" for the full writeup): `splitRows()`'s own
 * docblock records, from OBSERVED published output, that AEM drops an empty
 * CELL entirely. Whether AEM emits an empty `<p></p>` for a blank FIELD
 * INSIDE a grouped cell (in which case this function fixes the shift
 * completely), or omits that field's paragraph too (in which case position
 * is unrecoverable from the markup at all, no matter how it's read), is NOT
 * known - no block in this repo has been authored or published yet. This
 * function is the cheap fix that is strictly correct in the first case and
 * no worse than `cellValues()` in the second; it is not a substitute for
 * checking against real authored/published markup once it exists.
 *
 * USE THIS when reading a grouped cell POSITIONALLY, by field declaration
 * order (`slots[0]` is field A, `slots[1]` is field B, ...). Keep using
 * `cellValues()` where a cell is read by matching each value's own small,
 * known vocabulary (a heading tag, `true`/`false`, a mask/align/padding
 * keyword) rather than by position - that kind of read is already immune to
 * a dropped blank, since the missing entry simply never matches anything,
 * and switching it to `cellSlots()` adds nothing.
 *
 * Text only, like `cellValues()` - a field whose markup must survive (a
 * richtext field) still has to be read from the cell's own `children`
 * directly, not through this or `cellValues()`, either of which flattens to
 * plain text.
 */
export function cellSlots(el) {
  if (!el) return [];
  const paragraphs = [...el.querySelectorAll('p')];
  if (paragraphs.length) return paragraphs.map((p) => p.textContent.trim());
  const own = el.textContent.trim();
  return own ? [own] : [];
}

/**
 * A CSS-background-sized URL for an authored image.
 *
 * EDS renders every image as a `<picture>` whose `<source>` elements carry the
 * optimised variants and whose `<img>` fallback is deliberately the SMALLEST and
 * least optimised of them - 750px PNG. Blocks that put an authored image into a
 * CSS background were reading that fallback `src`, so a full-bleed desktop band
 * loaded a 750px PNG and looked soft.
 *
 * The delivery service takes its parameters from the query string, so the right
 * variant is a rewrite rather than a lookup. WebP costs nothing in support
 * terms here: these bands are already shaped with `mask-image`, which is the
 * narrower requirement of the two.
 *
 * @param {Element|null} scope element containing the picture, or the img itself
 * @param {number} width intrinsic width to request
 */
export function backgroundUrl(scope, width) {
  const img = scope?.tagName === 'IMG' ? scope : scope?.querySelector('img');
  const src = img?.getAttribute('src');
  if (!src) return '';

  const [path, query] = src.split('?');
  const params = new URLSearchParams(query || '');
  params.set('width', String(width));
  params.set('format', 'webply');
  params.set('optimize', 'medium');
  return `${path}?${params.toString()}`;
}

/**
 * Ports the `.html` suffix every rb-aem Sling Model appended to internal paths
 * (`getLink()`, `getCtaURL()` and friends). External URLs are left alone.
 */
export function resolveHref(raw) {
  if (!raw) return '';
  if (raw.startsWith('/content') && !raw.endsWith('.html')) return `${raw}.html`;
  return raw;
}

/**
 * Reads a grouped `cta_` cell.
 *
 * Confirmed against author-rendered markup: fields sharing a `cta_` prefix are
 * grouped into ONE cell and arrive as separate child elements, e.g.
 *   <div><p><a href="/">Label</a></p><p>green</p><p>true</p></div>
 * so each value must be read from its own child. Testing the row's combined
 * textContent sees "Labelgreentrue" and matches nothing, which silently leaves
 * variant and new-tab at their defaults.
 *
 * Returns null when the row holds no link at all.
 */
export function readCta(row) {
  const anchor = row?.querySelector('a');
  if (!anchor) return null;

  const cta = {
    href: anchor.getAttribute('href') || '',
    text: anchor.textContent.trim(),
    title: anchor.getAttribute('title') || '',
    variant: '',
    newTab: false,
  };

  [...row.querySelectorAll('p, div')]
    .map((el) => el.textContent.trim().toLowerCase())
    .filter(Boolean)
    .forEach((part) => {
      if (VARIANTS.includes(part)) cta.variant = part;
      else if (part === 'true' || part === 'false') cta.newTab = part === 'true';
    });

  return cta;
}

/**
 * Builds the shared torn-edge CTA button. Styling lives in styles/styles.css
 * as .rb-cta so every block that embeds a CTA renders an identical one.
 *
 * Falls back to a span when there is no href: a link that goes nowhere should
 * not be announced as actionable.
 */
export function buildCta(cta, { wide = true } = {}) {
  if (!cta || (!cta.href && !cta.text)) return null;

  const shape = document.createElement('div');
  shape.className = `rb-cta ${wide ? 'rb-cta-wide' : 'rb-cta-narrow'} ${cta.variant || 'green'}`;

  const el = document.createElement(cta.href ? 'a' : 'span');
  if (cta.href) {
    el.href = resolveHref(cta.href);
    if (cta.newTab) {
      el.target = '_blank';
      el.rel = 'noreferrer';
    }
  }
  if (cta.title) el.title = cta.title;
  el.textContent = cta.text;

  shape.append(el);
  return shape;
}

/**
 * Dots for a scroll-snap track. One per item, reflecting and driving position.
 *
 * The source used Slick (jQuery). Native scroll-snap keeps momentum scrolling,
 * keyboard and screen-reader behaviour that a hand-rolled carousel has to
 * reimplement, and adds no dependency - third-party JS being the usual reason
 * an EDS site loses its Lighthouse score.
 *
 * Returns null for a single item, where there is nothing to navigate.
 */
export function buildDots(track, items, prefix) {
  if (items.length < 2) return null;

  const dots = document.createElement('div');
  dots.className = `${prefix}-dots rb-dots`;
  dots.setAttribute('role', 'tablist');
  dots.setAttribute('aria-label', 'Choose a slide');

  items.forEach((item, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'rb-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
    dot.addEventListener('click', () => {
      track.scrollTo({ left: item.offsetLeft - track.offsetLeft, behavior: 'smooth' });
    });
    dots.append(dot);
  });

  const setActive = () => {
    let best = 0;
    let bestDelta = Infinity;
    items.forEach((item, index) => {
      const delta = Math.abs((item.offsetLeft - track.offsetLeft) - track.scrollLeft);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = index;
      }
    });
    [...dots.children].forEach((dot, index) => {
      dot.classList.toggle('active', index === best);
      dot.setAttribute('aria-selected', index === best ? 'true' : 'false');
    });
  };

  let frame;
  track.addEventListener('scroll', () => {
    // Scroll fires far more often than paint; coalesce to one update per frame.
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(setActive);
  }, { passive: true });

  setActive();
  return dots;
}

/**
 * Renders the editor-only placeholder, or clears the block on the live site.
 *
 * A block with no DOM cannot be clicked, so an author has no route back into
 * its properties to fix it. Published pages render nothing at all.
 */
export function renderEmpty(block, label) {
  if (block.hasAttribute('data-aue-resource')) {
    const placeholder = document.createElement('p');
    placeholder.className = 'rb-placeholder';
    placeholder.textContent = label;
    block.replaceChildren(placeholder);
  } else {
    block.replaceChildren();
  }
}

/**
 * Splits a container block's rows into the parent's own property rows and its
 * child rows.
 *
 * Counting cells does NOT work, and the failure is silent. Observed on a
 * published page: three Testimony children with both fields left blank each
 * rendered as `<div><div></div></div>` - AEM drops empty cells, so a two-field
 * child collapses to one cell and is indistinguishable from a parent property.
 * Those three quotes vanished with no error anywhere. A child with a message
 * but no name fails the same way.
 *
 * Position is stable where cell count is not. The parent's property rows always
 * come first, one per field group, and are emitted even when empty - the same
 * observation that breaks cell counting proves rows survive when cells do not.
 * So `parentCells` is a constant read off the model, not something to infer.
 *
 * @param {Element} block
 * @param {number} parentCells number of cells the parent model produces
 */
export function splitRows(block, parentCells) {
  const rows = [...block.children];
  return {
    parentRows: rows.slice(0, parentCells),
    childRows: rows.slice(parentCells),
  };
}
