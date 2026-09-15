/**
 * WRS Experience Carousel
 *
 * Ported from wrs-aem/.../components/mandai/mandaiexperiencecarouselfeature
 * (`md-feature-carousel-experience`). A single-instance "title card + image
 * carousel" pair: a fixed caption card (title/description/CTA) sits beside a
 * one-at-a-time image carousel (`slides-to-show-desktop/tablet/mobile="1"`
 * in the source HTL - this is never a multi-up carousel).
 *
 * THE PER-INSTANCE STYLESHEET
 * ----------------------------
 * The source HTL emits an inline `<style>` block keyed on
 * `#mecf-${resource.path.hashCode}`, generating up to 8 CSS rules from 8
 * Granite colorfields (contentBody[Hover], contentBodyTitle[Hover],
 * contentBodyText[Hover], contentBodyArrow[Hover]). EDS has no equivalent of
 * injecting a per-instance stylesheet, but CSS custom properties set on the
 * block root are the direct, idiomatic replacement: the 8 values are read
 * here and set with `style.setProperty()`, and wrs-experience-carousel.css
 * consumes them with fallbacks equal to the DEPLOYED bundle's own defaults,
 * so an unconfigured instance still looks like the live site does today.
 * Checked for a reason this would NOT work before building it: all 8 rules
 * are plain `background-color`/`color` declarations, including the four
 * `:hover` variants (gated on `.no-touch` in the source, which is a
 * Modernizr touch-detection class this port replaces with
 * `@media (hover: hover) and (pointer: fine)`, the house pattern the
 * migration brief specifies) - nothing here needs JS-driven style injection,
 * `:hover` in CSS is sufficient. No blocker found.
 *
 * THE 8-COLOUR NAMING TRAP - avoided, not just noticed
 * -----------------------------------------------------
 * `contentBodyTitle` = `contentBody` + `Title`, and `contentBodyText` =
 * `contentBody` + `Text` - both exactly match this project's collapsing-
 * suffix convention (Text/Title/Type/Alt/MimeType collapses onto a base
 * field of the same name minus the suffix), and `contentBody` genuinely
 * exists as a sibling field. Keeping the source names as-is would have
 * silently merged `contentBody`/`contentBodyTitle`/`contentBodyText` into
 * ONE cell, discarding two of three distinct colours. Every one of the 8 is
 * therefore modelled with an explicit `color_` prefix
 * (`color_body`/`color_bodyTitle`/`color_bodyText`/...) - see
 * `_wrs-experience-carousel.json`. Underscore grouping (rule 1) then merges
 * all 8 into ONE cell together, which is what we want, and takes priority
 * over the suffix rule, so none of the 8 gets silently absorbed into another.
 *
 * READING THE 8 VALUES BACK OUT - a real, accepted limitation
 * --------------------------------------------------------------
 * All 8 are freeform colour text with no shared vocabulary (unlike this
 * codebase's other grouped cells - a heading tag, a `true`/`false`, a mask
 * keyword - which are told apart by matching their known small value set).
 * They are read POSITIONALLY, in field-declaration order, via `cellValues()`
 * - the same mechanism every other grouped cell in this codebase uses. This
 * codebase's own `masthead` fixture demonstrates that AEM omits a blank
 * field from a grouped cell entirely rather than emitting an empty
 * placeholder for it, so positional reading is reliable when colours are
 * authored in field order but can misattribute a later colour to an earlier
 * slot if an EARLIER field in the group is left blank while a LATER one is
 * set (e.g. `color_bodyArrow` authored, `color_bodyTitle` left blank - the
 * arrow colour would land in the title slot). This is a real, accepted
 * limitation, not an oversight - flagged in docs/wrs-migration-notes.md and
 * in the migration report, and MUST be re-verified against real
 * authored/published markup once this block exists on a page, the same
 * caveat every WRS block's constructed test fixture already carries.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  cellText, cellValues, renderEmpty, splitRows, buildDots,
} from '../../scripts/rb-helpers.js';

const PREFIX = 'wrs-experience-carousel';

/** card_*, cta_*, layout_padding, color_* - see _wrs-experience-carousel.json. */
const PARENT_CELLS = 4;

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h5', 'h6'];
const PLACEMENTS = ['left', 'right'];
const PADDINGS = ['none', 'no-top', 'no-bottom', 'no-top-bottom'];

const COLOR_KEYS = [
  'body', 'bodyHover', 'bodyTitle', 'bodyTitleHover',
  'bodyText', 'bodyTextHover', 'bodyArrow', 'bodyArrowHover',
];

