import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  MASKS, cellText, readCta, buildCta, buildDots, renderEmpty, splitRows,
} from '../../scripts/rb-helpers.js';

const PREFIX = 'three-column-tiles';

/**
 * title, subtitle, mask - see _three-column-tiles.json.
 *
 * No parent CTA. The source dialog gives one to fourcoltiles but NOT to
 * threecoltiles, whose only buttons are the per-tile secondary ones.
 */
const PARENT_CELLS = 3;

export default function decorate(block) {
  const { parentRows, childRows } = splitRows(block, PARENT_CELLS);

  let mask = '';
  const plain = [];

  parentRows.forEach((row) => {
    const text = cellText(row);
    if (MASKS.includes(text.toLowerCase())) mask = text.toLowerCase();
    else if (text) plain.push({ row, text });
  });

  const [title, subtitle] = plain;

  if (!title && !childRows.length) {
    renderEmpty(block, 'Three Column Tiles — add a title and some tiles');
    return;
  }

  const section = document.createElement('div');
  section.className = `rb-section ${mask || 'mask-1'} bg-brown`;

  const inner = document.createElement('div');
  inner.className = 'rb-section-inner';

  if (title) {
    const h2 = document.createElement('h2');
    h2.className = `${PREFIX}-title`;
    h2.textContent = title.text;
    moveInstrumentation(title.row, h2);
    inner.append(h2);
  }

  if (subtitle) {
    const p = document.createElement('p');
    p.className = `${PREFIX}-subtitle`;
    p.textContent = subtitle.text;
    moveInstrumentation(subtitle.row, p);
    inner.append(p);
  }

  if (childRows.length) {
    const track = document.createElement('ul');
    track.className = `${PREFIX}-track rb-track`;

    const items = childRows.map((row) => {
      const li = document.createElement('li');
      li.className = `${PREFIX}-item rb-track-item`;
      moveInstrumentation(row, li);

      const picture = row.querySelector('picture');
      if (picture) {
        const photo = document.createElement('div');
        photo.className = `${PREFIX}-item-photo`;
        photo.append(picture);
        li.append(photo);
      }

      // Each tile carries its own CTA, which is what separates this component
      // from four-column-tiles.
      const tileCta = readCta(row);
      const caption = [...row.children]
        .map((cell) => cellText(cell))
        .find((text) => text && text !== tileCta?.text);

      if (caption) {
        const name = document.createElement('div');
        name.className = `${PREFIX}-item-name`;
        const h4 = document.createElement('h4');
        h4.textContent = caption;
        name.append(h4);
        li.append(name);
      }

      // The SECONDARY button - 140px wide against the primary's 220px, and
      // squatter. ThreeColTiles/Tile.js imports SecondaryButton, and it is the
      // only rb-aem component that does; every other embedded CTA is primary.
      const button = buildCta(tileCta, { wide: false });
      if (button) {
        const wrap = document.createElement('div');
        wrap.className = `${PREFIX}-item-cta`;
        wrap.append(button);
        li.append(wrap);
      }

      track.append(li);
      return li;
    });

    inner.append(track);
    const dots = buildDots(track, items, PREFIX);
    if (dots) inner.append(dots);
  }

  section.append(inner);
  block.replaceChildren(section);
}
