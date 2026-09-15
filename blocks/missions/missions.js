import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  MASKS, readCta, buildCta, renderEmpty, splitRows,
} from '../../scripts/rb-helpers.js';

const PREFIX = 'missions';

/** content_, image (+imageAlt), cta_, detail_ - see _missions.json. */
const PARENT_CELLS = 4;

/**
 * Text values of a cell's children, in order.
 *
 * Only `p` elements count. Querying `p, div` as well returns the containing
 * cell, whose textContent is every value run together - so the first "value"
 * became "Missionsmore description heremask-1" and was used as the title, while
 * the real mask never matched. Fall back to the element's own text only when
 * there are no paragraphs at all, which is the single-value case.
 */
function values(el) {
  const parts = [...el.querySelectorAll('p')]
    .map((p) => p.textContent.trim())
    .filter(Boolean);
  if (parts.length) return parts;
  const own = el.textContent.trim();
  return own ? [own] : [];
}

/**
 * The parent has thirteen fields in four cells: content_, image (+imageAlt),
 * cta_ and detail_. Two separate CTA groups is the reason the grouping has to
 * be this aggressive - the component offers both a main and a "detailed" call
 * to action.
 */
function readParent(rows) {
  const parent = {
    title: '', desc: '', mask: '', picture: null, imageRow: null, cta: null, detail: null,
  };
  const ctas = [];

  rows.forEach((row) => {
    const rowCta = readCta(row);
    if (rowCta) { ctas.push(rowCta); return; }

    if (row.querySelector('picture, img')) {
      parent.picture = row.querySelector('picture');
      parent.imageRow = row;
      return;
    }

    values(row).forEach((v) => {
      const lower = v.toLowerCase();
      if (MASKS.includes(lower)) parent.mask = lower;
      else if (!parent.title) parent.title = v;
      else if (!parent.desc) parent.desc = v;
    });
  });

  // Cell order decides which CTA is which: cta_ precedes detail_ in the model.
  [parent.cta = null, parent.detail = null] = ctas;
  return parent;
}

function buildMission(row) {
  const li = document.createElement('li');
  li.className = `${PREFIX}-item`;
  moveInstrumentation(row, li);

  const cells = [...row.children];
  // The logos cell is the one holding several pictures; the single-picture cell
  // is the mission's own image.
  // Count `picture` only. `picture, img` matches both elements of the same
  // image, so one picture counted as two and every mission image was taken for
  // a logo strip.
  const pictureCounts = cells.map((c) => c.querySelectorAll('picture').length);
  const logosIndex = pictureCounts.findIndex((n) => n > 1);
  const imageIndex = pictureCounts.findIndex((n, i) => n === 1 && i !== logosIndex);

  if (imageIndex >= 0) {
    const media = document.createElement('div');
    media.className = `${PREFIX}-item-media`;
    media.append(cells[imageIndex].querySelector('picture'));
    li.append(media);
  }

  const body = document.createElement('div');
  body.className = `${PREFIX}-item-body`;

  cells.forEach((cell, i) => {
    if (i === logosIndex || i === imageIndex) return;
    const [title, daterange, location, desc] = values(cell);
    if (title) {
      const h3 = document.createElement('h3');
      h3.textContent = title;
      body.append(h3);
    }
    // Date and location are metadata about the mission, so they read as one
    // line rather than two stray paragraphs.
    const meta = [daterange, location].filter(Boolean).join(' · ');
    if (meta) {
      const p = document.createElement('p');
      p.className = `${PREFIX}-item-meta`;
      p.textContent = meta;
      body.append(p);
    }
    if (desc) {
      const p = document.createElement('p');
      p.textContent = desc;
      body.append(p);
    }
  });

  if (body.children.length) li.append(body);

  if (logosIndex >= 0) {
    const logos = document.createElement('div');
    logos.className = `${PREFIX}-item-logos`;
    [...cells[logosIndex].querySelectorAll('picture')].forEach((p) => logos.append(p));
    li.append(logos);
  }

  return li;
}

export default function decorate(block) {
  const { parentRows, childRows: missionRows } = splitRows(block, PARENT_CELLS);
  const parent = readParent(parentRows);

  if (!parent.title && !missionRows.length) {
    renderEmpty(block, 'Missions — add a title and some missions');
    return;
  }

  const section = document.createElement('div');
  section.className = `rb-section ${parent.mask || 'mask-1'} bg-brown`;

  const inner = document.createElement('div');
  inner.className = 'rb-section-inner';

  const info = document.createElement('div');
  info.className = `${PREFIX}-info`;
  if (parent.title) {
    const h3 = document.createElement('h3');
    h3.textContent = parent.title;
    info.append(h3);
  }
  if (parent.desc) {
    const p = document.createElement('p');
    p.className = 'body-text-1';
    p.textContent = parent.desc;
    info.append(p);
  }
  const mainCta = buildCta(parent.cta);
  if (mainCta) info.append(mainCta);

  const banner = document.createElement('div');
  banner.className = `${PREFIX}-banner`;
  if (parent.picture) {
    banner.append(parent.picture);
    if (parent.imageRow) moveInstrumentation(parent.imageRow, banner);
  }

  const head = document.createElement('div');
  head.className = `${PREFIX}-head`;
  head.append(info, banner);
  inner.append(head);

  if (missionRows.length) {
    const list = document.createElement('ul');
    list.className = `${PREFIX}-list`;
    list.id = `${PREFIX}-list`;
    missionRows.forEach((row) => list.append(buildMission(row)));

    // The source toggled this open and closed. Kept, as a real button with
    // aria-expanded rather than a div with an onClick, and defaulting to
    // collapsed as the source did.
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = `${PREFIX}-toggle`;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', list.id);
    toggle.textContent = 'See our missions';
    list.hidden = true;
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      toggle.textContent = open ? 'See our missions' : 'Hide our missions';
      list.hidden = open;
    });

    inner.append(toggle, list);
  }

  const detailCta = buildCta(parent.detail);
  if (detailCta) {
    const wrap = document.createElement('div');
    wrap.className = `${PREFIX}-detail-cta`;
    wrap.append(detailCta);
    inner.append(wrap);
  }

  section.append(inner);
  block.replaceChildren(section);
}
