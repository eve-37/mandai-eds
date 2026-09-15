import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  MASKS, backgroundUrl, cellText, cellValues, readCta, buildCta, renderEmpty,
} from '../../scripts/rb-helpers.js';

/**
 * One Column Banner - copy over a full-bleed background image.
 *
 * Nine model fields, four cells: content_* group to one, bg_* to another,
 * cta_* to a third, leaving mask on its own.
 */
export default function decorate(block) {
  /*
   * Read by position: content_, bg_, mask, cta_ in model order. A property row
   * is emitted even when empty, so the order holds where content matching does
   * not.
   *
   * The copy was previously pulled with querySelectorAll('p, div'), which also
   * matches the containing cell - so the first "value" was the title and the
   * description run together, and it was rendered as the heading.
   */
  const [contentRow, bgRow, maskRow, ctaRow] = [...block.children];

  const [titleText = '', descText = ''] = cellValues(contentRow);
  const title = titleText ? { row: contentRow, text: titleText } : null;
  const desc = descText ? { text: descText } : null;

  const maskText = cellText(maskRow).toLowerCase();
  const mask = MASKS.includes(maskText) ? maskText : '';

  const cta = readCta(ctaRow);

  // Two authored images in one grouped bg_ cell: desktop first, mobile second.
  const [desktopImg, mobileImg] = [...(bgRow?.querySelectorAll('img') || [])];
  const desktop = backgroundUrl(desktopImg, 2000);
  const mobile = backgroundUrl(mobileImg, 750);

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
