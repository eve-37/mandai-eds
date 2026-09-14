import { moveInstrumentation } from '../../scripts/scripts.js';

const MASKS = ['mask-1', 'mask-2'];
const VARIANTS = ['green', 'yellow'];

function cellText(el) {
  return el?.textContent?.trim() ?? '';
}

/**
 * Ports the .html suffix that every rb-aem Sling Model appends to internal paths.
 */
function resolveHref(raw) {
  if (!raw) return '';
  if (raw.startsWith('/content') && !raw.endsWith('.html')) return `${raw}.html`;
  return raw;
}

/**
 * A tile row is one that carries a picture. Everything else in the block is a
 * parent property.
 */
function isTileRow(row) {
  return !!row.querySelector('picture, img');
}

/**
 * Reads the parent properties.
 *
 * Seven model fields produce only four cells: cta_link, cta_linkText,
 * cta_variant and cta_newTab share the `cta_` prefix, so AEM groups them into a
 * single cell. Reading by index would therefore be wrong, and wrong in a way
 * that still renders - so each value is identified by its content instead.
 */
function readParent(rows) {
  const parent = {
    title: '', subtitle: '', mask: '', ctaHref: '', ctaText: '', ctaVariant: '', ctaNewTab: false,
  };
  const plain = [];

  rows.forEach((row) => {
    const anchor = row.querySelector('a');
    if (anchor && !parent.ctaHref) {
      parent.ctaHref = anchor.getAttribute('href') || '';
      parent.ctaText = anchor.textContent.trim();
    }

    const text = cellText(row);
    const lower = text.toLowerCase();

    if (MASKS.includes(lower)) {
      parent.mask = lower;
    } else if (VARIANTS.includes(lower)) {
      parent.ctaVariant = lower;
    } else if (lower === 'true' || lower === 'false') {
      parent.ctaNewTab = lower === 'true';
    } else if (!anchor && text) {
      plain.push(text);
    }
  });

  // The cta cell groups several values, so its text can arrive concatenated.
  // Strip anything already claimed before treating the rest as title/subtitle.
  const leftovers = plain.filter((t) => t !== parent.ctaText);
  [parent.title = '', parent.subtitle = ''] = leftovers;

  return parent;
}

/**
 * Dots. One per tile, reflecting and driving scroll position.
 *
 * The source used Slick (jQuery). This is native scroll-snap instead: it keeps
 * momentum scrolling, keyboard and screen-reader behaviour that a hand-rolled
 * carousel has to reimplement, and adds no dependency - third-party JS being
 * the usual reason an EDS site loses its Lighthouse score.
 */
function buildDots(track, tiles) {
  if (tiles.length < 2) return null;

  const dots = document.createElement('div');
  dots.className = 'fourcoltiles-dots';
  dots.setAttribute('role', 'tablist');
  dots.setAttribute('aria-label', 'Choose a tile');

  tiles.forEach((tile, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'fourcoltiles-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to tile ${index + 1}`);
    dot.addEventListener('click', () => {
      track.scrollTo({ left: tile.offsetLeft - track.offsetLeft, behavior: 'smooth' });
    });
    dots.append(dot);
  });

  const setActive = () => {
    // Nearest tile to the left edge wins.
    let best = 0;
    let bestDelta = Infinity;
    tiles.forEach((tile, index) => {
      const delta = Math.abs((tile.offsetLeft - track.offsetLeft) - track.scrollLeft);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = index;
      }
    });
    [...dots.children].forEach((dot, index) => {
      dot.classList.toggle('active', index === best);
      dot.setAttribute('aria-selected', index === best ? 'true' : 'false');
    });
  };

  let frame;
  track.addEventListener('scroll', () => {
    // Scroll fires far more often than paint; coalesce to one update per frame.
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(setActive);
  }, { passive: true });

  setActive();
  return dots;
}

export default function decorate(block) {
  const rows = [...block.children];
  const tileRows = rows.filter(isTileRow);
  const parent = readParent(rows.filter((row) => !isTileRow(row)));
  const isEditMode = block.hasAttribute('data-aue-resource');

  // Shared section treatment from styles/styles.css, not block-local.
  const section = document.createElement('div');
  section.className = `rb-section ${parent.mask || 'mask-1'} bg-green`;

  const inner = document.createElement('div');
  inner.className = 'rb-section-inner';

  if (parent.title) {
    const heading = document.createElement('h2');
    heading.className = 'fourcoltiles-title';
    heading.textContent = parent.title;
    inner.append(heading);
  }

  if (parent.subtitle) {
    const desc = document.createElement('p');
    desc.className = 'fourcoltiles-subtitle';
    desc.textContent = parent.subtitle;
    inner.append(desc);
  }

  // Tiles.
  const track = document.createElement('ul');
  track.className = 'fourcoltiles-track';

  const tiles = tileRows.map((row) => {
    const li = document.createElement('li');
    li.className = 'fourcoltiles-item';
    // Carry the authoring instrumentation across, or the Universal Editor
    // cannot select, reorder or delete the tile.
    moveInstrumentation(row, li);

    const picture = row.querySelector('picture');
    if (picture) {
      const photo = document.createElement('div');
      photo.className = 'fourcoltiles-item-photo';
      photo.append(picture);
      li.append(photo);
    }

    // Whatever text the row carries is the caption.
    const caption = [...row.querySelectorAll('div')]
      .map((d) => d.textContent.trim())
      .find((t) => t);
    if (caption) {
      const name = document.createElement('div');
      name.className = 'fourcoltiles-item-name';
      const h4 = document.createElement('h4');
      h4.textContent = caption;
      name.append(h4);
      li.append(name);
    }

    track.append(li);
    return li;
  });

  if (tiles.length) {
    inner.append(track);
    const dots = buildDots(track, tiles);
    if (dots) inner.append(dots);
  }

  // CTA. Same visual treatment as the primarybutton block, which this component
  // embedded directly in React.
  if (parent.ctaHref || parent.ctaText) {
    const ctaWrap = document.createElement('div');
    ctaWrap.className = 'fourcoltiles-cta';

    const shape = document.createElement('div');
    shape.className = `fourcoltiles-cta-shape ${parent.ctaVariant || 'green'}`;

    const cta = document.createElement(parent.ctaHref ? 'a' : 'span');
    if (parent.ctaHref) {
      cta.href = resolveHref(parent.ctaHref);
      if (parent.ctaNewTab) {
        cta.target = '_blank';
        cta.rel = 'noreferrer';
      }
    }
    cta.textContent = parent.ctaText;

    shape.append(cta);
    ctaWrap.append(shape);
    inner.append(ctaWrap);
  }

  // Nothing authored. Keep the block selectable in the editor so there is a way
  // back into its properties; render nothing at all on the live site.
  if (!inner.children.length) {
    if (isEditMode) {
      const placeholder = document.createElement('p');
      placeholder.className = 'fourcoltiles-placeholder';
      placeholder.textContent = 'Four Column Tiles — add a title and some tiles';
      inner.append(placeholder);
    } else {
      block.replaceChildren();
      return;
    }
  }

  section.append(inner);
  block.replaceChildren(section);
}
