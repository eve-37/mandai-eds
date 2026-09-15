import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  cellText, renderEmpty, splitRows, buildDots,
} from '../../scripts/rb-helpers.js';

/** backgroundColor, ariaLabel - see _wrs-quote-carousel.json. */
const PARENT_CELLS = 2;

const BG_COLORS = ['bg-base', 'bg-sap-white'];

const PREFIX = 'wrs-quote-carousel';

/**
 * WRS Quote Carousel
 *
 * Ported from wrs/components/mandai/mandaiquotecarousel (`md-quote-carousel`).
 * The source shows exactly one quote at a time at every breakpoint (Slick,
 * `slides-to-show-desktop/tablet/mobile="1"`, prev/next arrows, dots) - ported
 * to this repo's shared `.rb-track`/`.rb-dots` scroll-snap primitives (see
 * buildDots() in rb-helpers.js), the same substitution made for
 * wrs-feature-carousel and wrs-experience-carousel. `.rb-track`'s default
 * peek (grid-auto-columns: 100% / 1.1) is overridden to a true 100% here,
 * because the source never shows a sliver of the next quote - a peek would be
 * a divergence, not a detail.
 *
 * `quote` is rendered `${item.quote @context='html'}` in the source HTL even
 * though the dialog widget is a plain textarea, not an RTE - authors could
 * type markup by hand and have it rendered raw. Modelled here as `richtext`
 * (the closest Universal Editor field with an HTML value) and read via
 * innerHTML so any authored markup is preserved, matching the source's own
 * html-context rendering rather than downgrading it to plain text.
 *
 * NOT the same block as blocks/testimonial/: that block's model authors a
 * `title` and always wraps its quotes in a forced dark-green banded section
 * with no dots (a deliberate design choice recorded in its own docblock).
 * This component's dialog has no title field at all, but does author a
 * per-instance background colour variant and an accessibility label that
 * testimonial's model has neither of - see the reuse decision recorded in
 * docs/wrs-migration-notes.md.
 */
export default function decorate(block) {
  const isEditMode = block.hasAttribute('data-aue-resource');
  const { parentRows, childRows } = splitRows(block, PARENT_CELLS);
  const [colorRow, ariaLabelRow] = parentRows;

  const color = cellText(colorRow);
  const ariaLabel = cellText(ariaLabelRow);

  if (!childRows.length) {
    renderEmpty(block, 'WRS Quote Carousel — add a quote');
    return;
  }

  const items = childRows.map((row) => {
    const [quoteCell, nameCell] = row.children;
    const quoteHtml = (quoteCell?.innerHTML || quoteCell?.textContent || '').trim();
    const name = cellText(nameCell);
    return { row, quoteHtml, name };
  });

  // A blank quote item renders no content, but stays in the list - its
  // position is what keeps every other item's instrumentation lined up with
  // its own row (splitRows() already keeps rows stable; dropping items here
  // would just be pointless, not unsafe, but keeping them matches the
  // testimonial precedent for a blank-item carousel).
  if (!isEditMode && !items.some((item) => item.quoteHtml || item.name)) {
    block.replaceChildren();
    return;
  }

  block.classList.add(BG_COLORS.includes(color) ? color : 'bg-base');

  const wrap = document.createElement('div');
  wrap.className = `${PREFIX}-wrap`;

  const track = document.createElement('ul');
  track.className = `${PREFIX}-track rb-track`;
  if (ariaLabel) track.setAttribute('aria-label', ariaLabel);

  const lis = items.map(({ row, quoteHtml, name }) => {
    const li = document.createElement('li');
    li.className = `${PREFIX}-item rb-track-item`;
    moveInstrumentation(row, li);

    const message = document.createElement('div');
    message.className = `${PREFIX}-message`;

    if (quoteHtml) {
      const quote = document.createElement('h4');
      quote.className = `${PREFIX}-quote`;
      quote.innerHTML = quoteHtml;
      message.append(quote);
    }

    if (name) {
      const nameEl = document.createElement('div');
      nameEl.className = `${PREFIX}-name`;
      nameEl.textContent = name;
      message.append(nameEl);
    }

    li.append(message);
    track.append(li);
    return li;
  });

  wrap.append(track);

  const dots = buildDots(track, lis, PREFIX);
  if (dots) wrap.append(dots);

  block.replaceChildren(wrap);
}
