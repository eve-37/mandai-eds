import { moveInstrumentation } from '../../scripts/scripts.js';
import { readCta, buildCta, renderEmpty } from '../../scripts/rb-helpers.js';

const PREFIX = 'tabs';
const ALIGNS = ['left', 'center', 'right'];

/**
 * NESTED CONTAINER - the only component here with two levels of children
 * (tabs -> tab -> tile). component-filters.json expresses it, and the xwalk
 * linter accepts it, but the DOM shape AEM produces for a nested container has
 * NOT been verified in the editor.
 *
 * So the tile reader below accepts either plausible shape: tiles nested inside
 * their tab's row, or flattened as sibling rows following it. Whichever AEM
 * actually emits, one branch handles it. Confirm against a real authored
 * instance and then simplify this - do not leave it guessing forever.
 */
function collectTiles(tabRow) {
  // Shape A: nested rows inside the tab row.
  const nested = [...tabRow.querySelectorAll(':scope > div > div > div')]
    .filter((el) => el.querySelector('picture, img'));
  if (nested.length) return nested;

  // Shape B: any descendant carrying a picture that is not the tab's own cells.
  return [...tabRow.querySelectorAll('picture')]
    .map((p) => p.closest('div'))
    .filter(Boolean);
}

function readTile(row) {
  const tile = {
    title: '', desc: '', align: '', picture: row.querySelector('picture'),
  };
  const values = [...row.querySelectorAll('p, div')]
    .map((el) => el.textContent.trim())
    .filter(Boolean);
  values.forEach((v) => {
    const lower = v.toLowerCase();
    if (ALIGNS.includes(lower)) tile.align = lower;
    else if (!tile.title) tile.title = v;
    else if (!tile.desc) tile.desc = v;
  });
  return tile;
}

export default function decorate(block) {
  const tabRows = [...block.children];
  if (!tabRows.length) {
    renderEmpty(block, 'Tabs — add some tabs');
    return;
  }

  const nav = document.createElement('div');
  nav.className = `${PREFIX}-nav`;
  const navList = document.createElement('ul');
  navList.className = `${PREFIX}-nav-list`;
  navList.setAttribute('role', 'tablist');
  nav.append(navList);

  const panels = document.createElement('div');
  panels.className = `${PREFIX}-panels`;

  tabRows.forEach((tabRow, index) => {
    const cta = readCta(tabRow);
    const tileRows = collectTiles(tabRow);

    // Copy that is not a tile and not the CTA: tab name, then title.
    const copy = [...tabRow.children]
      .filter((cell) => !cell.querySelector('picture, img') && !cell.querySelector('a'))
      .flatMap((cell) => [...cell.querySelectorAll('p, div')].map((el) => el.textContent.trim()))
      .filter(Boolean);
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
    moveInstrumentation(tabRow, panel);

    if (title) {
      const h2 = document.createElement('h2');
      h2.className = `${PREFIX}-panel-title`;
      h2.textContent = title;
      panel.append(h2);
    }

    if (tileRows.length) {
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
