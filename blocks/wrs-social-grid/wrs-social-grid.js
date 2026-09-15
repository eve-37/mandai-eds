/**
 * WRS Social Grid
 *
 * Ported from wrs/components/mandai/mandaisocialcontentgrid
 * (`md social-grid-component`). See docs/wrs-migration-notes.md
 * "## mandaisocialcontentgrid" for the full survey-vs-source verification;
 * this docblock summarises the decisions the code depends on.
 *
 * CELL MODEL: 12 dialog fields -> 4 cells, confirmed against the Java bean,
 * not just inferred from the dialog
 * -------------------------------------------------------------
 * The dialog's `socialfeed` multifield has a `cq-dialog-dropdown-showhide`
 * select (`socialIcon`) with FIVE branches, not four - facebook, instagram,
 * twitter, text, image - each showing a different subset of these fields:
 *   socialFeedImage / facebookSocialFeedImage / instagramSocialFeedImage
 *   message (richtext) / twitterMessage (textarea)
 *   facebookSocialHandle / instagramSocialHandle / twitterSocialHandle
 *   facebookSocialFeedUrl / instagramSocialFeedUrl / twitterSocialFeedUrl
 * That reads as 12 unrelated fields. It is not: `MandaiSocialContentGridItem`
 * (the child Sling Model each row is adapted to - not in this bundle, a
 * project.objects class, but its accessors are used directly in the HTL) has
 * exactly `getSocialFeedImage()`, `getMessage()`, `getSocialHandle()` and
 * `getSocialFeedUrl()` - ONE accessor per concept, not one per network. The
 * item bean itself already does the collapse this model makes explicit;
 * confirmed by reading the HTL, which reads only `item.socialFeedImage`,
 * `item.message`, `item.socialHandle`, `item.socialFeedUrl` throughout, never
 * a per-network name. So the 4 cells here (`socialIcon`, `socialFeedImage`,
 * a grouped `link` cell, `message`) are not an invented simplification - they
 * are this component's own backing bean's field set, ported field-for-field.
 *
 * The `link` cell groups `link_url` (the feed URL) and `link_handle` (the
 * handle) under the `link_` prefix per the model grouping rule - both apply
 * only to the facebook/instagram/twitter branches (image/text branches have
 * neither in the source dialog), so an author leaves them blank for those
 * two types, same as the source dialog simply omits the fields.
 *
 * richtext `message` vs textarea `twitterMessage`: an inconsistency, not a
 * meaningful distinction - kept as ONE richtext field, not carried forward
 * as two
 * -------------------------------------------------------------
 * The source itself already treats them as the same value: both render
 * through the identical HTL expression, `${item.message @context='html'}`,
 * with no branch that treats twitter's message differently at render time.
 * The dialog difference (RTE widget for `message`, a plain `<textarea>` for
 * `twitterMessage`) reads as an authoring-time guard against pasting
 * formatted text into what was historically a 280-character platform, not a
 * content-model difference - the render path does not care. A `richtext`
 * field is a safe superset (a superset can hold plain, unformatted text just
 * as well as a `<textarea>` can), so the model uses one `message` field for
 * both, with a field description telling authors to keep Twitter items
 * unformatted. This is the one place this collapse is a policy choice
 * (unlike the other three cells, which are a direct mechanical port of the
 * item bean's own fields) - flagged here rather than silently decided.
 *
 * `tileOrder` IS DERIVED, NOT AUTHORED - re-expressed as CSS, not an inline
 * style
 * -------------------------------------------------------------
 * Confirmed in `MandaiSocialContentGridModel.init()`: `tileOrder =
 * socialFeedList.size() <= 4 ? "order:1" : ""`, written into the main tile's
 * `style` attribute (`style="${modal.tileOrder @context='styleString'}"`).
 * There is no dialog field for it. It exists because
 * `.social-grid-component__column:nth-of-type(1) { order: 5; }` in the
 * deployed CSS normally pushes the main title tile to 5th visual position
 * (behind up to 4 feed items) - but when there are 3 or fewer feed items
 * (<=4 columns total), pushing it to 5th would leave it displayed LAST after
 * every real item, so the inline style forces it back to `order: 1` (first)
 * for exactly that case.
 *
 * Re-derived here as a modifier class instead: `decorate()` counts `1 +
 * childRows.length` (the same count the Java bean's `.size()` counted -
 * before filtering out any blank rows, since the Java code never filtered
 * either) and adds `wrs-social-grid-compact` when that is <=4.
 * `wrs-social-grid.css` reads the class:
 *   .wrs-social-grid-compact .wrs-social-grid-column.main { order: 1; }
 * A class is the same tradeoff `wrs-quote-carousel` and others already made
 * for computed presentational state - CSS stays declarative and the count
 * rule is visible and testable in one place, instead of a raw inline
 * `style.order` value set from JS.
 *
 * THE THREE JS PLUGINS SHIP UNRELATED TO THIS COMPONENT - none reimplemented
 * -------------------------------------------------------------
 * `social-content-grid.js` (`[data-social-content]`, fetches
 * `/bin/socialcontentgrid.servlet.*.json` via a Handlebars template),
 * `list-social.js` (`.list-social li` hover/click icon popups) and
 * `animal-personality-social-grid.js` (`#animal-personality-view-more`,
 * `.animal-personality-social-grid__box`) were bundled with this export, but
 * NONE of their selectors appear anywhere in this component's own HTL
 * (`.social-grid-component`, `.social-grid-component__column`, `.photo`,
 * `.twitter`, `.social-grid-component__title`, `__desc`, `__username`,
 * `.lazyload`). They belong to sibling "social" components sharing the
 * `Mandai-EMP-Frontend/app/scripts/plugins/` folder, not to this one - the
 * same "check the selector before porting" caution the migration skill gives
 * for CSS applies to JS plugins bundled by folder proximity. This component
 * has no interactive JS of its own: it is a static grid, and the only JS
 * behaviour visible in its own HTL is `.lazyload`, a generic sitewide
 * lazy-loading hook with no component-specific logic - EDS's own
 * `<picture>`/responsive-image handling replaces it, nothing was ported.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  cellText, splitRows, renderEmpty,
} from '../../scripts/rb-helpers.js';

/** title - see _wrs-social-grid.json. */
const PARENT_CELLS = 1;

