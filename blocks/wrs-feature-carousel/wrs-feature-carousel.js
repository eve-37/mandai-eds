/**
 * WRS Feature Carousel
 *
 * Ported from wrs-aem/.../components/mandai/mandaifeaturecarousel
 * (`md-feature-carousel`). The ONLY multi-file HTL component in this run:
 *
 *   mandaifeaturecarousel.html
 *     -> data-sly-use MandaiFeatureCarouselModel (reads `backgroundColor`)
 *     -> if backgroundColor == 'bgImage':  calls image-carousel-template.html
 *        else:                             calls color-carousel-template.html
 *          (mutually exclusive - exactly one of the two ever runs)
 *   image-carousel-template.html / color-carousel-template.html
 *     -> byte-identical apart from THREE things: the root class
 *        ('bg-custom' vs `${model.backgroundColor}`), the image-variant's
 *        `data-background-change`/`data-src`/`data-mobile-src` attributes
 *        (wired to background-change.js, which lives in the
 *        `backgroundsection` bundle and was read there, read-only, per the
 *        task), and nothing else - same heading, same description, same
 *        author-only warning, same carousel markup, same "view all" CTA.
 *     -> each calls slide-template.html ONCE per carousel item (wrapped in an
 *        <a> only when the item has a slideLink)
 *   slide-template.html
 *     -> renders one image + optional title/description card. Its own two
 *        <img> tags are NOT a desktop/mobile duplicate - they are the HTL
 *        idiom for an optional `alt` attribute (`image && alt` vs
 *        `image && !alt`), mutually exclusive `data-sly-test`s, so only one
 *        ever renders. There is no desktop/mobile double-render anywhere in
 *        this component: the "two calls" the survey flagged are the ONE call
 *        made from each of the two mutually-exclusive top-level branches, not
 *        two calls within a single render. Confirmed by reading all four
 *        files; nothing here needed a duplicate-DOM fix.
 *
 * VARIANT: one block with a `bg_color` field, not two blocks
 * -------------------------------------------------------------
 * The dialog itself drives the choice with a single `bgSelect` field (four
 * fixed values plus "Image Upload"); the two HTL templates differ only in
 * three details listed above. Splitting into two blocks would duplicate the
 * heading/description/carousel/CTA markup and cell model for no benefit, and
 * would let an author configure carousel items twice for what the source
 * treats as one component with one background choice. A `select` field is
 * the direct port of `bgSelect`, so `bg_color === 'bgImage'` is read the same
 * way `carousel.backgroundColor=='bgImage'` was in the source.
 *
 * THE AUTHOR-ONLY WARNING - not ported as markup
 * -------------------------------------------------------------
 * `<p data-sly-test="${wcmmode.edit && model.cItems.size > 5}" ...>More than
 * 5 tiles will be shown</p>` never rendered to a visitor in the source - it
 * is `wcmmode.edit`-gated author guidance, not content. There is no field
 * this belongs in (it is not authored, it is computed from item count) and
 * EDS/UE has no per-render "am I in author preview with >5 items" hook to
 * reproduce it exactly. The closest faithful equivalent is static authoring
 * guidance in the Universal Editor's properties rail: `carouselItems`'s
 * container filter carries a "description" a human reads while adding items
 * (see _wrs-feature-carousel.json's `wrsfeaturecarouselitem` field
 * descriptions and this block's own definition `description` below) rather
 * than inventing a runtime item-count check that has no source equivalent to
 * verify against.
 *
 * SLICK -> NATIVE SCROLL-SNAP
 * -------------------------------------------------------------
 * The source drives 2-up desktop/tablet, 1-up mobile with Slick
 * (`data-md-carousel`, `slides-to-show-desktop="2"` etc, `md-carousel.js`).
 * Ported using this repo's shared `.rb-track`/`.rb-dots` scroll-snap
 * primitives (see buildDots() in rb-helpers.js), the same substitution
 * `wrs-experience-carousel` and `one-column-banner-carousel` already made -
 * no jQuery dependency, native momentum/keyboard/screen-reader scrolling.
 * `wrs-feature-carousel.css` sets the 2-up/1-up column widths itself.
 *
 * BACKGROUND-CHANGE.JS -> CSS custom properties + media query
 * -------------------------------------------------------------
 * `background-change.js` (read in the `backgroundsection` bundle, not this
 * one - it is referenced here but lives there) swaps `background-image`
 * between `data-src`/`data-mobile-src` on load and on resize, gated on
 * `Site.isMobile()`. Same substitution `one-column-banner` already made for
 * an identical desktop/mobile background pair: the two URLs are read once
 * here into `--wfc-bg-desktop`/`--wfc-bg-mobile` custom properties, and CSS
 * media queries pick the right one - no resize listener, no FOUC swap.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  cellText, cellValues, cellSlots, backgroundUrl, renderEmpty, splitRows, buildDots,
} from '../../scripts/rb-helpers.js';

const PREFIX = 'wrs-feature-carousel';

/** bg_*, heading_*, cta_*, anchorLink - see _wrs-feature-carousel.json. */
const PARENT_CELLS = 4;

