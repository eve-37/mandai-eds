/**
 * WRS Section Title
 *
 * Ported from wrs-aem/.../components/commons/sectiontitle
 * (`wrs/components/commons/sectiontitle`, no `sling:resourceSuperType` other
 * than the inherited `wcm/foundation/components/parsys` boilerplate, no
 * `_cq_editConfig.xml`). See docs/wrs-migration-notes.md#sectiontitle for the
 * full weighing of this against the boilerplate's default `title` content
 * type and against `image`'s (docs, above) rejection of pushing per-element
 * presentation up to section metadata - this block follows the same
 * granularity call `image` made, one level down: `display_align` and
 * `display_bottomPadding` are properties of THIS title, not of the section
 * it sits in, so they stay on this block's own model rather than on
 * `models/_section.json`'s `style` field.
 *
 * The HTL is one `data-sly-element`-driven heading:
 *   <h{style} id="{anchorLink}" class="title-block {align}">
 *     <a data-sly-unwrap="${!link}" href="{link}">{title}</a>
 *   </h{style}>
 * wrapped in `.md.section-title-space {bottomPadding}` > `.sm-container` >
 * `.grid`. `SectionTitleModel` is plain injected strings plus one call,
 * `CommonUtils.getProperURL(link, resourceResolver)` - confirmed by reading
 * CommonUtils.java directly (Mandai-AEM/wrs-aem/core/.../CommonUtils.java
 * L335-375): it (a) resolves `link` as a page and, if that page's
 * `cq:template` is the WRS redirect-page template, substitutes its
 * `redirectTarget` property instead, then (b) appends the `.html` suffix to
 * `/content` paths. Part (b) is a pure formatting rule and is ported below
 * via `resolveHref()` (the same `.html`-suffix helper every other block's
 * internal link uses). Part (a) is a live repository read of a DIFFERENT
 * page's template/resourceType/redirectTarget properties at request time -
 * the "reads other pages" case the skill says to flag, not invent a
 * client-side substitute for. NOT ported: an authored `link` pointing at a
 * WRS redirect page will link to the redirect page itself here, not silently
 * follow it to its target the way the source did. Flagged in the migration
 * notes; low blast radius (only matters for links into redirect pages) but a
 * real, confirmed behaviour difference.
 *
 * Cell model - 6 dialog fields into 4 cells, following the same
 * value-keyword grouping wrs-accordion-tabs' "opt" cell already uses for the
 * identical style+anchorLink pair:
 *   [title]
 *   [opt_style (h1-h6, keyed by the fixed heading-tag set) +
 *    opt_anchorLink (free text, the fallback when a value isn't a heading tag)]
 *   [display_align (title-center/title-left, a fixed 2-value set) +
 *    display_bottomPadding (blank default, or one of two fixed CSS-class
 *    values) - two more fixed, non-overlapping vocabularies, so the same
 *    keyword-matching approach used for the opt cell extends cleanly; unlike
 *    accordion-tabs' two same-domain booleans, none of these four values can
 *    be confused for another]
 *   [link (aem-content, read the same way a lone aem-content cell is read in
 *    wrs-featured-listing's readItem() - the row's own <a href>)]
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  cellText, cellValues, resolveHref, renderEmpty,
} from '../../scripts/rb-helpers.js';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const ALIGN_VALUES = ['title-center', 'title-left'];
const PADDING_VALUES = [
  'section-title-space--small-padding-bottom',
  'section-title-space--no-padding-bottom',
];

function readOpt(row) {
  const result = { style: '', anchorLink: '' };
  cellValues(row).forEach((value) => {
    if (HEADING_TAGS.includes(value.toLowerCase())) result.style = value.toLowerCase();
    else if (!result.anchorLink) result.anchorLink = value;
  });
  return result;
}

function readDisplay(row) {
  const result = { align: '', bottomPadding: '' };
  cellValues(row).forEach((value) => {
    if (ALIGN_VALUES.includes(value)) result.align = value;
    else if (PADDING_VALUES.includes(value)) result.bottomPadding = value;
  });
  return result;
}

function readLink(row) {
  const anchor = row?.querySelector('a');
  return anchor ? anchor.getAttribute('href') || '' : cellText(row);
}

export default function decorate(block) {
  const [titleRow, optRow, displayRow, linkRow] = [...block.children];

  const title = cellText(titleRow);
  const { style, anchorLink } = readOpt(optRow);
  const { align, bottomPadding } = readDisplay(displayRow);
  const link = readLink(linkRow);

  if (!title) {
    renderEmpty(block, 'WRS Section Title — add a title');
    return;
  }

  if (bottomPadding === 'section-title-space--small-padding-bottom') {
    block.classList.add('small-padding-bottom');
  } else if (bottomPadding === 'section-title-space--no-padding-bottom') {
    block.classList.add('no-padding-bottom');
  }

  const inner = document.createElement('div');
  inner.className = 'wrs-section-title-inner';

  const heading = document.createElement(style || 'h2');
  heading.className = `wrs-section-title-heading${align === 'title-left' ? ' align-left' : ''}`;
  if (anchorLink) heading.id = anchorLink;

  // The title row's editable text lives on whichever element carries the
  // visible text - the anchor when a link is authored, the heading itself
  // otherwise - the same "instrument the innermost text-bearing element"
  // choice one-column-banner's title row makes.
  if (link) {
    const a = document.createElement('a');
    a.href = resolveHref(link);
    a.textContent = title;
    moveInstrumentation(titleRow, a);
    heading.append(a);
  } else {
    heading.textContent = title;
    moveInstrumentation(titleRow, heading);
  }

  inner.append(heading);
  block.replaceChildren(inner);
}
