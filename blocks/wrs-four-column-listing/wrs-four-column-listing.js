/**
 * WRS Four Column Listing
 *
 * Ported from wrs-aem/.../components/mandai/mandaicffourcollisting
 * (`md-4-col-content-fragment`). This is a Content-Fragment-driven grid, the
 * second such component in this run after `wrs-featured-listing` - see
 * docs/wrs-migration-notes.md "## mandaicffourcollisting" for the full
 * servlet-vs-GraphQL analysis and outcome. `cfPath` is a single Content
 * Fragment path per row (1-4 rows), author-curated exactly like
 * `featuredlistingv2`'s `fragmentPath` despite the dialog LABELLING it a
 * "Content Fragment Folder Path" - confirmed misleading, not a listing
 * operation (see the notes entry).
 *
 * Everything the HTL renders per item - `title`, `locationLabels`,
 * `dateLabels`, `timeLabels`, `tags`, `shortDescription`, `image`,
 * `imageAltText`, `imageIsDecorative`, `ctaText`, `ctaLink` - comes off the
 * Content Fragment identified by `cfPath`. That resolution is now wired: the
 * decision landed on SERVLET (same `ContentFragmentServlet`
 * wrs-featured-listing uses, serving the `mandai-things-to-do` /
 * `mandai-things-to-do-w-operating-hours` models), fetched here through
 * `scripts/wrs-cf.js`.
 *
 * RENDERING MODEL - identical contract to wrs-featured-listing, see that
 * file's docblock for the full rationale, summarised here:
 * - decorate() builds every card synchronously in its unresolved state, so
 *   the block paints without waiting on the network.
 * - Outside the editor, fragments are fetched in parallel afterwards and
 *   each card independently swaps to resolved markup as its own fetch
 *   settles - a 404/failure on one card leaves only that card unresolved.
 * - In the editor (`data-aue-resource` present) no fetch happens at all;
 *   the existing unresolved-but-selectable row state is kept deliberately,
 *   since the Universal Editor runs cross-origin and authors are editing
 *   the `cfPath` field, not viewing resolved data.
 * - Images render as plain `<img>` against the servlet's raw DAM path, not
 *   `createOptimizedPicture()` - see wrs-featured-listing.js for why
 *   (AEM 6.5 `.transform/compress/resizeNNN` convention vs EDS media-bus
 *   params being two different, incompatible query-string dialects).
 *   Unresolved follow-up, not invented here either.
 *
 * `hideCTAButton`, authored per row on the dialog's own child multifield
 * (not a Content Fragment field), suppresses the per-item CTA regardless of
 * whether the fragment has `ctaText`/`ctaLink` - porting
 * `MandaiCFFourColListingModel.getCFDetails()`'s server-side clearing of
 * `ctaText` when this checkbox is set.
 *
 * `match-height.js` is not ported - not in the export bundle, and CSS Grid's
 * default row-stretch already equalizes card heights (see git history / the
 * notes entry for the full reasoning).
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  cellText, cellValues, renderEmpty, splitRows, resolveHref,
} from '../../scripts/rb-helpers.js';
import { fetchFragments } from '../../scripts/wrs-cf.js';

const PREFIX = 'wrs-four-column-listing';

/** title, cta_*, layout_* - see _wrs-four-column-listing.json. */
const PARENT_CELLS = 3;

const CTA_STYLES = ['link', 'button'];
const STYLE_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const ALIGNS = ['title-center', 'title-left'];
const BG_COLORS = ['bg-base', 'bg-sap-white'];
const ALIGN_ITEMS = ['items-center'];
const PADDINGS = ['none', 'no-top', 'no-bottom', 'no-top-bottom'];

/**
 * Reads the grouped cta_link / cta_linkText / cta_style cell.
 *
 * Confirmed against this repo's own established shape for an identical
 * aem-content + text + select combination (four-column-tiles' cta_ cell,
 * `<p><a href="...">label</a></p><p>value</p>`): the aem-content field's
 * authored link text renders as the anchor's own textContent, and the select
 * value is a separate sibling <p> matched by its known vocabulary rather than
 * by position, since an unauthored select still emits its model default and
 * an unauthored aem-content field does not emit an anchor at all.
 */
function readSectionCta(row) {
  const cta = { href: '', text: '', style: 'link' };
  if (!row) return cta;

  const anchor = row.querySelector('a');
  if (anchor) {
    cta.href = anchor.getAttribute('href') || '';
    cta.text = anchor.textContent.trim();
  }

  cellValues(row)
    .map((v) => v.toLowerCase())
    .forEach((v) => {
      if (CTA_STYLES.includes(v)) cta.style = v;
    });

  return cta;
}