const PREFIX = 'wrs-social-grid';

/**
 * Reads the grouped `link` cell (`link_url` + `link_handle`).
 *
 * Not `readCta()` from rb-helpers.js - that reader also looks for a
 * variant/new-tab pair this cell does not have, and would silently leave
 * them at their (harmless but meaningless) defaults. This cell is simpler:
 * an optional anchor plus one plain-text paragraph. Mirrors readCta()'s
 * defensive shape (find the anchor, then find the paragraph that is NOT the
 * anchor's own) rather than assuming a fixed <p> count, since either field
 * can be authored alone.
 */
function readLink(cell) {
  if (!cell) return { href: '', handle: '' };
  const anchor = cell.querySelector('a');
  const paragraphs = [...cell.querySelectorAll('p')];
  const handleP = paragraphs.find((p) => !p.contains(anchor));
  let handle = '';
  if (handleP) {
    handle = handleP.textContent.trim();
  } else if (!anchor) {
    handle = cell.textContent.trim();
  }
  return { href: anchor?.getAttribute('href') || '', handle };
}

/** The icon + handle panel shown whenever a handle is authored. */
function buildUsername(type, handle) {
  if (!handle) return null;
  const wrap = document.createElement('div');
  wrap.className = `${PREFIX}-username`;

  const icon = document.createElement('i');
  icon.className = `fab ${type}`;
  wrap.append(icon);

  const text = document.createElement('div');
  text.className = `${PREFIX}-handle body-text2`;
  text.textContent = handle;
  wrap.append(text);

  return wrap;
}

