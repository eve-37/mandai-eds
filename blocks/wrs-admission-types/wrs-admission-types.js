/**
 * WRS Admission Types Widget
 *
 * Ported from wrs-aem/.../components/commons/admissiontypeswidget.
 *
 * Shape: a single-level container. The dialog has NO top-level fields at
 * all - the whole component is one multifield (`columnItems` -> composite
 * `./columnItems`) - so the parent model carries no fields, the same
 * situation `blocks/cards/` is in, and is handled the same way: no `model`
 * key on the parent definition's `template`, only `filter`. There is
 * nothing for `decorate()` to read off the block root either; every row is
 * a child item.
 *
 * Cell model: the child dialog has exactly 4 fields (title, path,
 * isOpenNewTab, description) and this codebase's cap is exactly 4 cells, so
 * grouping is possible (e.g. path+isOpenNewTab as a link/link_target pair)
 * but not necessary. Kept as 4 separate one-field cells, matching dialog
 * field order exactly, because: (a) it needs no headroom - this dialog has
 * no history of growing, unlike the CTA-shaped fields elsewhere that get
 * grouped because more fields are expected around them - and (b) per the
 * skill's own guidance, original dialog property names are kept wherever
 * grouping is not required, so authored content maps across without a
 * migration script. `isOpenNewTab` is a lone boolean field, so - matching
 * wrs-accordion-tabs's noTopPadding/noBottomPadding precedent - it is its
 * own single-field cell rather than merged into another, since a grouped
 * cell containing two ambiguous "true"/"false" values would be unreadable.
 *
 * The child dialog's field `name=` values omit the leading `./` used by
 * every other dialog in this migration set (`name="title"`, not
 * `name="./title"`). Confirmed by reading the XML directly. This has no
 * effect on the model here: Granite UI resolves a bare relative name the
 * same way it resolves one prefixed with `./` (both are relative to the
 * current resource); only `../` or a leading `/` would differ. So the
 * model's field names below are the same either way.
 *
 * `AdmissionTypesWidgetModel.java` is a 13-line interface only - no
 * implementation is in this bundle - so there is no server-side logic to
 * port and also no way to confirm behaviour beyond what the HTL itself
 * shows. The HTL is taken as ground truth; nothing here is invented beyond
 * it.
 *
 * The source's `far fa-chevron-right` icon (Font Awesome) is not shipped in
 * this repo. As with wrs-accordion-tabs, it is replaced by a plain Unicode
 * chevron carrying the same size/colour/circular-swatch treatment as the
 * source rule (`.md-admission-type__title i`), via `::after` in CSS - no
 * `<i>` element is rendered.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  cellText, resolveHref, splitRows, renderEmpty,
} from '../../scripts/rb-helpers.js';

const PARENT_CELLS = 0;

function readItem(row) {
  const [titleCell, pathCell, newTabCell, descCell] = row.children;

  return {
    title: cellText(titleCell),
    path: cellText(pathCell),
    isOpenNewTab: cellText(newTabCell).toLowerCase() === 'true',
    description: cellText(descCell),
  };
}

function buildItem(item, row) {
  const wrapper = document.createElement('div');
  wrapper.className = 'wrs-admission-types-item';

  if (item.title) {
    const titleWrap = document.createElement('div');
    titleWrap.className = 'wrs-admission-types-title';

    const anchor = document.createElement('a');
    anchor.href = resolveHref(item.path);
    if (item.isOpenNewTab) {
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
    }

    const strong = document.createElement('strong');
    strong.textContent = item.title;
    anchor.append(strong);
    titleWrap.append(anchor);
    wrapper.append(titleWrap);
  }

  if (item.description) {
    const descWrap = document.createElement('div');
    descWrap.className = 'wrs-admission-types-desc';
    const p = document.createElement('p');
    p.textContent = item.description;
    descWrap.append(p);
    wrapper.append(descWrap);
  }

  moveInstrumentation(row, wrapper);
  return wrapper;
}

export default function decorate(block) {
  const { childRows } = splitRows(block, PARENT_CELLS);

  const items = childRows
    .map((row) => ({ row, item: readItem(row) }))
    .filter(({ item }) => item.title || item.description);

  if (!items.length) {
    renderEmpty(block, 'WRS Admission Types — add an admission type');
    return;
  }

  const list = document.createElement('div');
  list.className = 'wrs-admission-types-list';

  items.forEach(({ row, item }) => list.append(buildItem(item, row)));

  const wrapper = document.createElement('div');
  wrapper.className = 'wrs-admission-types-wrapper';
  wrapper.append(list);

  block.replaceChildren(wrapper);
}
