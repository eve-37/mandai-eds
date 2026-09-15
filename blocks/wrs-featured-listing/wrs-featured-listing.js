/**
 * WRS Featured Listing
 *
 * Ported from wrs-aem/.../components/commons/featuredlistingv2.
 *
 * THIS IS A SHELL, NOT A FULL PORT. The dialog has no parent-level fields at
 * all - just one multifield (`largeImages` -> fieldset `./listItems`) holding
 * a single `fragmentPath` pathbrowser per row, stored oddly as
 * `@ValueMapValue String[] listItems`, an array of JSON strings rather than
 * child nodes (confirmed in FeatureListingV2Model.java - each string is
 * parsed with GSON and only its `fragmentPath` key is read).
 *
 * Everything actually rendered by the source HTL - header, descriptionDetail,
 * image360x540, image1x1, pathHTML - comes from resolving that path as a
 * Content Fragment (`resolver.getResource(cfPath)`, a `cq:model` check
 * against CONTENT_FRAGMENT_MODEL_ZONE, `adaptTo(ContentFragment.class)`, then
 * `name`/`summary`/`imageDesktop`/`imageDesktop1x1`/`detailLink`), plus
 * `CommonUtils.getCompressedResizedImageURL` for the two image variants and
 * `I18nUtils` for the show/hide button labels. NONE of that is dialog content
 * - it cannot be read positionally off authored cells the way every other
 * block in this repo works, and building a client-side fetch or a GraphQL
 * client here would be inventing an architecture decision, not converting
 * one. See docs/wrs-migration-notes.md "## featuredlistingv2" for the
 * servlet-vs-GraphQL analysis and recommendation.
 *
 * `show-all.js`, wired via `data-load-plugins` on the wrapper in the HTL for
 * the ">6 items" view-all/view-less behaviour, is referenced but not present
 * in the export bundle - its "view all" button is therefore not ported here
 * either; flagged, not invented.
 *
 * What IS safe to build without that decision: the container shell. Each
 * child row carries only the authored `fragmentPath` (a genuine
 * `/content/dam/fragments` path is expected here - the opposite of every
 * other block in this repo, where a DAM path signals a broken row read). The
 * shell renders one card per authored item and a clearly-marked unresolved
 * state in place of the Content Fragment data, so every row stays visible and
 * selectable in the Universal Editor while the resolution question is open.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import { renderEmpty, splitRows } from '../../scripts/rb-helpers.js';

const PREFIX = 'wrs-featured-listing';

/**
 * The dialog has no parent-level fields (see COMPONENT.md / the dialog XML -
 * the only field is `fragmentPath`, nested inside the `largeImages`
 * multifield's `./listItems` fieldset), so there are zero parent property
 * cells to skip before the child rows start.
 */
const PARENT_CELLS = 0;

/**
 * Reads one item row's single `fragmentPath` cell.
 *
 * A lone `aem-content` field with nothing to group with collapses to one
 * cell holding one anchor (confirmed against this repo's own single
 * aem-content-field fixtures, e.g. secondary-button: `<div><div><a
 * href="...">label</a></div></div>`). The href is the authored Content
 * Fragment path; the anchor's own text is whatever label the path picker
 * chose to display and is not meaningful authored copy.
 */
function readItem(row) {
  const anchor = row?.querySelector('a');
  const fragmentPath = anchor
    ? anchor.getAttribute('href') || ''
    : (row?.textContent?.trim() ?? '');
  return { fragmentPath };
}

export default function decorate(block) {
  const { childRows } = splitRows(block, PARENT_CELLS);

  if (!childRows.length) {
    renderEmpty(block, 'WRS Featured Listing — add a Content Fragment');
    return;
  }

  const list = document.createElement('div');
  list.className = `${PREFIX}-list`;

  childRows.forEach((row) => {
    const { fragmentPath } = readItem(row);

    const item = document.createElement('div');
    item.className = `${PREFIX}-item`;
    // The item's own instrumentation goes on the item itself, not on `list` -
    // list holds every sibling, and an editor drop target nested under a
    // sibling's instrumentation resolves to the wrong parent.
    moveInstrumentation(row, item);

    const card = document.createElement('div');
    card.className = `${PREFIX}-card wrapp-img`;

    // ---- SEAM: Content Fragment data would be injected here -------------
    // Once the servlet-vs-GraphQL decision (docs/wrs-migration-notes.md) is
    // made, resolve `fragmentPath` to its CF fields (header, descriptionDetail,
    // image360x540, image1x1, pathHTML) and replace the unresolved block
    // below with the real card markup: an <a> (or unlinked wrapper when
    // pathHTML is blank, matching the source's own data-sly-test/else split),
    // a lazyloaded <picture>, and a ".desc" panel with an <h4> + <p>.
    // No fetch is implemented here - see the seam comment, not this file,
    // for why.
    // -----------------------------------------------------------------------
    card.classList.add(`${PREFIX}-unresolved`);
    const label = document.createElement('p');
    label.className = `${PREFIX}-unresolved-label`;
    label.textContent = fragmentPath
      ? `Content Fragment not resolved: ${fragmentPath}`
      : 'No Content Fragment selected';
    card.append(label);

    item.append(card);
    list.append(item);
  });

  block.replaceChildren(list);
}