/**
 * Reads the card_title / card_style / card_description / card_placement
 * cell. `card_style`'s default option value is the empty string (the
 * source's own "Default (H4)" choice), so an unauthored style is
 * indistinguishable from "not present" - both correctly fall back to h4
 * below. `card_placement` always carries a real default ("left"), so it is
 * always present and identified by its own small vocabulary.
 */
function readCard(cell) {
  const card = {
    title: '', style: '', description: '', placement: 'left',
  };
  if (!cell) return card;

  const children = [...cell.children];
  // card_description is richtext and must keep its markup, so it cannot go
  // through cellText/cellValues (which flatten to text). Everything that is
  // NOT the richtext description is read by content match against each
  // field's own small vocabulary, exactly like every other grouped cell in
  // this codebase - description is whatever is left over.
  const rest = [];
  children.forEach((child) => {
    const text = child.textContent.trim();
    const lower = text.toLowerCase();
    if (HEADING_TAGS.includes(lower)) {
      card.style = lower;
    } else if (PLACEMENTS.includes(lower)) {
      card.placement = lower;
    } else {
      rest.push(child);
    }
  });

  // Whatever remains is title (plain text) then description (richtext),
  // read POSITIONALLY in field-declaration order - the same technique
  // wrs-accordion-tabs' readTab() uses for its own title/description pair,
  // rather than inventing a new one here. Both fields are independently
  // optional freeform text with no vocabulary to match on, so - exactly
  // like the colour cell above - if `card_title` is left blank while
  // `card_description` is set, this misreads the description as the title.
  // Accepted for the same reason and flagged in the same place; re-verify
  // once this block has real authored markup to check against.
  const [titleEl, ...descEls] = rest;
  if (titleEl) card.title = cellText(titleEl);
  if (descEls.length) card.description = descEls.map((el) => el.innerHTML || el.textContent).join('').trim();

  return card;
}

/** Reads the cta_link / cta_newTab cell. No CTA text field in the source - the whole card links. */
function readCta(cell) {
  if (!cell) return null;
  const anchor = cell.querySelector('a');
  if (!anchor) return null;
  const newTab = cellValues(cell).map((v) => v.toLowerCase()).includes('true');
  return { href: anchor.getAttribute('href') || '', newTab };
}

/**
 * Reads the layout_padding cell - see docs/wrs-migration-notes.md
 * ## mandaicffourcollisting for the technique.
 */
function readPadding(cell) {
  const value = cellText(cell).toLowerCase();
  return PADDINGS.includes(value) ? value : 'none';
}

/**
 * Reads the color_* cell - see the file docblock for the accepted
 * positional-reading limitation.
 */
function readColors(cell) {
  const colors = {};
  if (!cell) return colors;
  cellValues(cell).forEach((value, index) => {
    const key = COLOR_KEYS[index];
    if (key && value) colors[key] = value;
  });
  return colors;
}

/**
 * Reads one carousel item's 3 cells: image (+alt +disableGradient),
 * content_title/content_description, cta_link/cta_newTab.
 */
function readItem(row) {
  const [imageCell, contentCell, ctaCell] = [...(row?.children ?? [])];

  const picture = imageCell?.querySelector('picture') ?? null;
  const disableGradient = cellValues(imageCell).map((v) => v.toLowerCase()).includes('true');

  const contentChildren = [...(contentCell?.children ?? [])];
  const title = cellText(contentChildren[0]);
  const subTextEls = contentChildren.slice(1);
  let subTextHtml = '';
  if (subTextEls.length === 1) {
    subTextHtml = subTextEls[0].innerHTML.trim();
  } else if (subTextEls.length > 1) {
    subTextHtml = subTextEls.map((el) => el.outerHTML).join('');
  }

  const cta = readCta(ctaCell);

  return {
    picture, disableGradient, title, subTextHtml, cta,
  };
}

