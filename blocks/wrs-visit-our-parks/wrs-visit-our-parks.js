/**
 * WRS Visit Our Parks
 *
 * Ported from wrs/components/structure/header - specifically the
 * `visitOurParksItems` multifield (dialog node `parkItems`, "Mobile Menu
 * Section" tab), the ONE piece of the 17-field / 5-multifield header dialog
 * this migration pass builds as a block. See docs/wrs-migration-notes.md
 * "## header" for the full decomposition and why everything else in that
 * component is flagged rather than converted.
 *
 * Source HTL (header.html, "wildlife-park" panel of the mobile menu):
 *   <div class="wildlife-park">
 *     <div class="grid">
 *       <ul class="list-park" data-sly-list.parkNav="${headerModel.listVisitOurPark}">
 *         <li>
 *           <a href="${parkNav.url}" title="${parkNav.title}">
 *             <img src="${parkNav.image}" alt="${parkNav.title}" width="100" height="40"/>
 *           </a>
 *         </li>
 *       </ul>
 *     </div>
 *   </div>
 *
 * HeaderModel.setDataToVisitOurBarks() does nothing beyond parse the stored
 * JSON strings into a bean and resolve the URL (CommonUtils.getProperURL) -
 * purely presentational, safe to port. It reads the field through
 * `HierarchyNodeInheritanceValueMap.getInherited("visitOurParksItems", ...)`,
 * the SAME page-hierarchy-inheritance mechanism the footer migration found
 * for `conservationBannerTab` (docs/wrs-migration-notes.md "## footer"): in
 * the source this panel is authored once on an ancestor page and cascades to
 * every descendant that does not override it, not authored per page. EDS has
 * no equivalent - each page that should show the panel needs the block
 * placed on it explicitly. Flagged here, not solved; see the notes doc for
 * the same open question the footer entry raised.
 *
 * There is no source variant/newTab/CTA styling on this link - it is a plain
 * image link, not a `.rb-cta` button - so it is rendered as a bare anchor
 * around a picture, matching the source exactly rather than borrowing the
 * shared CTA shape used elsewhere in this repo.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import { cellText, renderEmpty, splitRows } from '../../scripts/rb-helpers.js';

const PREFIX = 'wrs-visit-our-parks';

/** The parent panel carries no fields of its own - see _wrs-visit-our-parks.json. */
const PARENT_CELLS = 0;

/**
 * Reads one park row's three cells positionally: title, image, url.
 * None of the three fields share an underscore prefix and none is a
 * collapsible suffix of another, so AEM keeps them as three separate cells
 * in dialog order (confirmed against the dialog XML: title, image, Path).
 */
function readItem(row) {
  const cells = [...(row?.children ?? [])];
  const [titleCell, imageCell, linkCell] = cells;

  const title = cellText(titleCell);
  const picture = imageCell?.querySelector('picture') ?? null;
  const anchor = linkCell?.querySelector('a') ?? null;
  const href = anchor?.getAttribute('href') || '';

  return { title, picture, href };
}

export default function decorate(block) {
  const { childRows } = splitRows(block, PARENT_CELLS);
  const isEditMode = block.hasAttribute('data-aue-resource');

  if (!childRows.length) {
    renderEmpty(block, 'WRS Visit Our Parks — add a park');
    return;
  }

  const grid = document.createElement('div');
  grid.className = `${PREFIX}-grid`;

  const list = document.createElement('ul');
  list.className = `${PREFIX}-list`;

  childRows.forEach((row) => {
    const { title, picture, href } = readItem(row);
    if (!title && !picture && !href && !isEditMode) return;

    const li = document.createElement('li');
    li.className = `${PREFIX}-item`;
    // The item's own instrumentation belongs on the item, not on `list` -
    // list holds every sibling park, and a drop target nested under a
    // sibling's instrumentation resolves to the wrong parent.
    moveInstrumentation(row, li);

    const link = document.createElement(href ? 'a' : 'span');
    if (href) link.setAttribute('href', href);
    if (title) link.setAttribute('title', title);
    link.className = `${PREFIX}-link`;

    if (picture) {
      const img = picture.querySelector('img');
      if (img && title) img.setAttribute('alt', title);
      link.append(picture);
    } else if (title) {
      // Guard for an authored row with no image yet - keep it visible and
      // editable rather than rendering an empty link.
      link.textContent = title;
    }

    li.append(link);
    list.append(li);
  });

  if (!list.children.length) {
    renderEmpty(block, 'WRS Visit Our Parks — add a park');
    return;
  }

  grid.append(list);
  block.replaceChildren(grid);
}