const BG_COLORS = ['bg-dark-green', 'base', 'bg-sap-white', 'bgImage'];

/**
 * Joins the "rest" elements of a positionally-read richtext field into HTML.
 * A single element's innerHTML is enough; more than one has to keep each
 * element's own tag (outerHTML) or the paragraph boundaries between them
 * collapse - the same technique four-column-tiles' readCard() and
 * wrs-conservation-banner's content reader both use.
 */
function joinRichText(els) {
  if (els.length === 1) return (els[0].innerHTML || els[0].textContent || '').trim();
  if (els.length > 1) return els.map((el) => el.outerHTML || el.textContent).join('');
  return '';
}

/**
 * Reads the bg_color / bg_desktop / bg_mobile cell.
 *
 * Matched by content, not position, because the three sub-fields are told
 * apart cleanly: the colour is the only bare text value in the cell (a
 * select rendering one of BG_COLORS, or nothing when unset - matching the
 * source's own unset default, which renders no class at all), and the two
 * images are `<picture>` elements read in field-declaration order
 * (desktop first, mobile second) - the same technique one-column-banner's
 * bg_ cell already uses.
 */
function readBackground(cell) {
  const bg = { color: '', desktop: null, mobile: null };
  if (!cell) return bg;

  const images = [];
  [...cell.children].forEach((child) => {
    const picture = child.querySelector('picture');
    if (picture) {
      images.push(picture);
      return;
    }
    const text = child.textContent.trim();
    if (BG_COLORS.includes(text)) bg.color = text;
  });
  [bg.desktop, bg.mobile] = images;
  return bg;
}

/**
 * Reads the heading_title / heading_ariaLabel / heading_description cell.
 *
 * heading_title and heading_ariaLabel are both freeform plain text with no
 * distinguishing vocabulary (the source dialog's own field description says
 * ariaLabel is normally only authored when heading is blank), so - exactly
 * like wrs-experience-carousel's 8-colour read and its readCard() title -
 * they are read POSITIONALLY, first-declared field first. heading_description
 * is richtext and always last, so everything after the first two children is
 * joined as its HTML, the same "rest is the richtext" technique readCard()
 * uses.
 *
 * Read via `cellSlots()` for the title/ariaLabel pair, not `cellValues()`:
 * both are freeform text with nothing to disambiguate them by content, so a
 * blank heading_title with a filled heading_ariaLabel must not shift the
 * aria label into the title slot. This fixes the shift IF AEM emits an
 * empty `<p></p>` for the blank field; if it omits the field's paragraph
 * entirely instead, position is unrecoverable from the markup regardless of
 * how it's read - see cellSlots()'s own docblock for what is known vs
 * assumed here, and re-verify once this block has real authored markup.
 */
function readHeading(cell) {
  const heading = { title: '', ariaLabel: '', descriptionHtml: '' };
  if (!cell) return heading;

  const [title = '', ariaLabel = ''] = cellSlots(cell);
  heading.title = title;
  heading.ariaLabel = ariaLabel;
  const children = [...cell.children];
  heading.descriptionHtml = joinRichText(children.slice(2));
  return heading;
}

/** Reads the cta_link / cta_linkText cell (the "view all" CTA). */
function readViewAllCta(cell) {
  if (!cell) return null;
  const anchor = cell.querySelector('a');
  if (!anchor) return null;
  return { href: anchor.getAttribute('href') || '', text: anchor.textContent.trim() };
}

/**
 * Reads one carousel item's 4 cells: image(+imageAlt), content_title/
 * content_description, cta_link, display_gradient/display_hide.
 *
 * content_title is read via `cellSlots()` (not `cellValues()`/positional
 * `.children` indexing), so a blank title does not pull the description's
 * first paragraph into the title slot - see cellSlots()'s docblock for the
 * known-vs-assumed caveat.
 */
function readItem(row) {
  const [imageCell, contentCell, ctaCell, displayCell] = [...(row?.children ?? [])];

  const picture = imageCell?.querySelector('picture') ?? null;

  const [title = ''] = cellSlots(contentCell);
  const contentChildren = [...(contentCell?.children ?? [])];
  const descriptionHtml = joinRichText(contentChildren.slice(1));

  const href = ctaCell?.querySelector('a')?.getAttribute('href') || '';

  const displayValues = cellValues(displayCell).map((v) => v.toLowerCase());
  const gradient = displayValues.includes('text-gradient');
  const hide = displayValues.includes('true');

  return {
    picture, title, descriptionHtml, href, gradient, hide,
  };
}

