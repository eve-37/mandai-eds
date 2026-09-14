import { moveInstrumentation } from '../../scripts/scripts.js';

function cellText(el) {
  return el?.textContent?.trim() ?? '';
}

/**
 * Testimonial - a heading plus a carousel of quotes.
 *
 * Same scroll-snap approach as four-column-tiles rather than Slick, for the same
 * reason: no jQuery, and native momentum, keyboard and screen-reader behaviour.
 * One quote at a time at every breakpoint, which is what the source did.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const isEditMode = block.hasAttribute('data-aue-resource');

  // A testimony row has two cells (message, name); the parent title has one.
  const itemRows = rows.filter((row) => row.children.length >= 2);
  const titleRow = rows.find((row) => row.children.length === 1);
  const title = cellText(titleRow);

  if (!title && !itemRows.length) {
    if (isEditMode) {
      const placeholder = document.createElement('p');
      placeholder.className = 'testimonial-placeholder';
      placeholder.textContent = 'Testimonial — add a title and some quotes';
      block.replaceChildren(placeholder);
    } else {
      block.replaceChildren();
    }
    return;
  }

  const section = document.createElement('div');
  section.className = 'rb-section mask-1 bg-dark-green';

  const inner = document.createElement('div');
  inner.className = 'rb-section-inner';

  if (title) {
    const h2 = document.createElement('h2');
    h2.className = 'testimonial-heading';
    h2.textContent = title;
    if (titleRow) moveInstrumentation(titleRow, h2);
    inner.append(h2);
  }

  if (itemRows.length) {
    const track = document.createElement('ul');
    track.className = 'testimonial-track';

    itemRows.forEach((row) => {
      const [messageCell, nameCell] = row.children;
      const li = document.createElement('li');
      li.className = 'testimonial-item';
      moveInstrumentation(row, li);

      const quote = document.createElement('blockquote');
      quote.className = 'testimonial-quote';
      quote.textContent = cellText(messageCell);

      const cite = document.createElement('cite');
      cite.className = 'testimonial-user';
      cite.textContent = cellText(nameCell);

      li.append(quote, cite);
      track.append(li);
    });

    inner.append(track);
  }

  section.append(inner);
  block.replaceChildren(section);
}
