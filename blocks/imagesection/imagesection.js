import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Image Section.
 *
 * Named `imagesection`, not `image`: the boilerplate already ships an `image`
 * default-content component and the ids would collide. The AEM component is a
 * plain image wrapped in the masked section band, which is the only reason it
 * needs a block rather than default content.
 */
export default function decorate(block) {
  const picture = block.querySelector('picture');
  const isEditMode = block.hasAttribute('data-aue-resource');

  if (!picture) {
    if (isEditMode) {
      const placeholder = document.createElement('p');
      placeholder.className = 'imagesection-placeholder';
      placeholder.textContent = 'Image Section — pick an image';
      block.replaceChildren(placeholder);
    } else {
      block.replaceChildren();
    }
    return;
  }

  const section = document.createElement('div');
  section.className = 'rb-section mask-1';

  const inner = document.createElement('div');
  inner.className = 'rb-section-inner';

  const figure = document.createElement('div');
  figure.className = 'imagesection-figure';

  const sourceRow = picture.closest('div[data-aue-prop], div');
  figure.append(picture);
  if (sourceRow) moveInstrumentation(sourceRow, figure);

  inner.append(figure);
  section.append(inner);
  block.replaceChildren(section);
}
