import { moveInstrumentation } from '../../scripts/scripts.js';

const MASKS = ['mask-1', 'mask-2'];

function cellText(el) {
  return el?.textContent?.trim() ?? '';
}

/**
 * One Column Feature - text beside an image, image first on desktop.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const isEditMode = block.hasAttribute('data-aue-resource');

  const imageRow = rows.find((row) => row.querySelector('picture, img'));
  const rest = rows.filter((row) => row !== imageRow);

  let mask = '';
  const texts = [];
  rest.forEach((row) => {
    const text = cellText(row);
    if (MASKS.includes(text.toLowerCase())) mask = text.toLowerCase();
    else if (text) texts.push({ row, text });
  });

  const [title, desc] = texts;

  if (!imageRow && !title) {
    if (isEditMode) {
      const placeholder = document.createElement('p');
      placeholder.className = 'one-column-feature-placeholder';
      placeholder.textContent = 'One Column Feature — add a title and an image';
      block.replaceChildren(placeholder);
    } else {
      block.replaceChildren();
    }
    return;
  }

  const section = document.createElement('div');
  section.className = `rb-section ${mask || 'mask-1'} bg-beige`;

  const inner = document.createElement('div');
  inner.className = 'rb-section-inner one-column-feature-layout';

  const copy = document.createElement('div');
  copy.className = 'one-column-feature-desc';
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title.text;
    moveInstrumentation(title.row, h2);
    copy.append(h2);
  }
  if (desc) {
    const p = document.createElement('p');
    p.textContent = desc.text;
    moveInstrumentation(desc.row, p);
    copy.append(p);
  }

  const figure = document.createElement('div');
  figure.className = 'one-column-feature-image';
  const picture = imageRow?.querySelector('picture');
  if (picture) {
    figure.append(picture);
    moveInstrumentation(imageRow, figure);
  }

  // Copy first in the DOM so it reads first on mobile, where the source puts
  // the text above the image; CSS reorders it on desktop.
  inner.append(copy, figure);
  section.append(inner);
  block.replaceChildren(section);
}
