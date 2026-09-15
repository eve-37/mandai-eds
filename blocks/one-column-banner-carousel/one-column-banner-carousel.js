import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  MASKS, cellText, cellValues, readCta, buildCta, buildDots, renderEmpty, splitRows,
} from '../../scripts/rb-helpers.js';

const PREFIX = 'one-column-banner-carousel';
const ALIGNS = ['left', 'center', 'right'];

/**
 * mask, align, gradient - see _one-column-banner-carousel.json.
 *
 * These belong to the CAROUSEL, not to each banner. The source dialog puts
 * maskType, textAlign and gradient outside the banners multifield, so every
 * slide shares one border pattern, one alignment and one gradient setting.
 * They were modelled per-banner here, which let slides disagree in a way the
 * original could not express.
 */
const PARENT_CELLS = 3;

/**
 * Reads one banner child row: content_, bg_ and cta_ in model order.
 */
function readBanner(row) {
  const [contentCell, bgCell, ctaCell] = [...row.children];
  const [title = '', desc = ''] = cellValues(contentCell);
  const [desktop = '', mobile = ''] = [...(bgCell?.querySelectorAll('img') || [])]
    .map((img) => img.getAttribute('src') || '');

  return {
    title, desc, desktop, mobile, cta: readCta(ctaCell),
  };
}

/** Reads the carousel's own three style cells, shared by every banner. */
function readParent(rows) {
  const style = { mask: '', align: '', gradient: false };
  rows.forEach((row) => {
    const value = cellText(row).toLowerCase();
    if (MASKS.includes(value)) style.mask = value;
    else if (ALIGNS.includes(value)) style.align = value;
    else if (value === 'true' || value === 'false') style.gradient = value === 'true';
  });
  return style;
}

export default function decorate(block) {
  const { parentRows, childRows: bannerRows } = splitRows(block, PARENT_CELLS);
  const style = readParent(parentRows);

  if (!bannerRows.length) {
    renderEmpty(block, 'One Column Banner Carousel — add some banners');
    return;
  }

  const track = document.createElement('ul');
  track.className = `${PREFIX}-track rb-track`;

  const items = bannerRows.map((row) => {
    const banner = readBanner(row);

    const li = document.createElement('li');
    li.className = `${PREFIX}-item rb-track-item`;
    moveInstrumentation(row, li);

    const section = document.createElement('div');
    section.className = `rb-section ${style.mask || 'mask-1'}${style.gradient ? ' has-gradient' : ''}`;
    if (banner.desktop) section.style.setProperty('--banner-bg-desktop', `url("${banner.desktop}")`);
    if (banner.mobile || banner.desktop) {
      section.style.setProperty('--banner-bg-mobile', `url("${banner.mobile || banner.desktop}")`);
    }

    const inner = document.createElement('div');
    inner.className = 'rb-section-inner';

    const content = document.createElement('div');
    content.className = `${PREFIX}-content align-${style.align || 'left'}`;

    if (banner.title) {
      const h2 = document.createElement('h2');
      h2.textContent = banner.title;
      content.append(h2);
    }
    if (banner.desc) {
      const p = document.createElement('p');
      p.textContent = banner.desc;
      content.append(p);
    }

    const button = buildCta(banner.cta);
    if (button) content.append(button);

    inner.append(content);
    section.append(inner);
    li.append(section);
    track.append(li);
    return li;
  });

  const wrapper = document.createElement('div');
  wrapper.className = `${PREFIX}-wrapper`;
  wrapper.append(track);

  const dots = buildDots(track, items, PREFIX);
  if (dots) wrapper.append(dots);

  block.replaceChildren(wrapper);
}