/**
 * Reads the grouped layout_* cell (style, align, bgColor, alignItems,
 * anchorLink, padding - six source fields folded into one cell).
 *
 * Every select here has a default `value` in the model, so it always emits a
 * <p> even when the author has not touched it - only `anchorLink` (free text)
 * and an explicit "left" choice on `alignItems` (whose own option value is
 * the empty string in the SOURCE dialog, ported as-is rather than invented)
 * can be genuinely absent. Values are matched by their known vocabulary, not
 * by position, so a blank anchorLink does not shift anything after it -
 * whatever text is left over once every enumerated value has been claimed is
 * the anchor id.
 *
 * `noTopPadding`/`noBottomPadding` were two source checkboxes of the same
 * shape ("Grouped with item above" / "Grouped with item below"). Grouping
 * both into this same cell as two bare booleans would reproduce exactly the
 * trap the task brief calls out: two "true"/"false" values with no field name
 * attached, so an author who checks only one of them cannot be told apart
 * from one who checks the other. Rather than relying on "whichever boolean
 * cell shows up is the only one, so it must be X" (fragile - breaks the
 * moment a free-text anchorLink happens to read "true"), the two checkboxes
 * were collapsed into ONE select field, `layout_padding`, with four distinct,
 * unambiguous values (none / no-top / no-bottom / no-top-bottom). This is a
 * real field-shape change from the source (two checkboxes -> one select) but
 * represents exactly the same four reachable states the two checkboxes
 * combined could produce, so no authoring capability is lost.
 */
function readLayout(row) {
  const layout = {
    style: '', align: '', bgColor: '', alignItems: '', anchorLink: '', padding: '',
  };
  if (!row) return layout;

  cellValues(row).forEach((raw) => {
    const v = raw.toLowerCase();
    if (STYLE_TAGS.includes(v)) layout.style = v;
    else if (ALIGNS.includes(v)) layout.align = v;
    else if (BG_COLORS.includes(v)) layout.bgColor = v;
    else if (ALIGN_ITEMS.includes(v)) layout.alignItems = v;
    else if (PADDINGS.includes(v)) layout.padding = v;
    else if (raw) layout.anchorLink = raw;
  });

  return layout;
}

/**
 * Reads one child row's two cells positionally: cfPath, hideCTAButton.
 * Neither shares an underscore prefix and neither is a collapsible suffix of
 * the other, so they stay two separate cells in dialog order.
 */
function readItem(row) {
  const [cfCell, hideCell] = [...(row?.children ?? [])];
  const anchor = cfCell?.querySelector('a') ?? null;
  const cfPath = anchor ? (anchor.getAttribute('href') || '') : cellText(cfCell);
  const hideCTAButton = cellText(hideCell).toLowerCase() === 'true';
  return { cfPath, hideCTAButton };
}

/** Renders the unresolved placeholder shown before/instead of real CF data. */
function renderUnresolved(card, cfPath, hideCTAButton) {
  card.classList.add(`${PREFIX}-unresolved`);
  const label = document.createElement('p');
  label.className = `${PREFIX}-unresolved-label`;
  label.textContent = cfPath
    ? `Content Fragment not resolved: ${cfPath}${hideCTAButton ? ' (CTA hidden)' : ''}`
    : 'No Content Fragment selected';
  card.replaceChildren(label);
}

/**
 * Renders a card's real content from the servlet's `elements` object. Every
 * key is read defensively - the endpoint omits keys the fragment/model has
 * no value for, never sends them as null, and this one endpoint serves two
 * different fragment models with disjoint element sets.
 */
