/**
 * WRS Accordion Tabs
 *
 * Ported from wrs-aem/.../components/commons/accordiontabs.
 *
 * Shape: a single-level container. The source dialog nests one multifield
 * (`colItems` -> `./tabDetail`) inside the parent - no multifield-in-multifield,
 * so unlike `tabs`/`four-column-tiles` there is no flattening problem: every
 * child row is a tab, full stop.
 *
 * Interaction: the HTL wires `data-load-plugins="[accordion-tabs.js,...]"` with
 * `data-selector` values (`.tab_item` / `.tab_btn-tab` / `.tab_info-container`)
 * that match this exact markup, so accordion-tabs.js - not the other five
 * candidate plugins in the bundle, which target different markup variants - is
 * the behaviour this ports: click a tab's button, its panel shows, every other
 * panel hides, first tab active by default.
 *
 * accordion-tabs.js itself carries no ARIA and no keyboard support at all
 * (click-only, via jQuery event delegation). Rather than port that gap, the
 * roles/states/keyboard model here follows the WAI-ARIA APG "Tabs with Manual
 * Activation" pattern - the same pattern faq-tabs-a11y.js documents and
 * implements for a different WRS component in this bundle. That plugin's own
 * markup (.tab-category-select) does not match this component's, so its code
 * is not reused, only the pattern it names.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import { cellText, readCta, resolveHref } from '../../scripts/rb-helpers.js';

const PREFIX = 'wrs-accordion-tabs';

/**
 * title, opt_style + opt_anchorLink, noTopPadding, noBottomPadding.
 *
 * The source dialog's 5 parent fields do not collapse to fewer than 4 cells
 * without merging the two checkboxes into one cell - and grouped checkboxes
 * lose their identity there: AEM/UE renders every value in a grouped cell as
 * "true"/"false" text with no field name attached, so once noTopPadding and
 * noBottomPadding shared a cell there would be no way to tell which "true"
 * belonged to which. Every other grouped-value read in this codebase
 * disambiguates by the VALUE itself (a mask keyword, a colour keyword, an
 * align keyword) - two same-domain booleans have no such keyword to key on.
 * So they are kept as two separate one-field cells instead, using the full
 * 4-cell budget: [title], [opt_style + opt_anchorLink], [noTopPadding],
 * [noBottomPadding]. This is a deliberate change from the initial survey's
 * suggested single 4-field "opt" cell, made for that reason.
 */
const PARENT_CELLS = 4;

const HEADING_TAGS = ['h1', 'h3', 'h4', 'h5', 'h6'];

/**
 * Reads the parent's 4 cells.
 *
 * [opt_style, opt_anchorLink] is a genuinely grouped cell: style is one of a
 * known small set of heading tags (or blank, meaning the H2 default), and
 * anchorLink is free author-entered text, so the two are told apart by
 * matching the heading-tag keyword rather than by position - consistent with
 * how every other grouped, blankable cell is read in this codebase. The two
 * padding cells are single boolean values, read directly.
 */
function readParent(parentRows) {
  const [titleRow, optRow, noTopRow, noBottomRow] = parentRows;

  const parent = {
    title: cellText(titleRow),
    style: '',
    anchorLink: '',
    noTopPadding: cellText(noTopRow).toLowerCase() === 'true',
    noBottomPadding: cellText(noBottomRow).toLowerCase() === 'true',
  };

  [...(optRow?.querySelectorAll('p') || [])]
    .map((p) => p.textContent.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (HEADING_TAGS.includes(value.toLowerCase())) parent.style = value.toLowerCase();
      else parent.anchorLink = value;
    });
  // A single-value cell (only one of the two fields authored) renders bare
  // text with no <p> at all - cellText covers that case the same way.
  if (!parent.style && !parent.anchorLink) {
    const bare = cellText(optRow);
    if (HEADING_TAGS.includes(bare.toLowerCase())) parent.style = bare.toLowerCase();
    else parent.anchorLink = bare;
  }

  return parent;
}

/**
 * Reads one tab row's 3 cells: [tab_name, tab_title, tab_description],
 * [image (+ imageAlt, collapsed into the picture's own alt)],
 * [cta_link (+ cta_linkText, collapsed into the anchor's own text) + cta_newTab].
 *
 * tab_description is a richtext field grouped alongside two plain-text
 * fields. Every grouped field renders as one child of the cell in field
 * order (confirmed against this codebase's own published-markup test
 * fixtures for the analogous tabName/title pair), so the description is
 * whatever element(s) follow the first two. Unlike the plain-text fields,
 * its markup must be kept as HTML, not flattened to text - that is the one
 * place this reader departs from cellValues()/cellText().
 */