export default function decorate(block) {
  const { parentRows, childRows } = splitRows(block, PARENT_CELLS);
  const [cardRow, ctaRow, layoutRow, colorRow] = parentRows;
  const isEditMode = block.hasAttribute('data-aue-resource');

  const card = readCard(cardRow);
  const cta = readCta(ctaRow);
  const padding = readPadding(layoutRow);
  const colors = readColors(colorRow);

  if (!card.title && !card.description && !childRows.length) {
    renderEmpty(block, 'WRS Experience Carousel — add a card title and some images');
    return;
  }

  block.classList.add(`${PREFIX}-placement-${card.placement}`);
  if (padding === 'no-top' || padding === 'no-top-bottom') block.classList.add('no-top-padding');
  if (padding === 'no-bottom' || padding === 'no-top-bottom') block.classList.add('no-bottom-padding');

  // Custom properties, not an injected <style> block - see file docblock.
  const PROP_NAMES = {
    body: '--wrs-ecf-body',
    bodyHover: '--wrs-ecf-body-hover',
    bodyTitle: '--wrs-ecf-body-title',
    bodyTitleHover: '--wrs-ecf-body-title-hover',
    bodyText: '--wrs-ecf-body-text',
    bodyTextHover: '--wrs-ecf-body-text-hover',
    bodyArrow: '--wrs-ecf-body-arrow',
    bodyArrowHover: '--wrs-ecf-body-arrow-hover',
  };
  Object.entries(colors).forEach(([key, value]) => {
    const propName = PROP_NAMES[key];
    if (propName) block.style.setProperty(propName, value);
  });

  const titleBlock = document.createElement('div');
  titleBlock.className = `${PREFIX}-title-block`;

  const titleContent = document.createElement(cta?.href ? 'a' : 'div');
  titleContent.className = `${PREFIX}-title-content`;
  if (cta?.href) {
    titleContent.setAttribute('href', cta.href);
    if (cta.newTab) {
      titleContent.setAttribute('target', '_blank');
      titleContent.setAttribute('rel', 'noreferrer');
    }
  }
  // The card's own instrumentation (title/description/CTA all sit in the
  // same source-dialog card_*/cta_* cells) belongs on titleBlock, the head
  // element holding only the card's own content - never on `block` itself,
  // which also holds the carousel list.
  moveInstrumentation(cardRow, titleBlock);

  const linkWithArrow = document.createElement('div');
  linkWithArrow.className = `${PREFIX}-link-with-arrow`;

  if (card.title) {
    const heading = document.createElement(card.style || 'h4');
    heading.className = `${PREFIX}-header`;
    heading.textContent = card.title;
    linkWithArrow.append(heading);
  }

  if (cta?.href) {
    const arrow = document.createElement('div');
    arrow.className = `${PREFIX}-link-arrow`;
    arrow.setAttribute('aria-hidden', 'true');
    const icon = document.createElement('i');
    icon.className = 'far fa-chevron-right';
    arrow.append(icon);
    linkWithArrow.append(arrow);
  }

  titleContent.append(linkWithArrow);

  if (card.description) {
    const desc = document.createElement('div');
    desc.className = `${PREFIX}-description`;
    desc.innerHTML = card.description;
    titleContent.append(desc);
  }

  titleBlock.append(titleContent);

  const wrapper = document.createElement('div');
  wrapper.className = `${PREFIX}-wrapper`;
  wrapper.append(titleBlock);

  if (childRows.length) {
    const track = document.createElement('ul');
    track.className = `${PREFIX}-track rb-track`;
    track.setAttribute('aria-label', 'Carousel track with interactive elements');

    const items = childRows.map((row) => {
      const item = readItem(row);

      const li = document.createElement('li');
      li.className = `${PREFIX}-item rb-track-item${item.disableGradient ? '' : ' text-gradient'}`;
      // The item's own instrumentation goes on the item itself, not on
      // `track` - track holds every sibling image, and a drop target nested
      // under a sibling's instrumentation resolves to the wrong parent.
      moveInstrumentation(row, li);

      const inner = item.cta?.href ? document.createElement('a') : document.createElement('div');
      inner.className = `${PREFIX}-container`;
      if (item.cta?.href) {
        inner.setAttribute('href', item.cta.href);
        if (item.cta.newTab) {
          inner.setAttribute('target', '_blank');
          inner.setAttribute('rel', 'noreferrer');
        }
      }

      if (item.picture) {
        const img = document.createElement('div');
        img.className = `${PREFIX}-img`;
        img.append(item.picture);
        inner.append(img);
      }

      if (item.title || item.subTextHtml) {
        const content = document.createElement('div');
        content.className = `${PREFIX}-content`;
        const featureContent = document.createElement('div');
        featureContent.className = 'feature-content';
        const featureContentInner = document.createElement('div');
        featureContentInner.className = 'feature-content-inner';

        if (item.title) {
          const h4 = document.createElement('h4');
          h4.className = `${PREFIX}-item-title text-sap-white`;
          h4.textContent = item.title;
          featureContentInner.append(h4);
        }
        if (item.subTextHtml) {
          const body = document.createElement('div');
          body.className = 'body-text1';
          body.innerHTML = item.subTextHtml;
          [...body.children].forEach((el) => el.classList.add('text-sap-white'));
          featureContentInner.append(body);
        }

        featureContent.append(featureContentInner);
        content.append(featureContent);
        inner.append(content);
      }

      li.append(inner);
      track.append(li);
      return li;
    });

    wrapper.append(track);

    const dots = buildDots(track, items, PREFIX);
    if (dots) wrapper.append(dots);
  }

  if (!isEditMode && !childRows.length && !card.title && !card.description) {
    block.replaceChildren();
    return;
  }

  block.replaceChildren(wrapper);
}
