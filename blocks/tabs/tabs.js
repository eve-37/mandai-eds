import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  cellValues, readCta, buildCta, renderEmpty,
} from '../../scripts/rb-helpers.js';

const PREFIX = 'tabs';

/**
 * The tile's `align` values are deliberately prefixed - `tile-left`, not `left`.
 *
 * The source dialog nests a Content Tiles multifield inside the Tabs multifield,
 * which Granite allows. The EDS content model does not: a block item cannot
 * itself be a container, so Tabs -> Tab -> Tab Tile is unauthorable - the editor
 * simply offers no insert under a Tab. `columns` is the one two-level component
 * in the platform and it gets there through a purpose-built resource type.
 *
 * So the two levels are flattened: Tabs accepts both Tab and Tab Tile, and each
 * tile joins the tab above it. That means rows of two different types are
 * interleaved and have to be told apart. Cell count cannot do it - AEM drops
 * empty cells, so a barely-filled tile collapses to the shape of a tab. The
 * prefixed align value is the discriminator instead: it is a select with a
 * default, so it is present on every tile and can never be blanked, and the
 * prefix means a tab whose title happens to read "Center" is not mistaken for
 * one. The author still just sees "Left" / "Center" / "Right".
 */
const TILE_ALIGNS = ['tile-left', 'tile-center', 'tile-right'];

const TILE_MODEL = 'rbtabtile';

/**
 * In the editor each row says what it is, so ask it directly.
 *
 * The align keyword alone is not enough there: a tile that has just been added
 * has no value written yet, so it reads as a tab and appears as a spurious
 * extra one until the author types something and the select's default is
 * persisted - at which point it jumps into place. `data-aue-model` is present
 * from the moment the tile is created, so the row never misrepresents itself.
 *
 * A published page carries no data-aue-* at all, which is what the keyword is
 * still there for.
 */
function isTileRow(row) {
  const model = row.getAttribute('data-aue-model');
  if (model) return model === TILE_MODEL;

  return [...row.children]
    .flatMap(cellValues)
    .some((v) => TILE_ALIGNS.includes(v.toLowerCase()));
}

function readTile(row) {
  const tile = {
    title: '', desc: '', align: '', picture: row.querySelector('picture'),
  };
  [...row.children].flatMap(cellValues).forEach((v) => {
    const lower = v.toLowerCase();
    if (TILE_ALIGNS.includes(lower)) tile.align = lower.replace('tile-', '');
    else if (!tile.title) tile.title = v;
    else if (!tile.desc) tile.desc = v;
  });
  return tile;
}

/** Regroups the flat row list into one entry per tab, each with its tiles. */
function groupTabs(block) {
  const groups = [];
  [...block.children].forEach((row) => {
    if (isTileRow(row)) {
      // A tile authored before any tab has nothing to belong to. Dropping it
      // would lose content silently, so it opens an unnamed tab instead - a
      // visible prompt to move it.
      if (!groups.length) groups.push({ row: null, tiles: [] });
      groups[groups.length - 1].tiles.push(row);
    } else {
      groups.push({ row, tiles: [] });
    }
  });
  return groups;
}

