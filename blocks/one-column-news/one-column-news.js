import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  MASKS, cellText, cellValues, readCta, buildCta, renderEmpty,
} from '../../scripts/rb-helpers.js';

/**
 * One Column News - heading, then an image above a centred copy block and CTA.
 *
 * Ten model fields, four cells: content_* group to one, image + imageAlt
 * collapse into a picture, cta_* group, and mask stands alone.
 */
export default function decorate(block) {
  /*
   * Read by position: content_, image (+imageAlt), mask, cta_ in model order.
   * A property row is emitted even when empty, so the order holds where content
   * matching does not.
   *
   * The copy was previously pulled with querySelectorAll('p, div'), which also
   * matches the containing cell - so the first "value" was the title, subtitle
   * and description run together, and it was rendered as the heading.
   */
  const [contentRow, imageRow, maskRow, ctaRow] = [...block.children];

  const [titleText = '', subtitleText = '', descText = ''] = cellValues(contentRow);
  const title = titleText ? { row: contentRow, text: titleText } : null;
  const subtitle = subtitleText ? { text: subtitleText } : null;
  const desc = descText ? { text: descText } : null;

  const maskText = cellText(maskRow).toLowerCase();
  const mask = MASKS.includes(maskText) ? maskText : '';

  const cta = readCta(ctaRow);

  if (!title && !imageRow?.querySelector('picture') && !cta) {
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