/**
 * One feed tile. Mirrors the source HTL's branching exactly:
 *   showPhoto = has an image AND type isn't "text"
 *     (the source's extra "AND type isn't twitter" guard on the hyperlink
 *     branch is redundant here - the twitter dialog branch has no image
 *     field, so a twitter item's picture is always empty regardless)
 *   showPhoto true  -> ".photo" column: optional link wraps username + image
 *   showPhoto false -> ".twitter" column: optional link wraps a title (h4,
 *     most types) or a description div (type "text" only) built from the
 *     message, plus username
 * A link wrapper is only added to the DOM when `href` is authored, matching
 * the source's own isHyperlink/no-link mutually-exclusive branches.
 */
function buildTile(item, row) {
  const {
    type, picture, href, handle, messageHtml,
  } = item;
  const showPhoto = !!picture && type !== 'text';

  const column = document.createElement('div');
  column.className = `${PREFIX}-column ${showPhoto ? 'photo' : 'twitter'}`;
  moveInstrumentation(row, column);

  let target = column;
  if (href) {
    target = document.createElement('a');
    target.href = href;
    target.target = '_blank';
    target.rel = 'noreferrer';
    column.append(target);
  }

  if (showPhoto) {
    const username = buildUsername(type, handle);
    if (username) target.append(username);
    if (picture) target.append(picture.cloneNode(true));
  } else {
    if (messageHtml) {
      if (type === 'text') {
        const desc = document.createElement('div');
        desc.className = `${PREFIX}-desc`;
        desc.innerHTML = messageHtml;
        target.append(desc);
      } else {
        const titleWrap = document.createElement('div');
        titleWrap.className = `${PREFIX}-title`;
        const h4 = document.createElement('h4');
        h4.innerHTML = messageHtml;
        titleWrap.append(h4);
        target.append(titleWrap);
      }
    }
    const username = buildUsername(type, handle);
    if (username) target.append(username);
  }

  return column;
}

export default function decorate(block) {
  const { parentRows, childRows } = splitRows(block, PARENT_CELLS);
  const [titleRow] = parentRows;
  const title = cellText(titleRow);

  const tiles = childRows.map((row) => {
    const [typeCell, imageCell, linkCell, messageCell] = row.children;
    const type = cellText(typeCell);
    const picture = imageCell?.querySelector('picture') ?? null;
    const { href, handle } = readLink(linkCell);
    const messageHtml = (messageCell?.innerHTML || messageCell?.textContent || '').trim();
    return {
      row, type, picture, href, handle, messageHtml,
    };
  });

  const hasAnyTileContent = tiles.some(
    (t) => t.picture || t.href || t.handle || t.messageHtml,
  );

  if (!title && !hasAnyTileContent) {
    renderEmpty(block, 'WRS Social Grid — add a title or a social feed item');
    return;
  }

  // Re-derive the source's count-based `tileOrder` inline style (see
  // docblock above) as a modifier class, applied to the block itself - the
  // same element the boilerplate's loader already puts the flex-container
  // `wrs-social-grid` class on, matching how wrs-quote-carousel applies its
  // own modifier classes directly to `block` rather than an extra wrapper.
  // `tiles.length` is the authored row count, matching
  // `socialFeedList.size()` - unfiltered, same as the source.
  if (1 + tiles.length <= 4) block.classList.add(`${PREFIX}-compact`);

  const columns = [];

  const mainColumn = document.createElement('div');
  mainColumn.className = `${PREFIX}-column main`;
  const titleWrap = document.createElement('div');
  titleWrap.className = `${PREFIX}-title`;
  const h3 = document.createElement('h3');
  h3.textContent = title;
  // The title cell's own instrumentation belongs on the heading it becomes,
  // not on the outer column, matching wrs-four-column-listing's precedent.
  if (titleRow) moveInstrumentation(titleRow, h3);
  titleWrap.append(h3);
  mainColumn.append(titleWrap);
  columns.push(mainColumn);

  tiles.forEach((tile) => {
    if (!tile.picture && !tile.href && !tile.handle && !tile.messageHtml) return;
    columns.push(buildTile(tile, tile.row));
  });

  block.replaceChildren(...columns);
}
