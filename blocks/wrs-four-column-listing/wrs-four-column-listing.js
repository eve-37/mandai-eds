/**
 * WRS Four Column Listing
 *
 * Ported from wrs-aem/.../components/mandai/mandaicffourcollisting
 * (`md-4-col-content-fragment`). This is a Content-Fragment-driven grid, the
 * second such component in this run after `wrs-featured-listing` - see
 * docs/wrs-migration-notes.md "## mandaicffourcollisting" for the full
 * servlet-vs-GraphQL analysis, and why it lands on the same branch as
 * `featuredlistingv2` despite the dialog LABELLING `cfPath` a "Content
 * Fragment Folder Path". Read `MandaiCFFourColListingModel.java`'s
 * `getAllCFDetails()`/`isValidCF()` before assuming otherwise: it calls
 * `resourceResolver.getResource(path)` and validates THAT resource's own
 * `jcr:content/data/cq:model` directly - there is no NodeIterator, no
 * QueryBuilder, no folder-children walk anywhere in this class. `cfPath` is a
 * single Content Fragment path per row (1-4 rows, `eaem-min-items="1"
 * eaem-max-items="4"`), author-curated exactly like `featuredlistingv2`'s
 * `fragmentPath` - the "Folder Path" label is misleading, not a listing
 * operation.
 *
 * THIS IS A SHELL, NOT A FULL PORT, for the same reason as
 * `wrs-featured-listing`: everything the HTL renders per item - `title`,
 * `locationLabels`, `dateLabels`, `timeLabels`, `tags`, `shortDescription`,
 * `image`, `imageAltText`, `imageIsDecorative`, `ctaText`, `ctaLink` - comes
 * off `masterResource.adaptTo(MandaiColumnListingCFDetails.class)`, a bean
 * class NOT included in this bundle (COMPONENT.md's "Not copied" list: Java
 * transitive deps under `.models.beans.*` were not followed). That is a
 * materially different situation from `featuredlistingv2`, where the model
 * itself called `CommonUtils.getCompressedResizedImageURL()` and
 * `I18nUtils.getLabel()` directly and in view - here, whatever formatting the
 * bean does to produce `locationLabels`/`dateLabels`/`timeLabels`/`tags` (all
 * plural - suggesting the raw CF field is parsed/split into a list) is
 * invisible from this bundle. `MandaiColumnListingCFDetails.java` must be
 * sourced and read before the servlet-vs-GraphQL call can be made with the
 * same confidence as `featuredlistingv2`'s. No fetch, no servlet, no GraphQL
 * client is implemented here either way.
 *
 * What IS safe to build without that decision: the container shell, plus the
 * section-level presentation fields (title, heading style/align, background,
 * align-items, anchor id, padding toggles, section CTA) which ARE plain
 * `@Inject` string properties on `MandaiCFFourColListingModel` with no
 * repository access - safe to port in full. Each child row carries the
 * authored `cfPath` and `hideCTAButton`, and renders a clearly-marked
 * unresolved state in place of the Content Fragment data.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  cellText, cellValues, renderEmpty, splitRows,
} from '../../scripts/rb-helpers.js';

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

      // ---- SEAM: Content Fragment data would be injected here -------------
      // Once the servlet-vs-GraphQL decision (docs/wrs-migration-notes.md) is
      // made, resolve `cfPath` to its CF fields (title, locationLabels,
      // dateLabels, timeLabels, tags, shortDescription, image, imageAltText,
      // imageIsDecorative, ctaText, ctaLink) and replace the unresolved block
      // below with the real card markup. `hideCTAButton`, authored per row
      // right here, is already available for that build - the source clears
      // ctaText server-side when this checkbox is set
      // (MandaiCFFourColListingModel.getCFDetails()).
      // -----------------------------------------------------------------------
      card.classList.add(`${PREFIX}-unresolved`);
      const label = document.createElement('p');
      label.className = `${PREFIX}-unresolved-label`;
      label.textContent = cfPath
        ? `Content Fragment not resolved: ${cfPath}${hideCTAButton ? ' (CTA hidden)' : ''}`
        : 'No Content Fragment selected';
      card.append(label);

      item.append(card);
      list.append(item);
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
}
