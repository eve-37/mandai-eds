import { moveInstrumentation } from '../../scripts/scripts.js';

function cellText(el) {
  return el?.textContent?.trim() ?? '';
}

/**
 * Sub Header.
 *
 * The source picks between two background images in JS, re-reading a resize
 * flag on every render. Here both are handed to CSS via custom properties and
 * a media query chooses, so there is no layout dependency on JS having run and
 * no flash of the wrong image.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const isEditMode = block.hasAttribute('data-aue-resource');

  // The two background rows are the ones carrying a picture; the rest is text.
  const imageRows = rows.filter((row) => row.querySelector('picture, img'));
  const textRows = rows.filter((row) => !row.querySelector('picture, img'));

  const [desktop, mobile] = imageRows.map((row) => {
    const img = row.querySelector('img');
    return img?.getAttribute('src') || '';
  });

  const [title, desc] = textRows.map(cellText);

  if (!title && !desc && !desktop) {
    if (isEditMode) {
      const placeholder = document.createElement('p');
      placeholder.className = 'subheader-placeholder';
      placeholder.textContent = 'Sub Header — add a title and a background';
      block.replaceChildren(placeholder);
    } else {
      block.replaceChildren();
    }
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'subheader-wrapper';
  // Mobile falls back to the desktop image when only one is supplied.
  if (desktop) wrapper.style.setProperty('--subheader-bg-desktop', `url("${desktop}")`);
  if (mobile || desktop) wrapper.style.setProperty('--subheader-bg-mobile', `url("${mobile || desktop}")`);

  const content = document.createElement('div');
  content.className = 'subheader-content';

  if (title) {
    const h2 = document.createElement('h2');
    h2.className = 'subheader-heading';
    h2.textContent = title;
    if (textRows[0]) moveInstrumentation(textRows[0], h2);
    content.append(h2);
  }

  if (desc) {
    const p = document.createElement('p');
    p.className = 'subheader-desc';
    p.textContent = desc;
    if (textRows[1]) moveInstrumentation(textRows[1], p);
    content.append(p);
  }

  wrapper.append(content);
  block.replaceChildren(wrapper);
}
