import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  MASKS, cellText, readCta, buildCta, renderEmpty,
} from '../../scripts/rb-helpers.js';

/**
 * One Column News - heading, then an image above a centred copy block and CTA.
 *
 * Ten model fields, four cells: content_* group to one, image + imageAlt
 * collapse into a picture, cta_* group, and mask stands alone.
 */
export default function decorate(block) {
  const rows = [...block.children];

  let mask = '';
  let cta = null;
  let imageRow = null;
  const texts = [];

  rows.forEach((row) => {
    const rowCta = readCta(row);
    if (rowCta) { cta = rowCta; return; }

    if (row.querySelector('picture, img')) { imageRow = row; return; }

    const text = cellText(row);
    if (MASKS.includes(text.toLowerCase())) {
      mask = text.toLowerCase();
    } else if (text) {
      const parts = [...row.querySelectorAll('p, div')]
        .map((el) => el.textContent.trim())
        .filter(Boolean);
      (parts.length ? parts : [text]).forEach((t) => texts.push({ row, text: t }));
    }
  });

  const [title, subtitle, desc] = texts;

  if (!title && !imageRow && !cta) {
    renderEmpty(block, 'One Column News — add a title, an image and a CTA');
    return;
  }

  const section = document.createElement('div');
  section.className = `rb-section ${mask || 'mask-1'} bg-beige`;

  const inner = document.createElement('div');
  inner.className = 'rb-section-inner';

  if (title) {
    const h2 = document.createElement('h2');
    h2.className = 'one-column-news-heading';
    h2.textContent = title.text;
    moveInstrumentation(title.row, h2);
    inner.append(h2);
  }

  const picture = imageRow?.querySelector('picture');
  if (picture) {
    const media = document.createElement('div');
    media.className = 'one-column-news-media';
    media.append(picture);
    moveInstrumentation(imageRow, media);
    inner.append(media);
  }

  const content = document.createElement('div');
  content.className = 'one-column-news-content';

  if (subtitle) {
    const h3 = document.createElement('h3');
    h3.textContent = subtitle.text;
    content.append(h3);
  }
  if (desc) {
    const p = document.createElement('p');
    p.textContent = desc.text;
    content.append(p);
  }

  const button = buildCta(cta);
  if (button) content.append(button);

  if (content.children.length) inner.append(content);

  section.append(inner);
  block.replaceChildren(section);
}
