/**
 * WRS Featured Listing
 *
 * Ported from wrs-aem/.../components/commons/featuredlistingv2.
 *
 * The dialog has no parent-level fields at all - just one multifield
 * (`largeImages` -> fieldset `./listItems`) holding a single `fragmentPath`
 * pathbrowser per row, stored oddly as `@ValueMapValue String[] listItems`,
 * an array of JSON strings rather than child nodes (confirmed in
 * FeatureListingV2Model.java - each string is parsed with GSON and only its
 * `fragmentPath` key is read).
 *
 * Everything actually rendered by the source HTL - header, descriptionDetail,
 * image360x540, image1x1, pathHTML - comes from resolving that path as a
 * Content Fragment. That resolution is now wired: the servlet-vs-GraphQL
 * decision (docs/wrs-migration-notes.md "## featuredlistingv2") landed on
 * SERVLET, and `ContentFragmentServlet` (mandai-aem-cloud) is built. This
 * block calls it through `scripts/wrs-cf.js`, whose docblock has the full
 * endpoint contract.
 *
 * The endpoint's element names differ from the old Java field names quoted
 * above - `name` (was `header`), `summary` (was `descriptionDetail`),
 * `imageDesktop` (was `image360x540`), `imageDesktop1x1` (was `image1x1`),
 * `detailLink` (was `pathHTML`). Same five fields, renamed at the servlet
 * boundary per the servlet's own "Exposed elements" contract.
 *
 * `show-all.js`, wired via `data-load-plugins` on the wrapper in the HTL for
 * the ">6 items" view-all/view-less behaviour, is referenced but not present
 * in the export bundle - its "view all" button is therefore not ported here
 * either; flagged, not invented.
 *
 * RENDERING MODEL
 * ----------------
 * decorate() stays synchronous in its DOM-shape work: every authored row
 * becomes a card immediately, in the unresolved state, so the block paints
 * without waiting on the network. Only then, outside the editor, are the
 * fragments fetched in parallel and each card is independently swapped to
 * its resolved markup as its own fetch settles - a fragment that 404s (or
 * any other failure) leaves only that one card unresolved; it does not
 * blank the block or its siblings.
 *
 * EDIT MODE: no fetch at all. `block.hasAttribute('data-aue-resource')`
 * means this is the Universal Editor, which runs on a different origin from
 * the published/preview site and whose authors are editing the authored
 * fragment PATH, not viewing the resolved data. Fetching there would only
 * add a cross-origin request the editor doesn't need, so the existing
 * unresolved-but-selectable row state is kept deliberately - every row stays
 * visible and clickable for the author to edit its `fragmentPath` field.
 *
 * IMAGES: rendered as plain `<img>`/`<picture>` against the fragment's raw
 * DAM path on the AEM publish origin, NOT `createOptimizedPicture()`. The
 * source ran both image variants through
 * `CommonUtils.getCompressedResizedImageURL(url, resize720|resize512)`, an
 * AEM 6.5 transform-servlet convention (`.transform/compress/resizeNNN`)
 * that may not exist on AEMaaCS - the servlet deliberately returns the raw
 * DAM path rather than guessing at an equivalent. `createOptimizedPicture()`
 * would append EDS's own media-bus query params, which AEM's asset delivery
 * does not understand, yielding an unoptimised original image with a
 * misleading srcset. Image optimisation for these two variants is UNRESOLVED
 * and is a follow-up, not something this block invents an answer for.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import { renderEmpty, splitRows, resolveHref } from '../../scripts/rb-helpers.js';
import { fetchFragments } from '../../scripts/wrs-cf.js';

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

/** Renders the unresolved placeholder shown before/instead of real CF data. */
function renderUnresolved(card, fragmentPath) {
  card.classList.add(`${PREFIX}-unresolved`);
  const label = document.createElement('p');
  label.className = `${PREFIX}-unresolved-label`;
  label.textContent = fragmentPath
    ? `Content Fragment not resolved: ${fragmentPath}`
    : 'No Content Fragment selected';
  card.replaceChildren(label);
}

/**
 * Renders a card's real content from the servlet's `elements` object.
 * Every key is read defensively - the endpoint omits keys the fragment has
 * no value for, it never sends them as null.
 */
function renderResolved(card, elements) {
  card.classList.remove(`${PREFIX}-unresolved`);
  card.replaceChildren();

  const wrapper = document.createElement(elements.detailLink ? 'a' : 'div');
  wrapper.className = `${PREFIX}-link`;
  if (elements.detailLink) wrapper.href = resolveHref(elements.detailLink);

  // Plain <picture>/<img> against the raw DAM path - see file docblock for
  // why createOptimizedPicture() is deliberately not used here.
  const picture = document.createElement('picture');
  if (elements.imageDesktop) {
    const source = document.createElement('source');
    source.media = '(min-width: 992px)';
    source.srcset = elements.imageDesktop;
    picture.append(source);
  }
  const img = document.createElement('img');
  img.src = elements.imageDesktop1x1 || elements.imageDesktop || '';
  img.alt = elements.name || '';
  img.loading = 'lazy';
  picture.append(img);
  wrapper.append(picture);

  const desc = document.createElement('div');
  desc.className = `${PREFIX}-desc desc`;
  if (elements.name) {
    const h4 = document.createElement('h4');
    h4.textContent = elements.name;
    desc.append(h4);
  }
  if (elements.summary) {
    const p = document.createElement('p');
    p.textContent = elements.summary;
    desc.append(p);
  }
  wrapper.append(desc);

  card.append(wrapper);
}

export default function decorate(block) {
  const { childRows } = splitRows(block, PARENT_CELLS);
  const isEditMode = block.hasAttribute('data-aue-resource');

  if (!childRows.length) {
    renderEmpty(block, 'WRS Featured Listing — add a Content Fragment');
    return;
  }

  const list = document.createElement('div');
  list.className = `${PREFIX}-list`;

  // Tracked so the async fetch below can update each card independently
  // once its own fragment resolves (or doesn't).
  const pending = [];

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
    renderUnresolved(card, fragmentPath);

    item.append(card);
    list.append(item);

    if (fragmentPath) pending.push({ card, fragmentPath });
  });

  block.replaceChildren(list);

  // Fragments resolve asynchronously so the block's first paint never waits
  // on the network - and never at all in the editor (see file docblock).
  if (!isEditMode && pending.length) {
    fetchFragments(pending.map((p) => p.fragmentPath)).then((results) => {
      results.forEach((elements, i) => {
        if (!elements) return; // leaves this card's unresolved state as-is
        renderResolved(pending[i].card, elements);
      });
    });
  }
}
