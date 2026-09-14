import { moveInstrumentation } from '../../scripts/scripts.js';

const VARIANTS = ['green', 'yellow'];
const POSITIONS = ['left', 'center', 'right'];

/**
 * Reads one cell's trimmed text.
 */
function cellText(row) {
  return row?.textContent?.trim() ?? '';
}

/**
 * Ports PrimaryButtonCompModel.getLink(): an internal path gets `.html`
 * appended, unless it already ends that way. External URLs are untouched.
 */
function resolveHref(raw) {
  if (!raw) return '';
  if (raw.startsWith('/content') && !raw.endsWith('.html')) return `${raw}.html`;
  return raw;
}

/**
 * Pulls the fields out of the authored rows.
 *
 * Deliberately NOT positional. The model declares six fields but produces only
 * four cells: `link`, `linkText` and `linkTitle` share a prefix, so AEM renders
 * them as a single anchor rather than three rows. Counting fields and indexing
 * rows would therefore read every value from the wrong cell. Each value is
 * identified by what it contains instead, so an unexpected row count costs one
 * field rather than all of them.
 */
function readFields(rows) {
  const fields = {
    link: '',
    text: '',
    title: '',
    variant: '',
    position: '',
    linkNewTab: false,
  };

  rows.forEach((row) => {
    const anchor = row.querySelector('a');
    const text = cellText(row);
    const lower = text.toLowerCase();

    if (anchor && !fields.link) {
      // link, linkText and linkTitle all arrive on this one element.
      fields.link = anchor.getAttribute('href') || '';
      fields.text = anchor.textContent.trim();
      fields.title = anchor.getAttribute('title') || '';
    } else if (!fields.link && (text.startsWith('/content') || /^https?:\/\//.test(text))) {
      // Unresolved pathfield: AEM did not render it as an anchor.
      fields.link = text;
    } else if (!fields.variant && VARIANTS.includes(lower)) {
      fields.variant = lower;
    } else if (!fields.position && POSITIONS.includes(lower)) {
      fields.position = lower;
    } else if (lower === 'true' || lower === 'false') {
      fields.linkNewTab = lower === 'true';
    } else if (text && !fields.text) {
      // CTA text that did not come through on the anchor.
      fields.text = text;
    }
  });

  return fields;
}

export default function decorate(block) {
  const rows = [...block.children];
  const fields = readFields(rows);
  const isEditMode = block.hasAttribute('data-aue-resource');

  // Defaults match the React component: centred, and green rather than unstyled.
  const position = fields.position || 'center';
  const variant = fields.variant || 'green';
  const href = resolveHref(fields.link);

  // Nothing authored yet. In the Universal Editor render a placeholder so the
  // block can still be selected - a block with no DOM cannot be clicked, which
  // leaves the author no route back into its properties. On the live site it
  // renders nothing at all.
  if (!fields.text && !href) {
    if (isEditMode) {
      const placeholder = document.createElement('p');
      placeholder.className = 'rb-placeholder';
      placeholder.textContent = 'Secondary Button — add a CTA name and link';
      block.replaceChildren(placeholder);
    } else {
      block.replaceChildren();
    }
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = `secondary-button-container ${position}`;

  const shape = document.createElement('div');
  shape.className = `rb-cta rb-cta-narrow ${variant}`;

  // A link with no href is not a link. Fall back to a span so assistive tech is
  // not told this is actionable when it goes nowhere.
  const cta = document.createElement(href ? 'a' : 'span');
  if (href) {
    cta.href = href;
    if (fields.linkNewTab) {
      cta.target = '_blank';
      cta.rel = 'noreferrer';
    }
  }
  if (fields.title) cta.title = fields.title;
  cta.textContent = fields.text;

  shape.append(cta);
  wrapper.append(shape);

  // Carry the authoring instrumentation onto the element that replaces the
  // first row, or the Universal Editor loses its overlay and the block becomes
  // uneditable in place.
  if (rows[0]) moveInstrumentation(rows[0], cta);

  block.replaceChildren(wrapper);
}
