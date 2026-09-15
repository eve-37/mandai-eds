/**
 * WRS Pull Quote
 *
 * Ported from wrs-aem/.../components/commons/richtext - specifically the two
 * `showTypes` branches (`inlineQuote`, `haftPage`) of the `oneColumn` layout
 * that carry real, distinct CSS in the deployed bundle:
 *
 *   <div class="blockquote" data-sly-test="showTypes=='inlineQuote' && ...">
 *     <blockquote>&ldquo; ${properties.oneColumnText @ context='html'} &rdquo;</blockquote>
 *   </div>
 *   <div class="blockquote haftpage" data-sly-test="showTypes=='haftPage' && ...">
 *     <blockquote>&ldquo; ${properties.oneColumnText @ context='html'} &rdquo;</blockquote>
 *   </div>
 *
 * See docs/wrs-migration-notes.md#richtext for the full seven/eight-layout
 * breakdown of this source component and why only this one slice became a
 * block. In short: `richtext` is not one component, it is a `richtextOptions`
 * switch (1/2/3 columns, 1-image, 2-image) crossed with a `showTypes` switch
 * that only applies when richtextOptions=='oneColumn'. Every column-count
 * layout is default content in the boilerplate's own `columns` block - it
 * needs no code here, the same call `columncontrol`'s entry already made for
 * plain multi-column text. Of showTypes' four values, `default` is exactly
 * what plain default content already produces, and `disclaimer` has NO
 * confirmed distinguishing CSS anywhere in this bundle (see the notes entry -
 * the one piece of evidence, a stale LESS checkout, styles it identically to
 * plain body copy). Only `inlineQuote`/`haftPage` render something default
 * content cannot: a styled, quote-mark-wrapped <blockquote>. That is what
 * this block is for, and ONLY that - not a general-purpose rich text block.
 *
 * The curly quote marks are rendered as literal text nodes around the
 * content, exactly as the source's `&ldquo; ... &rdquo;` literal markup does
 * - not a CSS ::before/::after pair - because the ground rule is to port what
 * the source does, even though wrapping already-possibly-block-level richtext
 * HTML in inline quote characters like this is an odd thing for the source to
 * do. It is odd in AEM too; ported as-is.
 *
 * `gridSmall` ("Using in accordion") is NOT ported to this block. It narrows
 * the component's own outer wrapper width for use inside accordion panels;
 * `blocks/wrs-accordion-tabs/` already constrains its own panel width
 * independently, so a pull quote placed inside a tab panel is already
 * width-constrained by the container it sits in, without needing a second,
 * easily-desynced width toggle here. Flagged in the notes for re-check once
 * authored inside a real accordion tab.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import { renderEmpty } from '../../scripts/rb-helpers.js';

const VARIANTS = ['quote', 'halfPage'];

/**
 * Joins a positionally-read richtext cell's children back into HTML. A
 * single child's innerHTML is enough; more than one has to keep each
 * element's own tag (outerHTML) or the paragraph boundaries between them
 * collapse - the same technique wrs-feature-carousel's joinRichText() and
 * wrs-conservation-banner's content reader both use.
 */
function joinRichText(cell) {
  const els = [...(cell?.children || [])];
  if (els.length === 1) return (els[0].innerHTML || els[0].textContent || '').trim();
  if (els.length > 1) return els.map((el) => el.outerHTML || el.textContent).join('');
  return (cell?.textContent || '').trim();
}

export default function decorate(block) {
  const [textRow, variantRow] = [...block.children];

  const html = joinRichText(textRow);
  const variantText = (variantRow?.textContent || '').trim();
  const variant = VARIANTS.includes(variantText) ? variantText : 'quote';

  if (!html) {
    renderEmpty(block, 'WRS Pull Quote — add quote text');
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = `wrs-pull-quote-inner${variant === 'halfPage' ? ' half-page' : ''}`;

  const blockquote = document.createElement('blockquote');
  blockquote.append(
    document.createTextNode('“ '),
    ...(() => {
      const fragmentHolder = document.createElement('div');
      fragmentHolder.innerHTML = html;
      return [...fragmentHolder.childNodes];
    })(),
    document.createTextNode(' ”'),
  );

  wrapper.append(blockquote);
  moveInstrumentation(textRow, wrapper);
  block.replaceChildren(wrapper);
}