function readTab(row) {
  const [tabCell, imageCell, ctaCell] = row.children;

  const tabChildren = [...(tabCell?.children || [])];
  const tabName = cellText(tabChildren[0]);
  const title = cellText(tabChildren[1]);
  const descriptionEls = tabChildren.slice(2);
  let descriptionHtml = '';
  if (descriptionEls.length === 1) {
    descriptionHtml = descriptionEls[0].innerHTML.trim();
  } else if (descriptionEls.length > 1) {
    descriptionHtml = descriptionEls.map((el) => el.outerHTML).join('');
  }

  const picture = imageCell?.querySelector('picture') || null;
  const cta = readCta(ctaCell);

  return {
    tabName, title, descriptionHtml, picture, cta,
  };
}

export default function decorate(block) {
  const rows = [...block.children];
  const parentRows = rows.slice(0, PARENT_CELLS);
  const tabRows = rows.slice(PARENT_CELLS);

  const parent = readParent(parentRows);

  if (parent.anchorLink) block.id = parent.anchorLink;
  block.classList.toggle('no-top-padding', parent.noTopPadding);
  block.classList.toggle('no-bottom-padding', parent.noBottomPadding);

  const wrapper = document.createElement('div');

  if (parent.title) {
    const heading = document.createElement(parent.style || 'h2');
    heading.className = `${PREFIX}-title`;
    heading.textContent = parent.title;
    wrapper.append(heading);
  }

  if (!tabRows.length) {
    // The block always keeps its heading area clickable; the placeholder
    // covers the case where no tab has been authored yet at all.
    if (!block.hasAttribute('data-aue-resource')) {
      block.replaceChildren(...wrapper.children);
      return;
    }
    const placeholder = document.createElement('p');
    placeholder.className = 'rb-placeholder';
    placeholder.textContent = 'WRS Accordion Tabs — add a tab';
    wrapper.append(placeholder);
    block.replaceChildren(...wrapper.children);
    return;
  }

  const list = document.createElement('div');
  list.className = `${PREFIX}-list`;
  list.setAttribute('role', 'tablist');

  tabRows.forEach((row, index) => {
    const tab = readTab(row);
    const id = `${PREFIX}-${index}`;

    const item = document.createElement('div');
    item.className = `${PREFIX}-item${index === 0 ? ' active' : ''}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${PREFIX}-btn`;
    button.textContent = tab.tabName || `Tab ${index + 1}`;
    button.id = `${id}-tab`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `${id}-panel`);
    button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    button.setAttribute('tabindex', index === 0 ? '0' : '-1');

    const panel = document.createElement('div');
    panel.className = `${PREFIX}-panel`;
    panel.id = `${id}-panel`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `${id}-tab`);
    if (index !== 0) panel.hidden = true;

    // The tab's own instrumentation goes on a head element that holds only
    // its own content, never on the panel itself - a container block child
    // has no children of its own here, but keeping the instrumentation off
    // the shared panel/list wrappers is what lets the Universal Editor
    // continue to treat every row as a direct child of this block.
    const head = document.createElement('div');
    head.className = `${PREFIX}-panel-head`;
    moveInstrumentation(row, head);

    if (tab.title) {
      const h3 = document.createElement('h3');
      h3.className = `${PREFIX}-panel-heading`;
      h3.textContent = tab.title;
      head.append(h3);
    }

    if (tab.descriptionHtml) {
      const desc = document.createElement('div');
      desc.className = `${PREFIX}-panel-desc`;
      desc.innerHTML = tab.descriptionHtml;
      head.append(desc);
    }

    if (tab.cta) {
      const a = document.createElement('a');
      a.className = `${PREFIX}-panel-cta`;
      a.href = resolveHref(tab.cta.href);
      a.textContent = tab.cta.text;
      if (tab.cta.newTab) {
        a.target = '_blank';
        a.rel = 'noreferrer';
      }
      head.append(a);
    }

    panel.append(head);

    if (tab.picture) {
      const media = document.createElement('div');
      media.className = `${PREFIX}-panel-media`;
      media.append(tab.picture);
      panel.append(media);
    }

    item.append(button, panel);
    list.append(item);

    button.addEventListener('click', () => {
      [...list.querySelectorAll(`.${PREFIX}-btn`)].forEach((b, i) => {
        const selected = i === index;
        b.setAttribute('aria-selected', selected ? 'true' : 'false');
        b.setAttribute('tabindex', selected ? '0' : '-1');
        b.closest(`.${PREFIX}-item`).classList.toggle('active', selected);
      });
      [...list.querySelectorAll(`.${PREFIX}-panel`)].forEach((p, i) => {
        p.hidden = i !== index;
      });
    });
  });

  // WAI-ARIA "Tabs with Manual Activation": arrow keys move focus between
  // tabs; Home/End jump to the first/last; activation follows focus.
  list.addEventListener('keydown', (e) => {
    const buttons = [...list.querySelectorAll(`.${PREFIX}-btn`)];
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (current + 1) % buttons.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (current - 1 + buttons.length) % buttons.length;
    } else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    if (next === null) return;
    e.preventDefault();
    buttons[next].focus();
    buttons[next].click();
  });

  wrapper.append(list);
  block.replaceChildren(...wrapper.children);
}