export default function decorate(block) {
  const groups = groupTabs(block);
  if (!groups.length) {
    renderEmpty(block, 'Tabs — add some tabs');
    return;
  }

  /*
   * The editor renders exactly as the published page does: one panel at a time.
   *
   * Every panel was briefly shown at once, because a hidden panel is not a drop
   * target and a tile could then only be dropped into the first tab. That is no
   * longer the constraint - instrumenting the tab on its head element rather
   * than on the panel is what actually let a tile belong to any tab - and
   * stacking every panel made the editor preview misrepresent the page badly
   * enough to read as a bug. An author who wants to work on another tab clicks
   * it, exactly as a visitor would.
   */
  const isEditMode = block.hasAttribute('data-aue-resource');

  const nav = document.createElement('div');
  nav.className = `${PREFIX}-nav`;
  const navList = document.createElement('ul');
  navList.className = `${PREFIX}-nav-list`;
  navList.setAttribute('role', 'tablist');
  nav.append(navList);

  const panels = document.createElement('div');
  panels.className = `${PREFIX}-panels`;

  groups.forEach(({ row: tabRow, tiles: tileRows }, index) => {
    const cta = tabRow ? readCta(tabRow) : null;

    // Copy that is not the CTA: tab name, then title.
    const copy = tabRow ? [...tabRow.children]
      .filter((cell) => !cell.querySelector('a'))
      .flatMap(cellValues) : [];
    const [tabName = `Tab ${index + 1}`, title = ''] = copy;

    const id = `${PREFIX}-${index}`;

    const navItem = document.createElement('li');
    const navButton = document.createElement('button');
    navButton.type = 'button';
    navButton.className = `${PREFIX}-nav-item`;
    navButton.textContent = tabName;
    navButton.setAttribute('role', 'tab');
    navButton.id = `${id}-tab`;
    navButton.setAttribute('aria-controls', `${id}-panel`);
    navButton.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    navItem.append(navButton);
    navList.append(navItem);

    const panel = document.createElement('div');
    panel.className = `${PREFIX}-panel`;
    panel.id = `${id}-panel`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `${id}-tab`);
    if (index !== 0) panel.hidden = true;

    /*
     * The tab's instrumentation goes on a head element INSIDE the panel, never
     * on the panel itself.
     *
     * A tile is a sibling of its tab in the content model, but it is rendered
     * inside that tab's panel. Put the tab's data-aue-* on the panel and the
     * tile's nearest instrumented ancestor becomes the tab - so the editor
     * reads the tile as the tab's child and offers no way to move one between
     * tabs, because a Tab is a component and not a container.
     *
     * With the instrumentation on a head that holds only the tab's own copy,
     * the panel is an ordinary uninstrumented wrapper and every tile resolves
     * up to the block, which is the container it actually belongs to.
     */
    const head = document.createElement('div');
    head.className = `${PREFIX}-panel-head`;
    if (tabRow) moveInstrumentation(tabRow, head);

    if (title) {
      const h2 = document.createElement('h2');
      h2.className = `${PREFIX}-panel-title`;
      h2.textContent = title;
      head.append(h2);
    }

    if (head.children.length || tabRow) panel.append(head);

    if (tileRows.length || isEditMode) {
      const grid = document.createElement('ul');
      grid.className = `${PREFIX}-tiles`;
      tileRows.forEach((tileRow) => {
        const tile = readTile(tileRow);
        const li = document.createElement('li');
        li.className = `${PREFIX}-tile align-${tile.align || 'left'}`;
        moveInstrumentation(tileRow, li);
        if (tile.picture) {
          const media = document.createElement('div');
          media.className = `${PREFIX}-tile-media`;
          media.append(tile.picture);
          li.append(media);
        }
        if (tile.title) {
          const h3 = document.createElement('h3');
          h3.textContent = tile.title;
          li.append(h3);
        }
        if (tile.desc) {
          const p = document.createElement('p');
          p.textContent = tile.desc;
          li.append(p);
        }
        grid.append(li);
      });
      panel.append(grid);
    }

    const button = buildCta(cta);
    if (button) {
      const wrap = document.createElement('div');
      wrap.className = `${PREFIX}-panel-cta`;
      wrap.append(button);
      panel.append(wrap);
    }

    panels.append(panel);

    navButton.addEventListener('click', () => {
      [...navList.querySelectorAll('button')].forEach((b, i) => {
        const selected = i === index;
        b.setAttribute('aria-selected', selected ? 'true' : 'false');
        b.classList.toggle('active', selected);
      });
      [...panels.children].forEach((p, i) => { p.hidden = i !== index; });
    });
    if (index === 0) navButton.classList.add('active');
  });

  // Left/right arrows move between tabs, as the tablist role promises.
  navList.addEventListener('keydown', (e) => {
    const buttons = [...navList.querySelectorAll('button')];
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = (current + 1) % buttons.length;
    if (e.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
    if (next === null) return;
    e.preventDefault();
    buttons[next].focus();
    buttons[next].click();
  });

  block.replaceChildren(nav, panels);
}
