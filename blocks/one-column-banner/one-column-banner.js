import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  MASKS, cellText, readCta, buildCta, renderEmpty,
} from '../../scripts/rb-helpers.js';

/**
 * One Column Banner - copy over a full-bleed background image.
 *
 * Nine model fields, four cells: content_* group to one, bg_* to another,
 * cta_* to a third, leaving mask on its own.
 */
export default function decorate(block) {
  const rows = [...block.children];

  let mask = '';
  let cta = null;
  let images = [];
  const texts = [];

  rows.forEach((row) => {
    const rowCta = readCta(row);
    if (rowCta) { cta = rowCta; return; }

    const pictures = [...row.querySelectorAll('img')];
    if (pictures.length) {
      // The grouped bg_ cell: desktop first, mobile second.
      images = pictures.map((img) => img.getAttribute('src') || '');
      return;
    }

    const text = cellText(row);
    if (MASKS.includes(text.toLowerCase())) {
      mask = text.toLowerCase();
    } else if (text) {
      // The grouped content_ cell arrives as separate children.
      const parts = [...row.querySelectorAll('p, div')]
        .map((el) => el.textContent.trim())
        .filter(Boolean);
      (parts.length ? parts : [text]).forEach((t) => texts.push({ row, text: t }));
    }
  });

  const [title, desc] = texts;
  const [desktop, mobile] = images;

  if (!title && !cta && !desktop) {
    renderEmpty(block, 'One Column Banner — add a title and a background');
    return;
  }

  const section = document.createElement('div');
  section.className = `rb-section ${mask || 'mask-1'}`;
  // The background is authored, not one of the fixed bg-* classes, so it is set
  // as custom properties and CSS picks per breakpoint - no JS resize listener,
  // and the right image is chosen before any script runs.
  if (desktop) section.style.setProperty('--banner-bg-desktop', `url("${desktop}")`);
  if (mobile || desktop) section.style.setProperty('--banner-bg-mobile', `url("${mobile || desktop}")`);

  const inner = document.createElement('div');
  inner.className = 'rb-section-inner';

  const content = document.createElement('div');
  content.className = 'one-column-banner-content';

  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title.text;
    moveInstrumentation(title.row, h2);
    content.append(h2);
  }
  if (desc) {
    const p = document.createElement('p');
    p.textContent = desc.text;
    content.append(p);
  }

  const button = buildCta(cta);
  if (button) content.append(button);

  inner.append(content);
  section.append(inner);
  block.replaceChildren(section);
}