function renderResolved(card, elements, hideCTAButton) {
  card.classList.remove(`${PREFIX}-unresolved`);
  card.replaceChildren();

  // Plain <img> against the raw DAM path - see file docblock for why
  // createOptimizedPicture() is deliberately not used here.
  if (elements.image) {
    const img = document.createElement('img');
    img.src = elements.image;
    img.loading = 'lazy';
    if (elements.imageIsDecorative === 'true') {
      img.alt = '';
    } else {
      img.alt = elements.imageAltText || '';
    }
    card.append(img);
  }

  const content = document.createElement('div');
  content.className = 'all-content';

  if (elements.title) {
    const h4 = document.createElement('h4');
    h4.textContent = elements.title;
    content.append(h4);
  }

  if (Array.isArray(elements.tags) && elements.tags.length) {
    const tagList = document.createElement('div');
    tagList.className = 'md-tag-label';
    elements.tags.forEach((tag) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'md-tag';
      tagEl.textContent = tag;
      tagList.append(tagEl);
    });
    content.append(tagList);
  }

  [
    ['locationLabels', 'location'],
    ['dateLabels', 'date'],
    ['timeLabels', 'time'],
  ].forEach(([key, modifier]) => {
    const values = elements[key];
    if (!Array.isArray(values) || !values.length) return;
    const row = document.createElement('div');
    row.className = `md-icon-text ${modifier}`;
    const p = document.createElement('p');
    p.className = 'body-text3';
    p.textContent = values.join(', ');
    row.append(p);
    content.append(row);
  });

  if (elements.shortDescription) {
    const p = document.createElement('p');
    p.className = 'body-text3';
    p.textContent = elements.shortDescription;
    content.append(p);
  }

  // hideCTAButton is authored on the dialog's own row, not the fragment -
  // it suppresses the CTA regardless of what the fragment carries.
  if (!hideCTAButton && elements.ctaText && elements.ctaLink) {
    const link = document.createElement('a');
    link.className = 'md-link-with-arrow';
    link.href = resolveHref(elements.ctaLink);
    link.textContent = elements.ctaText;
    const arrow = document.createElement('span');
    arrow.className = 'md-link-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    link.append(arrow);
    content.append(link);
  }

  card.append(content);
}

export default function decorate(block) {
  const { parentRows, childRows } = splitRows(block, PARENT_CELLS);
  const [titleRow, ctaRow, layoutRow] = parentRows;
  const isEditMode = block.hasAttribute('data-aue-resource');

  const title = cellText(titleRow);
  const sectionCta = readSectionCta(ctaRow);
  const layout = readLayout(layoutRow);

  if (!title && !childRows.length && !sectionCta.href) {
    renderEmpty(block, 'WRS Four Column Listing — add a title and some Content Fragments');
    return;
  }

  const style = layout.style || 'h2';
  const align = layout.align || 'title-center';
  const bgColor = layout.bgColor || 'bg-base';
  const padding = layout.padding || 'none';

  const root = document.createElement('div');
  root.className = `${PREFIX}-inner ${bgColor}`;
  if (padding === 'no-top' || padding === 'no-top-bottom') root.classList.add('no-top-padding');
  if (padding === 'no-bottom' || padding === 'no-top-bottom') root.classList.add('no-bottom-padding');
  if (layout.anchorLink) root.id = layout.anchorLink;

  if (title) {
    const heading = document.createElement(style);
    heading.className = `${PREFIX}-title${align === 'title-center' ? ' text-center' : ''}`;
    heading.textContent = title;
    // The title cell's own instrumentation belongs on the heading it becomes,
    // not on the outer wrapper - the wrapper also holds the list and CTA,
    // which are separate cells with their own instrumentation.
    moveInstrumentation(titleRow, heading);
    root.append(heading);
  }

  // Tracked so the async fetch below can update each card independently
  // once its own fragment resolves (or doesn't).
  const pending = [];

  if (childRows.length) {
    const list = document.createElement('div');
    list.className = `${PREFIX}-list${layout.alignItems ? ` ${layout.alignItems}` : ''}`;

    childRows.forEach((row) => {
      const { cfPath, hideCTAButton } = readItem(row);

      const item = document.createElement('div');
      item.className = `${PREFIX}-item`;
      // The item's own instrumentation goes on the item itself, not on
      // `list` - list holds every sibling, and a drop target nested under a
      // sibling's instrumentation resolves to the wrong parent.
      moveInstrumentation(row, item);

      const card = document.createElement('div');
      card.className = `${PREFIX}-card`;
      renderUnresolved(card, cfPath, hideCTAButton);

      item.append(card);
      list.append(item);

      if (cfPath) pending.push({ card, cfPath, hideCTAButton });
    });

    root.append(list);
  }

  if (sectionCta.href && sectionCta.text) {
    const wrap = document.createElement('div');
    wrap.className = `${PREFIX}-cta`;
    moveInstrumentation(ctaRow, wrap);

    const link = document.createElement('a');
    link.href = sectionCta.href;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${PREFIX}-cta-button`;
    button.textContent = sectionCta.text;
    link.append(button);
    wrap.append(link);
    root.append(wrap);
  }

  if (!isEditMode && !root.children.length) {
    block.replaceChildren();
    return;
  }

  block.replaceChildren(root);

  // Fragments resolve asynchronously so the block's first paint never waits
  // on the network - and never at all in the editor (see file docblock).
  if (!isEditMode && pending.length) {
    fetchFragments(pending.map((p) => p.cfPath)).then((results) => {
      results.forEach((elements, i) => {
        if (!elements) return; // leaves this card's unresolved state as-is
        renderResolved(pending[i].card, elements, pending[i].hideCTAButton);
      });
    });
  }
}
