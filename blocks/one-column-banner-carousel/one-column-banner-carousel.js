import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  MASKS, readCta, buildCta, buildDots, renderEmpty,
} from '../../scripts/rb-helpers.js';

const PREFIX = 'one-column-banner-carousel';
const ALIGNS = ['left', 'center', 'right'];

/**
 * Reads one banner child row.
 *
 * Four grouped cells - content_, bg_, cta_ and style_ - so nothing can be read
 * by position. Each cell is identified by what it holds: pictures mean bg_, an
 * anchor means cta_, a mask or align keyword means style_, and the remainder is
 * the copy.
 */
function readBanner(row) {
  const banner = {
    title: '', desc: '', desktop: '', mobile: '', cta: null, mask: '', align: '', gradient: false,
  };

  [...row.children].forEach((cell) => {
    const images = [...cell.querySelectorAll('img')];
    if (images.length) {
      [banner.desktop = '', banner.mobile = ''] = images.map((img) => img.getAttribute('src') || '');
      return;
    }

    const cta = readCta(cell);
    if (cta) { banner.cta = cta; return; }

    const parts = [...cell.querySelectorAll('p, div')]
      .map((el) => el.textContent.trim())
      .filter(Boolean);
    const values = parts.length ? parts : [cell.textContent.trim()].filter(Boolean);

    const keywords = values.filter((v) => {
      const lower = v.toLowerCase();
      if (MASKS.includes(lower)) { banner.mask = lower; return true; }
      if (ALIGNS.includes(lower)) { banner.align = lower; return true; }
      if (lower === 'true' || lower === 'false') { banner.gradient = lower === 'true'; return true; }
      return false;
    });

    // Anything that was not a style keyword is copy.
    const copy = values.filter((v) => !keywords.includes(v));
    if (copy.length) [banner.title = banner.title, banner.desc = banner.desc] = copy;
  });

  return banner;
}

export default function decorate(block) {
  const rows = [...block.children];
  // Every child is a banner; this component has no parent properties of its own.
  const bannerRows = rows.filter((row) => row.children.length || row.textContent.trim());

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
    section.className = `rb-section ${banner.mask || 'mask-1'}${banner.gradient ? ' has-gradient' : ''}`;
    if (banner.desktop) section.style.setProperty('--banner-bg-desktop', `url("${banner.desktop}")`);
    if (banner.mobile || banner.desktop) {
      section.style.setProperty('--banner-bg-mobile', `url("${banner.mobile || banner.desktop}")`);
    }

    const inner = document.createElement('div');
    inner.className = 'rb-section-inner';

    const content = document.createElement('div');
    content.className = `${PREFIX}-content align-${banner.align || 'left'}`;

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
