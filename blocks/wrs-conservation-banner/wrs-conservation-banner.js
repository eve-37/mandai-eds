/**
 * WRS Conservation Banner
 *
 * Ported from wrs-aem/.../components/structure/footer - specifically the
 * `conservationBannerTab` panel of the footer dialog, which the footer HTL
 * renders as a `.md.md-short-masthead-component` block guarded by
 * `data-sly-test="${!footer.hideConservation}"`.
 *
 * This is the ONLY part of the footer component migrated as a block. The
 * footer's other five tabs (top section, main section, legal section, help
 * button) are site furniture or hierarchy-derived config, not a self-contained
 * content panel - see `docs/wrs-migration-notes.md#footer` for the full
 * decomposition and what belongs to the `/footer` document instead.
 *
 * IMPORTANT CAVEAT even for this piece: `FooterModel.processFooterInherited()`
 * (the default path, used whenever the page has not set
 * `cancelFooterInheritance`) reads every `conservation*` property via
 * `HierarchyNodeInheritanceValueMap` off the nearest ancestor page (up to 5
 * levels up) that has a `footer` child resource - the same mechanism used for
 * the address and opening-hours panels. So in the source, an author fills
 * these fields in ONCE on a high-level page and every descendant page
 * inherits them automatically; only a page with `cancelFooterInheritance`
 * checked reads its own properties directly (`processCancelFooterInherited`).
 * EDS has no equivalent cascade: a page either has this block placed on it or
 * it does not. That is a real behaviour change, not just a field-shape one -
 * every page that should show the banner needs it placed explicitly (or some
 * other authoring convention a human decides on). Flagged in the notes.
 *
 * `hideConservation` (a checkbox in the source, defaulting the banner to
 * shown) is dropped from the model entirely: in EDS an author simply does not
 * place the block on a page that should not show it, so a separate
 * "hide" toggle would be a redundant, easily-desynced way to say the same
 * thing the block's presence/absence already says.
 *
 * `pageProperties.hideInMFA` in the HTL (`... ${pageProperties.hideInMFA ?
 * 'hide' : ''}`) is a page-property, MFA-user-agent condition from
 * `PagePropertiesInheritance`, not a footer dialog field - out of scope for
 * this component's own fields and not ported.
 *
 * Cell model - 9 fields collapse to 4 cells:
 *   content_title, content_description, content_gradient -> "content" cell
 *     (grouped: all three describe the text panel painted over the banner -
 *     heading, copy, and whether the radial gradient behind it is on).
 *   bg_desktop, bg_mobile -> "bg" cell (the two source images: desktop cover
 *     picture and its mobile swap), same bg_desktop/bg_mobile shape and
 *     backgroundUrl() rewrite already proven in one-column-banner.
 *   tagImage, tagImageAlt -> collapses to ONE cell via the imageAlt suffix
 *     rule (source: conservationTagImage + conservationTagAltText, the small
 *     badge/tag graphic inside the banner-box).
 *   cta_link, cta_linkText -> "cta" cell (source: conservationCtaLink +
 *     conservationCtaText). No variant/newTab fields exist in the source
 *     dialog for this CTA - the HTL anchor carries no target attribute - so
 *     only the two fields the dialog actually has are modelled.
 *
 * The CTA is NOT built with the shared `buildCta()`/`.rb-cta` torn-edge
 * button used elsewhere in this repo. The source renders a plain pill button
 * (`.md-button-big`), visually unrelated to the Ranger Buddies CTA shape, and
 * the ground rule is to port what the source does, not what looks consistent
 * with sibling blocks. `readCta()` is still reused for the grouped-cell
 * reading (it tolerates the missing variant/newTab fields, defaulting them
 * unused), but the rendered markup and its CSS are this component's own.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  cellText, cellSlots, backgroundUrl, readCta, renderEmpty,
} from '../../scripts/rb-helpers.js';

export default function decorate(block) {
  // content_, bg_, tag(Image/ImageAlt), cta_ - in that model order.
  const [contentRow, bgRow, tagRow, ctaRow] = [...block.children];

  /*
   * content_title, content_description, content_gradient are one grouped
   * cell with three sub-fields, and content_description is richtext mixed in
   * with two plain fields. Read the same way wrs-accordion-tabs' readTab()
   * reads its tab_name/tab_title/tab_description group: positionally off the
   * cell's own direct children (one per field, in field order, present even
   * when blank), not via cellValues()/<p>-text matching - cellValues()
   * flattens to plain text, which would strip any bold/links an author puts
   * in the rich description.
   *
   * Unlike that precedent, richtext here is the MIDDLE field, not the last -
   * content_gradient follows it. A rich description with more than one
   * paragraph renders as more than one sibling child, which would shift a
   * fixed-index read of the trailing boolean. So the boundary is found from
   * both ends instead: the first child is always the title, the last child
   * is always the gradient marker (a bare "true"/"false" with no markup,
   * never blank because it is a checkbox), and every child in between -
   * however many there are - is the description.
   */
  const contentChildren = [...(contentRow?.children || [])];
  // content_title read via cellSlots(), not the raw first child: same
  // family of fix as the other blocks in this run - if content_title is
  // blank the slot must stay blank rather than being read as whatever
  // renders first, see cellSlots()'s own docblock for the known-vs-assumed
  // caveat around whether AEM preserves that slot at all.
  const [title = ''] = cellSlots(contentRow);
  const lastIndex = contentChildren.length - 1;
  const gradientEl = lastIndex > 0 ? contentChildren[lastIndex] : null;
  const gradientText = cellText(gradientEl).toLowerCase();
  const hasGradientMarker = gradientText === 'true' || gradientText === 'false';
  const gradientOn = hasGradientMarker && gradientText === 'true';
  const descriptionEls = hasGradientMarker
    ? contentChildren.slice(1, lastIndex)
    : contentChildren.slice(1);
  const descriptionHtml = descriptionEls.length === 1
    ? (descriptionEls[0].innerHTML || '').trim()
    : descriptionEls.map((el) => el.outerHTML).join('');

  const [desktopImg, mobileImg] = [...(bgRow?.querySelectorAll('img') || [])];
  const desktop = backgroundUrl(desktopImg, 2000);
  const mobile = backgroundUrl(mobileImg, 750);

  const tagPicture = tagRow?.querySelector('picture') || null;

  const cta = readCta(ctaRow);

  if (!title && !descriptionHtml && !desktop && !tagPicture && !cta) {
    renderEmpty(block, 'WRS Conservation Banner — add a title, image or CTA');
    return;
  }

  const root = document.createElement('div');
  root.className = 'wrs-conservation-banner-inner';

  const cover = document.createElement('div');
  cover.className = 'wrs-conservation-banner-cover';
  if (desktop) cover.style.setProperty('--conservation-bg-desktop', `url("${desktop}")`);
  if (mobile || desktop) {
    cover.style.setProperty('--conservation-bg-mobile', `url("${mobile || desktop}")`);
  }
  root.append(cover);

  const content = document.createElement('div');
  content.className = `wrs-conservation-banner-content${gradientOn ? ' gradient' : ''}`;
  moveInstrumentation(contentRow, content);

  if (title) {
    const h2 = document.createElement('h2');
    h2.className = 'wrs-conservation-banner-title';
    h2.textContent = title;
    content.append(h2);
  }

  if (tagPicture) {
    const tag = document.createElement('div');
    tag.className = 'wrs-conservation-banner-tag';
    tag.append(tagPicture);
    moveInstrumentation(tagRow, tag);
    content.append(tag);
  }

  if (descriptionHtml) {
    const descWrap = document.createElement('div');
    descWrap.className = 'wrs-conservation-banner-desc';
    descWrap.innerHTML = descriptionHtml;
    content.append(descWrap);
  }

  if (cta?.href && cta?.text) {
    const anchor = document.createElement('a');
    anchor.href = cta.href;
    anchor.className = 'wrs-conservation-banner-cta-link';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wrs-conservation-banner-cta';
    button.textContent = cta.text;
    anchor.append(button);
    moveInstrumentation(ctaRow, anchor);
    content.append(anchor);
  }

  root.append(content);
  block.replaceChildren(root);
}