export default function decorate(block) {
  const { parentRows, childRows } = splitRows(block, PARENT_CELLS);
  const [bgRow, headingRow, ctaRow, anchorRow] = parentRows;
  const isEditMode = block.hasAttribute('data-aue-resource');

  const bg = readBackground(bgRow);
  const heading = readHeading(headingRow);
  const viewAllCta = readViewAllCta(ctaRow);
  const anchorLink = cellText(anchorRow);

  // Items with display_hide checked are dropped entirely - MandaiFeatureCarouselModel
  // does the same (`cItems.removeIf(cItem -> cItem.getHideItem().equals(true))`),
  // matching the dialog's own field description ("hidden when viewed as published").
  const allItems = childRows.map((row) => ({ row, item: readItem(row) }));
  const visibleItems = allItems.filter(({ item }) => !item.hide);

  if (!heading.title && !heading.descriptionHtml && !visibleItems.length) {
    renderEmpty(block, 'WRS Feature Carousel — add a heading and some carousel items');
    return;
  }

  const isImageVariant = bg.color === 'bgImage';

  if (anchorLink) block.id = anchorLink;
  // Matches the source exactly: an unset backgroundColor renders no modifier
  // class at all (neither variant forces one), so the empty/default option
  // is left un-added rather than invented as a fake "none" class.
  if (isImageVariant) block.classList.add('bg-custom');
  else if (bg.color) block.classList.add(bg.color);

  if (isImageVariant) {
    const desktopUrl = backgroundUrl(bg.desktop, 2000);
    const mobileUrl = backgroundUrl(bg.mobile, 750);
    if (desktopUrl) block.style.setProperty('--wfc-bg-desktop', `url("${desktopUrl}")`);
    if (mobileUrl || desktopUrl) {
      block.style.setProperty('--wfc-bg-mobile', `url("${mobileUrl || desktopUrl}")`);
    }
  }

  const grid = document.createElement('div');
  grid.className = `${PREFIX}-grid`;

  if (heading.title || heading.ariaLabel || heading.descriptionHtml) {
    // Title, aria label and description all sit in the source's own single
    // heading_ cell, so this is the one head element that carries the
    // group's instrumentation - never `block`, which also holds the track.
    moveInstrumentation(headingRow, grid);
  }

  if (heading.title) {
    const h2 = document.createElement('h2');
    h2.className = `${PREFIX}-title section-title`;
    h2.textContent = heading.title;
    grid.append(h2);
  }

  if (heading.descriptionHtml) {
    const desc = document.createElement('div');
    desc.className = `${PREFIX}-description description`;
    desc.innerHTML = heading.descriptionHtml;
    grid.append(desc);
  }

  if (visibleItems.length) {
    const track = document.createElement('ul');
    track.className = `${PREFIX}-track rb-track`;
    track.setAttribute('aria-label', heading.ariaLabel || heading.title || 'Feature carousel');

    const items = visibleItems.map(({ row, item }) => {
      const li = document.createElement('li');
      li.className = `${PREFIX}-item rb-track-item`;
      // The item's own instrumentation goes on the item itself, not on
      // `track` - track holds every sibling item, and a drop target nested
      // under a sibling's instrumentation resolves to the wrong parent.
      moveInstrumentation(row, li);

      const column = document.createElement(item.href ? 'a' : 'div');
      column.className = `${PREFIX}-column${item.gradient ? ' text-gradient' : ''}`;
      if (item.href) column.setAttribute('href', item.href);

      if (item.picture) {
        const imgWrap = document.createElement('div');
        imgWrap.className = `${PREFIX}-img`;
        imgWrap.append(item.picture);
        column.append(imgWrap);
      }

      if (item.title || item.descriptionHtml) {
        const content = document.createElement('div');
        content.className = `${PREFIX}-content`;
        const featureContent = document.createElement('div');
        featureContent.className = 'feature-content';
        const featureContentInner = document.createElement('div');
        featureContentInner.className = 'feature-content-inner';

        if (item.title) {
          const h3 = document.createElement('h3');
          h3.className = `${PREFIX}-item-title text-sap-white`;
          h3.textContent = item.title;
          featureContentInner.append(h3);
        }
        if (item.descriptionHtml) {
          const body = document.createElement('div');
          body.className = 'body-text1';
          body.innerHTML = item.descriptionHtml;
          [...body.children].forEach((el) => el.classList.add('text-sap-white'));
          featureContentInner.append(body);
        }

        featureContent.append(featureContentInner);
        content.append(featureContent);
        column.append(content);
      }

      li.append(column);
      track.append(li);
      return li;
    });

    grid.append(track);

    const dots = buildDots(track, items, PREFIX);
    if (dots) grid.append(dots);
  }

  if (viewAllCta?.href && viewAllCta?.text) {
    const wrap = document.createElement('div');
    wrap.className = `${PREFIX}-view-all md-3-col-content-fragment-with-filter-and-cta__button`;
    const anchor = document.createElement('a');
    anchor.href = viewAllCta.href;
    const span = document.createElement('span');
    span.className = 'md-button';
    span.textContent = viewAllCta.text;
    anchor.append(span);
    moveInstrumentation(ctaRow, anchor);
    wrap.append(anchor);
    grid.append(wrap);
  }

  if (!isEditMode && !heading.title && !heading.descriptionHtml && !visibleItems.length) {
    block.replaceChildren();
    return;
  }

  block.replaceChildren(grid);
}
