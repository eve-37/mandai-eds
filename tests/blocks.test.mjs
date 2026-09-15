/**
 * Block decoration tests.
 *
 * The boilerplate ships lint and nothing else, so decorate() functions have no
 * way to be checked other than by publishing and looking. These tests run them
 * against markup copied verbatim from what AEM actually published, so the input
 * is observed rather than imagined.
 *
 * Run with: npm test
 */
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push(['pass', name]);
  } catch (err) {
    results.push(['FAIL', `${name}\n    ${err.message}`]);
  }
}

/** Runs a block's decorate() over some markup and hands back the block element. */
async function decorateBlock(path, html) {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
  global.window = dom.window;
  global.document = dom.window.document;
  global.requestAnimationFrame = (f) => { f(); return 1; };
  global.cancelAnimationFrame = () => {};
  const { default: decorate } = await import(path);
  const block = dom.window.document.body.firstElementChild;
  decorate(block);
  return block;
}

/* ------------------------------------------------------------------ *
 * Primary Button - markup verbatim from the published page.
 * ------------------------------------------------------------------ */
const PRIMARY_BUTTON = `<div class="primary-button">
  <div><div><a href="/">index page</a></div></div>
  <div><div>green</div></div>
  <div><div>center</div></div>
  <div><div>true</div></div>
</div>`;

const pb = await decorateBlock('../blocks/primary-button/primary-button.js', PRIMARY_BUTTON);

test('primary-button: link and text come off the one collapsed anchor', () => {
  const a = pb.querySelector('a');
  assert.equal(a.getAttribute('href'), '/');
  assert.equal(a.textContent, 'index page');
});

test('primary-button: variant and position are read, not defaulted', () => {
  assert.ok(pb.querySelector('.rb-cta.green'));
  assert.ok(pb.querySelector('.primary-button-container.center'));
});

test('primary-button: linkNewTab opens in a new tab, with rel set', () => {
  const a = pb.querySelector('a');
  assert.equal(a.getAttribute('target'), '_blank');
  assert.equal(a.getAttribute('rel'), 'noreferrer');
});

const pbEmpty = await decorateBlock('../blocks/primary-button/primary-button.js', '<div class="primary-button"></div>');
test('primary-button: renders nothing when unconfigured outside the editor', () => {
  assert.equal(pbEmpty.children.length, 0);
});

const pbEdit = await decorateBlock(
  '../blocks/primary-button/primary-button.js',
  '<div class="primary-button" data-aue-resource="urn:x"></div>',
);
test('primary-button: unconfigured block stays selectable in the editor', () => {
  assert.ok(pbEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * Four Column Tiles.
 *
 * Parent rows are verbatim from the published page. Tile rows follow the shape
 * the boilerplate's cards block produces on that same page: one row per child,
 * one cell per field group. data-aue-* attributes are added as the Universal
 * Editor adds them, to prove instrumentation survives.
 * ------------------------------------------------------------------ */
const tileRow = (n) => `<div data-aue-resource="urn:aemconnection:/content/tile${n}" data-aue-type="component" data-aue-model="tile" data-aue-label="Tile">
  <div><picture><img src="/tile${n}.png" alt="Alt ${n}"></picture></div>
  <div>Caption ${n}</div>
</div>`;

const FOUR_COL = (tiles) => `<div class="four-column-tiles">
  <div><div>Testing Four Column Titles</div></div>
  <div><div>more description here</div></div>
  <div><div>mask-2</div></div>
  <div><div><p><a href="/">index page</a></p><p>green</p><p>true</p></div></div>
  ${tiles.map(tileRow).join('\n')}
</div>`;

const ft = await decorateBlock('../blocks/four-column-tiles/four-column-tiles.js', FOUR_COL([1, 2, 3]));

test('four-column-tiles: parent text is not swallowed by the tiles', () => {
  assert.equal(ft.querySelector('.four-column-tiles-title').textContent, 'Testing Four Column Titles');
  assert.equal(ft.querySelector('.four-column-tiles-subtitle').textContent, 'more description here');
});

test('four-column-tiles: mask select drives the shared section class', () => {
  assert.ok(ft.querySelector('.rb-section.mask-2.bg-green'));
});

test('four-column-tiles: grouped cta_ cell yields href, text, variant and new-tab', () => {
  const a = ft.querySelector('.four-column-tiles-cta a');
  assert.equal(a.getAttribute('href'), '/');
  assert.equal(a.textContent, 'index page');
  assert.equal(a.getAttribute('target'), '_blank');
  assert.ok(ft.querySelector('.rb-cta.green'), 'variant should be green, not the default');
});

test('four-column-tiles: every tile becomes a list item', () => {
  const items = ft.querySelectorAll('li.four-column-tiles-item');
  assert.equal(items.length, 3);
});

test('four-column-tiles: instrumentation moves onto the new list item', () => {
  const items = [...ft.querySelectorAll('li.four-column-tiles-item')];
  items.forEach((li, i) => {
    assert.equal(li.getAttribute('data-aue-resource'), `urn:aemconnection:/content/tile${i + 1}`);
    assert.equal(li.getAttribute('data-aue-type'), 'component');
    assert.equal(li.getAttribute('data-aue-model'), 'tile');
  });
});

test('four-column-tiles: instrumentation is MOVED, not copied', () => {
  // A duplicate data-aue-resource makes the editor select the wrong element.
  const dupes = ft.querySelectorAll('[data-aue-resource="urn:aemconnection:/content/tile1"]');
  assert.equal(dupes.length, 1);
});

test('four-column-tiles: image and caption both survive', () => {
  const first = ft.querySelector('li.four-column-tiles-item');
  assert.equal(first.querySelector('img').getAttribute('src'), '/tile1.png');
  assert.equal(first.querySelector('.four-column-tiles-item-name h4').textContent, 'Caption 1');
});

test('four-column-tiles: one dot per tile', () => {
  assert.equal(ft.querySelectorAll('.rb-dot').length, 3);
});

const ftOne = await decorateBlock('../blocks/four-column-tiles/four-column-tiles.js', FOUR_COL([1]));
test('four-column-tiles: a single tile gets no dots', () => {
  assert.equal(ftOne.querySelectorAll('.rb-dot').length, 0);
  assert.equal(ftOne.querySelectorAll('li.four-column-tiles-item').length, 1);
});

const ftNone = await decorateBlock('../blocks/four-column-tiles/four-column-tiles.js', FOUR_COL([]));
test('four-column-tiles: parent still renders with no tiles at all', () => {
  assert.ok(ftNone.querySelector('.four-column-tiles-title'));
  assert.equal(ftNone.querySelectorAll('li').length, 0);
});

/* A tile the author has barely filled in must still be a tile. AEM drops empty
 * cells, so such a row can collapse to a single cell - which is exactly what a
 * parent property row looks like. Splitting by position rather than cell count
 * is what keeps it a tile. */
const SPARSE_TILES = `<div class="four-column-tiles">
  <div><div>Title here</div></div>
  <div><div></div></div>
  <div><div></div></div>
  <div><div></div></div>
  <div><div><picture><img src="/a.png" alt=""></picture></div><div>Has image</div></div>
  <div data-aue-resource="urn:x"><div>No image yet</div></div>
</div>`;
const ftBlank = await decorateBlock('../blocks/four-column-tiles/four-column-tiles.js', SPARSE_TILES);
test('four-column-tiles: a tile collapsed to one cell is still a tile', () => {
  assert.equal(ftBlank.querySelectorAll('li.four-column-tiles-item').length, 2);
  assert.equal(ftBlank.querySelector('.four-column-tiles-title').textContent, 'Title here');
});

/* ------------------------------------------------------------------ *
 * Testimonial - verbatim from the published page.
 *
 * Regression: three Testimony children were authored with both fields blank.
 * AEM collapsed each to `<div><div></div></div>`, the cell-count rule read them
 * as parent properties, and all three quotes disappeared with no error.
 * ------------------------------------------------------------------ */
const TESTIMONIAL_BLANK = `<div class="testimonial">
  <div><div>This is a testimonial</div></div>
  <div data-aue-resource="urn:t1"><div></div></div>
  <div data-aue-resource="urn:t2"><div></div></div>
  <div data-aue-resource="urn:t3"><div></div></div>
</div>`;
const tsBlank = await decorateBlock('../blocks/testimonial/testimonial.js', TESTIMONIAL_BLANK);
test('testimonial: blank quotes collapsed to one cell are not lost', () => {
  assert.equal(tsBlank.querySelectorAll('li.testimonial-item').length, 3);
  assert.equal(tsBlank.querySelector('.testimonial-heading').textContent, 'This is a testimonial');
});

test('testimonial: a blank quote keeps its instrumentation so it can be edited', () => {
  const items = [...tsBlank.querySelectorAll('li.testimonial-item')];
  assert.deepEqual(items.map((li) => li.getAttribute('data-aue-resource')), ['urn:t1', 'urn:t2', 'urn:t3']);
});

/* Verbatim from the published page: a quote with a message but no name. The
 * trailing empty cell is dropped, so the row again looks like a parent row. */
const TESTIMONIAL_NO_NAME = `<div class="testimonial">
  <div><div>This is a testimonial</div></div>
  <div><div>This is testimony A</div></div>
  <div><div>This is testimony B</div></div>
</div>`;
const tsNoName = await decorateBlock('../blocks/testimonial/testimonial.js', TESTIMONIAL_NO_NAME);
test('testimonial: a quote with no name still renders its message', () => {
  const items = [...tsNoName.querySelectorAll('li.testimonial-item')];
  assert.equal(items.length, 2);
  assert.equal(items[0].querySelector('blockquote').textContent, 'This is testimony A');
  assert.equal(items[0].querySelector('cite').textContent, '');
  assert.equal(tsNoName.querySelector('.testimonial-heading').textContent, 'This is a testimonial');
});

const TESTIMONIAL = `<div class="testimonial">
  <div><div>What they say</div></div>
  <div><div>Best day out.</div><div>Aisha</div></div>
  <div><div>The kids loved it.</div><div>Ben</div></div>
</div>`;
const ts = await decorateBlock('../blocks/testimonial/testimonial.js', TESTIMONIAL);
test('testimonial: message and name land in blockquote and cite', () => {
  const first = ts.querySelector('li.testimonial-item');
  assert.equal(first.querySelector('blockquote').textContent, 'Best day out.');
  assert.equal(first.querySelector('cite').textContent, 'Aisha');
});

/* ------------------------------------------------------------------ *
 * Three Column Tiles - verbatim from the published page. Each child carries
 * its own CTA, which is what separates it from four-column-tiles.
 * ------------------------------------------------------------------ */
const THREE_COL = `<div class="three-column-tiles">
  <div><div>Three Column Tiles</div></div>
  <div><div>more description here</div></div>
  <div><div>mask-2</div></div>
  <div data-aue-resource="urn:c1"><div><picture><img src="/1.png" alt="iceberg"></picture></div><div>image 1</div><div><p><a href="/">View More Details</a></p><p>green</p></div></div>
  <div data-aue-resource="urn:c2"><div><picture><img src="/2.png" alt="headless"></picture></div><div>image 2</div><div><p><a href="/">View More Details</a></p><p>yellow</p></div></div>
</div>`;
const tc = await decorateBlock('../blocks/three-column-tiles/three-column-tiles.js', THREE_COL);

test('three-column-tiles: parent copy and mask are read', () => {
  assert.equal(tc.querySelector('.three-column-tiles-title').textContent, 'Three Column Tiles');
  assert.equal(tc.querySelector('.three-column-tiles-subtitle').textContent, 'more description here');
  assert.ok(tc.querySelector('.rb-section.mask-2'));
});

test('three-column-tiles: there is no parent CTA - the source dialog has none', () => {
  assert.equal(tc.querySelector('.three-column-tiles-cta'), null);
  // Every button on the block belongs to a tile.
  assert.equal(tc.querySelectorAll('.rb-cta').length, tc.querySelectorAll('li .rb-cta').length);
});

test('three-column-tiles: each tile keeps its own caption and CTA variant', () => {
  const items = [...tc.querySelectorAll('li.three-column-tiles-item')];
  assert.equal(items.length, 2);
  assert.equal(items[0].querySelector('h4').textContent, 'image 1');
  assert.ok(items[0].querySelector('.rb-cta.green'));
  assert.ok(items[1].querySelector('.rb-cta.yellow'));
});

test('three-column-tiles: each tile CTA is the narrow secondary button', () => {
  // ThreeColTiles/Tile.js is the only rb-aem component importing SecondaryButton.
  const items = [...tc.querySelectorAll('li.three-column-tiles-item')];
  assert.ok(items.every((li) => li.querySelector('.rb-cta.rb-cta-narrow')));
  assert.equal(tc.querySelectorAll('li .rb-cta-wide').length, 0);
});

test('three-column-tiles: the tile CTA text is not mistaken for the caption', () => {
  const first = tc.querySelector('li.three-column-tiles-item');
  assert.notEqual(first.querySelector('h4').textContent, 'View More Details');
});

/* ------------------------------------------------------------------ *
 * Tabs - tab rows verbatim from the published page.
 *
 * A block item cannot itself be a container, so Tabs > Tab > Tab Tile is
 * unauthorable: the editor offers no insert under a Tab. Tabs and tiles are
 * therefore siblings, and each tile joins the tab above it.
 * ------------------------------------------------------------------ */
const tabsTabRow = (n, variant) => `<div data-aue-resource="urn:tab${n}" data-aue-model="rbtab"><div><p>Tab ${n}</p><p>Panel ${n}</p></div><div><p><a href="/">View more</a></p><p>${variant}</p><p>true</p></div></div>`;
const tabsTileRow = (n) => `<div data-aue-resource="urn:tile${n}" data-aue-model="rbtabtile"><div><p>Tile ${n}</p><p>Tile copy ${n}</p></div><div><picture><img src="/tile${n}.png" alt=""></picture></div><div>tile-center</div></div>`;

const TABS = `<div class="tabs">
  ${tabsTabRow(1, 'green')}${tabsTileRow(1)}${tabsTileRow(2)}
  ${tabsTabRow(2, 'yellow')}${tabsTileRow(3)}
</div>`;
const tb = await decorateBlock('../blocks/tabs/tabs.js', TABS);

test('tabs: one nav button and one panel per tab', () => {
  assert.equal(tb.querySelectorAll('.tabs-nav-item').length, 2);
  assert.equal(tb.querySelectorAll('.tabs-panel').length, 2);
});

test('tabs: tabName labels the button, title heads the panel', () => {
  assert.equal(tb.querySelector('.tabs-nav-item').textContent, 'Tab 1');
  assert.equal(tb.querySelector('.tabs-panel-title').textContent, 'Panel 1');
});

test('tabs: each tile joins the tab above it, not the first tab', () => {
  const panels = [...tb.querySelectorAll('.tabs-panel')];
  assert.equal(panels[0].querySelectorAll('.tabs-tile').length, 2);
  assert.equal(panels[1].querySelectorAll('.tabs-tile').length, 1);
  assert.equal(panels[1].querySelector('.tabs-tile h3').textContent, 'Tile 3');
});

test('tabs: a tile is never mistaken for a tab, and never adds one', () => {
  assert.equal(tb.querySelectorAll('.tabs-nav-item').length, 2);
  assert.deepEqual(
    [...tb.querySelectorAll('.tabs-nav-item')].map((b) => b.textContent),
    ['Tab 1', 'Tab 2'],
  );
});

test('tabs: the align prefix is stripped before it reaches the class', () => {
  assert.ok(tb.querySelector('.tabs-tile.align-center'));
  assert.equal(tb.querySelectorAll('.tabs-tile.align-tile-center').length, 0);
});

test('tabs: no tile is nested inside a tab, or the editor cannot move it', () => {
  // A tile's nearest instrumented ancestor must be the block - the container it
  // belongs to in the model - and never the tab whose panel it renders in.
  [...tb.querySelectorAll('.tabs-tile')].forEach((tile) => {
    const owner = tile.parentElement.closest('[data-aue-resource]');
    assert.equal(owner, null, 'a tile must not sit inside an instrumented tab');
  });
  // ...and the tabs are still instrumented, on the head rather than the panel.
  assert.equal(tb.querySelectorAll('.tabs-panel-head[data-aue-resource]').length, 2);
  assert.equal(tb.querySelectorAll('.tabs-panel[data-aue-resource]').length, 0);
});

test('tabs: a tile keeps its image, copy and instrumentation', () => {
  const tile = tb.querySelector('.tabs-tile');
  assert.equal(tile.querySelector('img').getAttribute('src'), '/tile1.png');
  assert.equal(tile.querySelector('h3').textContent, 'Tile 1');
  assert.equal(tile.querySelector('p').textContent, 'Tile copy 1');
  assert.equal(tile.getAttribute('data-aue-resource'), 'urn:tile1');
});

/* A tab whose title is left blank leaves a single bare value in the cell, with
 * no <p> at all - the tab name must still be found. */
const TAB_SPARSE = '<div class="tabs"><div><div>Only a name</div></div></div>';
const tbSparse = await decorateBlock('../blocks/tabs/tabs.js', TAB_SPARSE);
test('tabs: a tab with only a name still gets its label', () => {
  assert.equal(tbSparse.querySelector('.tabs-nav-item').textContent, 'Only a name');
});

/* The editor must render the same as the published page: one panel at a time.
 * Every panel was briefly shown at once as a drop-target workaround, which made
 * the editor preview misrepresent the page. */
const tbEdit = await decorateBlock(
  '../blocks/tabs/tabs.js',
  `<div class="tabs" data-aue-resource="urn:tabs">${tabsTabRow(1, 'green')}${tabsTabRow(2, 'yellow')}</div>`,
);
test('tabs: the editor hides all but the selected panel, as the page does', () => {
  const panels = [...tbEdit.querySelectorAll('.tabs-panel')];
  assert.equal(panels.length, 2);
  assert.equal(panels[0].hidden, false);
  assert.equal(panels[1].hidden, true);
  assert.ok(!tbEdit.classList.contains('tabs-editing'));
  assert.equal(tbEdit.querySelectorAll('.tabs-panel-label').length, 0);
});

test('tabs: a tab with no tiles still gets an empty grid to drop into', () => {
  const grids = tbEdit.querySelectorAll('.tabs-tiles');
  assert.equal(grids.length, 2);
  assert.equal(grids[1].children.length, 0);
});

test('tabs: clicking a nav button swaps which panel is shown', () => {
  const buttons = [...tbEdit.querySelectorAll('.tabs-nav-item')];
  buttons[1].click();
  const panels = [...tbEdit.querySelectorAll('.tabs-panel')];
  assert.equal(panels[0].hidden, true);
  assert.equal(panels[1].hidden, false);
  assert.equal(buttons[1].getAttribute('aria-selected'), 'true');
  buttons[0].click();
});

/* A tile that has just been added has no align value written yet. In the editor
 * it must still read as a tile, or it shows up as a spurious extra tab until
 * the author types something. */
const TAB_NEW_TILE = `<div class="tabs" data-aue-resource="urn:tabs">
  ${tabsTabRow(1, 'green')}
  <div data-aue-resource="urn:new" data-aue-model="rbtabtile"><div></div></div>
</div>`;
const tbNew = await decorateBlock('../blocks/tabs/tabs.js', TAB_NEW_TILE);
test('tabs: an empty new tile is a tile, not an extra tab', () => {
  assert.equal(tbNew.querySelectorAll('.tabs-nav-item').length, 1);
  assert.equal(tbNew.querySelectorAll('.tabs-tile').length, 1);
});

/* The same row on a published page has no data-aue-* at all, so the align
 * keyword is what identifies it there. */
const TAB_PUBLISHED_TILE = `<div class="tabs">
  ${tabsTabRow(1, 'green').replace(/ data-aue-[a-z]+="[^"]*"/g, '')}
  <div><div><p>Tile A</p></div><div>tile-right</div></div>
</div>`;
const tbPub = await decorateBlock('../blocks/tabs/tabs.js', TAB_PUBLISHED_TILE);
test('tabs: a published tile is identified without any instrumentation', () => {
  assert.equal(tbPub.querySelectorAll('.tabs-nav-item').length, 1);
  assert.ok(tbPub.querySelector('.tabs-tile.align-right'));
});

/* A tile dragged above every tab must not vanish. */
const TAB_ORPHAN = `<div class="tabs">${tabsTileRow(9)}${tabsTabRow(1, 'green')}</div>`;
const tbOrphan = await decorateBlock('../blocks/tabs/tabs.js', TAB_ORPHAN);
test('tabs: a tile before any tab opens an unnamed tab rather than disappearing', () => {
  assert.equal(tbOrphan.querySelectorAll('.tabs-nav-item').length, 2);
  assert.equal(tbOrphan.querySelector('.tabs-panel .tabs-tile h3').textContent, 'Tile 9');
});

test('tabs: only the first panel is visible, and aria agrees', () => {
  const panels = [...tb.querySelectorAll('.tabs-panel')];
  assert.equal(panels[0].hidden, false);
  assert.equal(panels[1].hidden, true);
  const buttons = [...tb.querySelectorAll('.tabs-nav-item')];
  assert.equal(buttons[0].getAttribute('aria-selected'), 'true');
  assert.equal(buttons[1].getAttribute('aria-selected'), 'false');
});

test('tabs: each panel keeps its own CTA variant', () => {
  const panels = [...tb.querySelectorAll('.tabs-panel')];
  assert.ok(panels[0].querySelector('.rb-cta.green'));
  assert.ok(panels[1].querySelector('.rb-cta.yellow'));
});

/* ------------------------------------------------------------------ *
 * One Column Banner Carousel - verbatim from the published page. Four grouped
 * cells, so nothing can be read by position within the row.
 * ------------------------------------------------------------------ */
const BANNER = (n) => `<div data-aue-resource="urn:b${n}">
  <div><p>Carousel ${n}</p><p>more description here</p></div>
  <div><p><picture><img src="/desktop${n}.png?width=750&format=png&optimize=medium" alt=""></picture></p><p><picture><img src="/mobile${n}.png?width=750&format=png&optimize=medium" alt=""></picture></p></div>
  <div><p><a href="/">View More</a></p><p>green</p><p>true</p></div>
</div>`;
/* mask, align and gradient are the CAROUSEL's own three property rows - the
 * source dialog puts them outside the banners multifield, so every slide
 * shares them. */
const CAROUSEL_STYLE = `
  <div><div>mask-2</div></div>
  <div><div>center</div></div>
  <div><div>false</div></div>`;
const carousel = await decorateBlock(
  '../blocks/one-column-banner-carousel/one-column-banner-carousel.js',
  `<div class="one-column-banner-carousel">${CAROUSEL_STYLE}${BANNER(1)}${BANNER(2)}</div>`,
);

test('one-column-banner-carousel: every banner becomes a slide', () => {
  assert.equal(carousel.querySelectorAll('li.one-column-banner-carousel-item').length, 2);
  assert.equal(carousel.querySelectorAll('.rb-dot').length, 2);
});

test('one-column-banner-carousel: grouped copy cell splits into title and description', () => {
  const first = carousel.querySelector('li.one-column-banner-carousel-item');
  assert.equal(first.querySelector('h2').textContent, 'Carousel 1');
  assert.equal(first.querySelector('p').textContent, 'more description here');
});

test('one-column-banner-carousel: desktop and mobile backgrounds are told apart', () => {
  const section = carousel.querySelector('li .rb-section');
  assert.match(section.style.getPropertyValue('--banner-bg-desktop'), /desktop1\.png\?.*width=2000.*format=webply/);
  assert.match(section.style.getPropertyValue('--banner-bg-mobile'), /mobile1\.png\?.*width=750.*format=webply/);
});

test('one-column-banner-carousel: every slide shares the carousel style', () => {
  const items = [...carousel.querySelectorAll('li.one-column-banner-carousel-item')];
  assert.ok(items.every((li) => li.querySelector('.one-column-banner-carousel-content.align-center')));
  assert.ok(items.every((li) => li.querySelector('.rb-section.mask-2')));
  assert.ok(items.every((li) => !li.querySelector('.rb-section').classList.contains('has-gradient')));
});

test('one-column-banner-carousel: style keywords are not rendered as copy', () => {
  const first = carousel.querySelector('li.one-column-banner-carousel-item');
  assert.doesNotMatch(first.textContent, /mask-2|center|false/);
});

/* ------------------------------------------------------------------ *
 * Missions - verbatim from the published page. Two separate CTA groups, and a
 * single content_ cell holding title, description and mask together.
 * ------------------------------------------------------------------ */
const MISSIONS = `<div class="missions">
  <div><div><p>Missions</p><p>more description here</p><p>mask-1</p></div></div>
  <div><div><picture><img src="/hero.png" alt="hero"></picture></div></div>
  <div><div><p><a href="/">View More</a></p><p>green</p><p>true</p></div></div>
  <div><div><p><a href="/detail">More Detailed View More</a></p><p>green</p><p>true</p></div></div>
  <div data-aue-resource="urn:m1"><div><p>Mission one</p><p>Jan 2026</p><p>Singapore</p><p>What we did</p></div><div><picture><img src="/m1.png" alt=""></picture></div><div><picture><img src="/l1.png" alt=""></picture><picture><img src="/l2.png" alt=""></picture></div></div>
</div>`;
const ms = await decorateBlock('../blocks/missions/missions.js', MISSIONS);

test('missions: uses its own band, not the brown one', () => {
  assert.ok(ms.querySelector('.rb-section.bg-missions'));
  assert.equal(ms.querySelectorAll('.bg-brown').length, 0);
});

test('missions: the grouped content_ cell splits into title, description and mask', () => {
  assert.equal(ms.querySelector('.missions-info h3').textContent, 'Missions');
  assert.equal(ms.querySelector('.missions-info p').textContent, 'more description here');
  assert.ok(ms.querySelector('.rb-section.mask-1'));
});

test('missions: the two CTA groups do not collapse into one', () => {
  assert.equal(ms.querySelector('.missions-info .rb-cta a').getAttribute('href'), '/');
  assert.equal(ms.querySelector('.missions-detail-cta .rb-cta a').getAttribute('href'), '/detail');
});

test('missions: the banner image is the parent image, not a mission image', () => {
  assert.equal(ms.querySelector('.missions-banner img').getAttribute('src'), '/hero.png');
});

test('missions: a mission separates its own image from its logos', () => {
  const item = ms.querySelector('li.missions-item');
  assert.equal(item.querySelector('.missions-item-media img').getAttribute('src'), '/m1.png');
  assert.equal(item.querySelectorAll('.missions-item-logos picture').length, 2);
});

/* Verbatim from the published page: one mission, one logo. Both picture cells
 * then hold exactly one picture, so counting pictures cannot tell them apart -
 * and the logo used to disappear. */
const MISSION_ONE_LOGO = `<div class="missions">
  <div><div><p>Missions</p><p>more description here</p><p>mask-1</p></div></div>
  <div><div><picture><img src="/hero.png" alt="hero"></picture></div></div>
  <div><div><p><a href="/">View More</a></p><p>green</p></div></div>
  <div><div><p><a href="/detail">More Detailed</a></p><p>green</p></div></div>
  <div><div><p>Mission Child 1</p><p>12/10/2026 - 14/10/2026</p><p>Mandai Zoo</p><p>Please come look look see see</p></div><div><picture><img src="/photo.png" alt=""></picture></div><div><picture><img src="/logo.png" alt=""></picture></div></div>
</div>`;
const msOne = await decorateBlock('../blocks/missions/missions.js', MISSION_ONE_LOGO);
test('missions: a single logo is not mistaken for the mission photo', () => {
  const item = msOne.querySelector('li.missions-item');
  assert.equal(item.querySelector('.missions-item-media img').getAttribute('src'), '/photo.png');
  assert.equal(item.querySelectorAll('.missions-item-logos img').length, 1);
  assert.equal(item.querySelector('.missions-item-logos img').getAttribute('src'), '/logo.png');
});

test('missions: the picture cells are kept out of the copy', () => {
  const item = msOne.querySelector('li.missions-item');
  assert.equal(item.querySelector('h3').textContent, 'Mission Child 1');
  assert.equal(item.querySelector('.missions-item-meta').textContent, '12/10/2026 - 14/10/2026 · Mandai Zoo');
  assert.equal(item.querySelectorAll('.missions-item-body h3').length, 1);
});

test('missions: date and location read as one meta line', () => {
  assert.equal(ms.querySelector('.missions-item-meta').textContent, 'Jan 2026 · Singapore');
});

test('missions: the list starts collapsed behind a real button', () => {
  const toggle = ms.querySelector('.missions-toggle');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(ms.querySelector('.missions-list').hidden, true);
  assert.equal(toggle.getAttribute('aria-controls'), ms.querySelector('.missions-list').id);
});

/* ------------------------------------------------------------------ *
 * The seven single-cell blocks, all verbatim from the published page.
 *
 * Each is four property rows in model order (image-section is one). Nothing is
 * a container, so every row is a parent property - and an empty one is still
 * emitted, which is what makes reading by position safe.
 * ------------------------------------------------------------------ */
const SECONDARY_BUTTON = `<div class="secondary-button">
  <div><div><a href="/">Secondary Button</a></div></div>
  <div><div>green</div></div>
  <div><div>center</div></div>
  <div><div></div></div>
</div>`;
const sb = await decorateBlock('../blocks/secondary-button/secondary-button.js', SECONDARY_BUTTON);
test('secondary-button: renders the link, variant and position', () => {
  assert.equal(sb.querySelector('a').getAttribute('href'), '/');
  assert.ok(sb.querySelector('.rb-cta.green'));
  assert.ok(sb.querySelector('.secondary-button-container.center'));
});
test('secondary-button: an empty new-tab cell does not open a new tab', () => {
  assert.equal(sb.querySelector('a').getAttribute('target'), null);
});

const SUB_HEADER = `<div class="sub-header">
  <div><div>Sub Header</div></div>
  <div><div>more subheader description</div></div>
  <div><div><picture><img src="/desktop.png?width=750&format=png&optimize=medium" alt=""></picture></div></div>
  <div><div><picture><img src="/mobile.png?width=750&format=png&optimize=medium" alt=""></picture></div></div>
</div>`;
const sh = await decorateBlock('../blocks/sub-header/sub-header.js', SUB_HEADER);
/* EDS makes the <img> fallback the smallest, least optimised variant - 750px
 * PNG. A full-bleed desktop band must not load that. */
test('sub-header: the desktop background asks for a 2000px WebP, not the fallback', () => {
  const w = sh.querySelector('.sub-header-wrapper');
  const desktop = w.style.getPropertyValue('--sub-header-bg-desktop');
  assert.match(desktop, /width=2000/);
  assert.match(desktop, /format=webply/);
  assert.doesNotMatch(desktop, /format=png/);
  const mobile = w.style.getPropertyValue('--sub-header-bg-mobile');
  assert.match(mobile, /width=750/);
  assert.match(mobile, /format=webply/);
});

test('sub-header: copy and both backgrounds are read', () => {
  assert.equal(sh.querySelector('.sub-header-heading').textContent, 'Sub Header');
  assert.equal(sh.querySelector('.sub-header-desc').textContent, 'more subheader description');
  const w = sh.querySelector('.sub-header-wrapper');
  assert.match(w.style.getPropertyValue('--sub-header-bg-desktop'), /desktop\.png/);
  assert.match(w.style.getPropertyValue('--sub-header-bg-mobile'), /mobile\.png/);
});

const IMAGE_SECTION = `<div class="image-section">
  <div><div><picture><img src="/pic.png" alt=""></picture></div></div>
</div>`;
const isec = await decorateBlock('../blocks/image-section/image-section.js', IMAGE_SECTION);
test('image-section: the picture survives into the section band', () => {
  assert.equal(isec.querySelector('.image-section-figure img').getAttribute('src'), '/pic.png');
  assert.ok(isec.querySelector('.rb-section'));
});

/* Verbatim: the author filled only the Brightcove account id - its default -
 * and left the video and player ids blank, so the grouped video_ cell holds a
 * single value. Testing "more than one value" read that as copy. */
const MASTHEAD = `<div class="masthead">
  <div><div>A New Video</div></div>
  <div><div>more video description here</div></div>
  <div><div><picture><img src="/poster.png" alt=""></picture></div></div>
  <div><div>906043040001</div></div>
</div>`;
const mh = await decorateBlock('../blocks/masthead/masthead.js', MASTHEAD);
test('masthead: the Brightcove account id never leaks into the copy', () => {
  assert.equal(mh.querySelector('h1').textContent, 'A New Video');
  assert.equal(mh.querySelector('.masthead-content p').textContent, 'more video description here');
  assert.doesNotMatch(mh.querySelector('.masthead-content').textContent, /906043040001/);
});
test('masthead: no video id means poster only, and no player request', () => {
  assert.equal(mh.querySelector('.masthead-media img').getAttribute('src'), '/poster.png');
  assert.equal(mh.querySelector('video-js'), null);
});

const ONE_COL_BANNER = `<div class="one-column-banner">
  <div><div><p>One Column Banner</p><p>just testing this out</p></div></div>
  <div><div><p><picture><img src="/d.png?width=750&format=png&optimize=medium" alt=""></picture></p><p><picture><img src="/m.png?width=750&format=png&optimize=medium" alt=""></picture></p></div></div>
  <div><div>mask-1</div></div>
  <div><div><p><a href="/">View More</a></p><p>green</p><p>true</p></div></div>
</div>`;
const ocb = await decorateBlock('../blocks/one-column-banner/one-column-banner.js', ONE_COL_BANNER);
test('one-column-banner: title and description are separate, not run together', () => {
  assert.equal(ocb.querySelector('h2').textContent, 'One Column Banner');
  assert.equal(ocb.querySelector('.one-column-banner-content p').textContent, 'just testing this out');
});
test('one-column-banner: both backgrounds and the CTA are read', () => {
  const s = ocb.querySelector('.rb-section');
  assert.match(s.style.getPropertyValue('--banner-bg-desktop'), /d\.png\?.*width=2000.*format=webply/);
  assert.match(s.style.getPropertyValue('--banner-bg-mobile'), /m\.png\?.*width=750.*format=webply/);
  assert.equal(ocb.querySelector('.rb-cta a').getAttribute('target'), '_blank');
});

const ONE_COL_FEATURE = `<div class="one-column-feature">
  <div><div>One Column Feature</div></div>
  <div><div>just trying this out</div></div>
  <div><div><picture><img src="/f.png" alt=""></picture></div></div>
  <div><div>mask-1</div></div>
</div>`;
const ocf = await decorateBlock('../blocks/one-column-feature/one-column-feature.js', ONE_COL_FEATURE);
test('one-column-feature: copy and image both land', () => {
  assert.equal(ocf.querySelector('h2').textContent, 'One Column Feature');
  assert.equal(ocf.querySelector('.one-column-feature-desc p').textContent, 'just trying this out');
  assert.equal(ocf.querySelector('.one-column-feature-image img').getAttribute('src'), '/f.png');
});

const ONE_COL_NEWS = `<div class="one-column-news">
  <div><div><p>One Column News</p><p>subtitle here</p><p>more description</p></div></div>
  <div><div><picture><img src="/n.png" alt=""></picture></div></div>
  <div><div>mask-1</div></div>
  <div><div><p><a href="/">View More</a></p><p>green</p></div></div>
</div>`;
const ocn = await decorateBlock('../blocks/one-column-news/one-column-news.js', ONE_COL_NEWS);
test('one-column-news: the three grouped values split into heading, subtitle and copy', () => {
  assert.equal(ocn.querySelector('.one-column-news-heading').textContent, 'One Column News');
  assert.equal(ocn.querySelector('.one-column-news-content h3').textContent, 'subtitle here');
  assert.equal(ocn.querySelector('.one-column-news-content p').textContent, 'more description');
});
test('one-column-news: image and CTA both survive', () => {
  assert.equal(ocn.querySelector('.one-column-news-media img').getAttribute('src'), '/n.png');
  assert.equal(ocn.querySelector('.rb-cta a').textContent, 'View More');
});

/* ------------------------------------------------------------------ *
 * WRS Accordion Tabs - no published markup exists yet (this component has
 * not been authored on a real page), so this fixture is constructed from
 * this codebase's own confirmed grouped-cell shapes (see the four-column-tiles
 * and tabs fixtures above: a plain-text group renders one <p> per field, a
 * reference+Alt pair collapses to a bare <picture>, and an aem-content+Text
 * pair collapses onto the anchor's own textContent) rather than copied from
 * a live page. It should be re-verified against real output once authored.
 * ------------------------------------------------------------------ */
const wrsTabRow = (n, { withCta = true, richDesc = false } = {}) => {
  const desc = richDesc
    ? `<p>Description ${n}</p><p><strong>bold</strong> copy</p>`
    : `<p>Description ${n}</p>`;
  const cta = withCta
    ? `<div><p><a href="/">Learn more ${n}</a></p><p>true</p></div>`
    : '<div></div>';
  return `<div data-aue-resource="urn:tab${n}" data-aue-model="wrsaccordiontab">
    <div><p>Tab ${n}</p><p>Title ${n}</p>${desc}</div>
    <div><picture><img src="/tab${n}.png" alt="Alt ${n}"></picture></div>
    ${cta}
  </div>`;
};

const WRS_ACCORDION_TABS = `<div class="wrs-accordion-tabs">
  <div><div>Accordion Tabs Heading</div></div>
  <div><div>h3</div></div>
  <div><div>false</div></div>
  <div><div>false</div></div>
  ${wrsTabRow(1)}
  ${wrsTabRow(2, { withCta: false, richDesc: true })}
</div>`;
const at = await decorateBlock('../blocks/wrs-accordion-tabs/wrs-accordion-tabs.js', WRS_ACCORDION_TABS);

test('wrs-accordion-tabs: the parent heading uses the selected style tag', () => {
  const heading = at.querySelector('.wrs-accordion-tabs-title');
  assert.equal(heading.tagName, 'H3');
  assert.equal(heading.textContent, 'Accordion Tabs Heading');
});

test('wrs-accordion-tabs: one button and one panel per tab, first active', () => {
  assert.equal(at.querySelectorAll('.wrs-accordion-tabs-btn').length, 2);
  assert.equal(at.querySelectorAll('.wrs-accordion-tabs-panel').length, 2);
  assert.equal(at.querySelector('.wrs-accordion-tabs-item').classList.contains('active'), true);
  assert.equal(at.querySelector('.wrs-accordion-tabs-panel').hidden, false);
  assert.equal(at.querySelectorAll('.wrs-accordion-tabs-panel')[1].hidden, true);
});

test('wrs-accordion-tabs: tab_name labels the button, tab_title heads the panel', () => {
  assert.equal(at.querySelector('.wrs-accordion-tabs-btn').textContent, 'Tab 1');
  assert.equal(at.querySelector('.wrs-accordion-tabs-panel-heading').textContent, 'Title 1');
});

test('wrs-accordion-tabs: the image and CTA both survive on a tab with a CTA', () => {
  const panel = at.querySelector('.wrs-accordion-tabs-panel');
  assert.equal(panel.querySelector('img').getAttribute('src'), '/tab1.png');
  const cta = panel.querySelector('.wrs-accordion-tabs-panel-cta');
  assert.equal(cta.textContent, 'Learn more 1');
  assert.equal(cta.target, '_blank');
});

test('wrs-accordion-tabs: a tab with no CTA renders no CTA link', () => {
  const panel = at.querySelectorAll('.wrs-accordion-tabs-panel')[1];
  assert.equal(panel.querySelector('.wrs-accordion-tabs-panel-cta'), null);
});

test('wrs-accordion-tabs: rich description markup (bold text) survives', () => {
  const panel = at.querySelectorAll('.wrs-accordion-tabs-panel')[1];
  assert.ok(panel.querySelector('.wrs-accordion-tabs-panel-desc strong'));
});

test('wrs-accordion-tabs: instrumentation moves onto the panel head, not the panel', () => {
  assert.equal(at.querySelectorAll('.wrs-accordion-tabs-panel-head[data-aue-resource]').length, 2);
  assert.equal(at.querySelectorAll('.wrs-accordion-tabs-panel[data-aue-resource]').length, 0);
});

test('wrs-accordion-tabs: clicking a tab switches the active panel', () => {
  const buttons = [...at.querySelectorAll('.wrs-accordion-tabs-btn')];
  buttons[1].click();
  const panels = [...at.querySelectorAll('.wrs-accordion-tabs-panel')];
  assert.equal(panels[0].hidden, true);
  assert.equal(panels[1].hidden, false);
  assert.equal(buttons[1].getAttribute('aria-selected'), 'true');
  assert.equal(buttons[0].getAttribute('aria-selected'), 'false');
  // Restore state for any later assertions against `at`.
  buttons[0].click();
});

/* A block authored with no tabs yet must still be selectable in the editor. */
const WRS_ACCORDION_TABS_EMPTY = '<div class="wrs-accordion-tabs" data-aue-resource="urn:block1"><div><div>Heading only</div></div><div><div></div></div><div><div></div></div><div><div></div></div></div>';
const atEmpty = await decorateBlock('../blocks/wrs-accordion-tabs/wrs-accordion-tabs.js', WRS_ACCORDION_TABS_EMPTY);
test('wrs-accordion-tabs: an unconfigured block with a heading stays selectable', () => {
  assert.equal(atEmpty.querySelector('.wrs-accordion-tabs-title').textContent, 'Heading only');
  assert.ok(atEmpty.querySelector('.rb-placeholder'));
});

/* ------------------------------------------------------------------ *
 * WRS Admission Types - no published markup exists yet (this component has
 * not been authored on a real page), so this fixture is constructed from
 * this codebase's own confirmed cell shapes rather than copied from a live
 * page: the parent has no fields of its own (see the `cards` block, the
 * confirmed shape for a parent with no model), and each of the 4 child
 * fields is a single, ungrouped field, which - per the four-column-tiles
 * `tileRow` caption cell and the primary-button per-field cells above -
 * renders as bare text directly inside its cell div, with no wrapping <p>.
 * It should be re-verified against real output once this block has been
 * authored once.
 * ------------------------------------------------------------------ */
const watRow = (n, {
  title = `Type ${n}`,
  path = `/content/wrs/en/tickets/type-${n}`,
  newTab = 'false',
  description = `Description ${n}`,
} = {}) => `<div data-aue-resource="urn:item${n}" data-aue-model="wrsadmissiontype">
  <div>${title}</div>
  <div>${path}</div>
  <div>${newTab}</div>
  <div>${description}</div>
</div>`;

const WRS_ADMISSION_TYPES = `<div class="wrs-admission-types">
  ${watRow(1, { newTab: 'true' })}
  ${watRow(2, { path: '', newTab: 'false', description: '' })}
</div>`;
const wat = await decorateBlock('../blocks/wrs-admission-types/wrs-admission-types.js', WRS_ADMISSION_TYPES);

test('wrs-admission-types: every item renders with its own title and description', () => {
  const items = wat.querySelectorAll('.wrs-admission-types-item');
  assert.equal(items.length, 2);
  assert.equal(items[0].querySelector('.wrs-admission-types-title a').textContent, 'Type 1');
  // resolveHref() appends .html to internal /content paths, per every other block's CTA.
  assert.equal(items[0].querySelector('.wrs-admission-types-title a').getAttribute('href'), '/content/wrs/en/tickets/type-1.html');
  assert.equal(items[0].querySelector('.wrs-admission-types-desc').textContent, 'Description 1');
});

test('wrs-admission-types: isOpenNewTab true opens the link in a new tab, with rel set', () => {
  const items = wat.querySelectorAll('.wrs-admission-types-item');
  const a = items[0].querySelector('.wrs-admission-types-title a');
  assert.equal(a.getAttribute('target'), '_blank');
  assert.equal(a.getAttribute('rel'), 'noreferrer');
});

test('wrs-admission-types: isOpenNewTab false does not add a target', () => {
  const items = wat.querySelectorAll('.wrs-admission-types-item');
  const a = items[1].querySelector('.wrs-admission-types-title a');
  assert.equal(a.getAttribute('target'), null);
});

test('wrs-admission-types: a blank description renders no description block', () => {
  const items = wat.querySelectorAll('.wrs-admission-types-item');
  assert.equal(items[1].querySelector('.wrs-admission-types-desc'), null);
  // Title still renders even with a blank path/description alongside it.
  assert.equal(items[1].querySelector('.wrs-admission-types-title a').textContent, 'Type 2');
});

test('wrs-admission-types: instrumentation moves onto each item, not the row it replaces', () => {
  const items = [...wat.querySelectorAll('.wrs-admission-types-item')];
  assert.deepEqual(items.map((el) => el.getAttribute('data-aue-resource')), ['urn:item1', 'urn:item2']);
  // A duplicate data-aue-resource makes the editor select the wrong element.
  assert.equal(wat.querySelectorAll('[data-aue-resource="urn:item1"]').length, 1);
});

const watEmpty = await decorateBlock('../blocks/wrs-admission-types/wrs-admission-types.js', '<div class="wrs-admission-types"></div>');
test('wrs-admission-types: renders nothing when unconfigured outside the editor', () => {
  assert.equal(watEmpty.children.length, 0);
});

const watEdit = await decorateBlock(
  '../blocks/wrs-admission-types/wrs-admission-types.js',
  '<div class="wrs-admission-types" data-aue-resource="urn:block1"></div>',
);
test('wrs-admission-types: unconfigured block stays selectable in the editor', () => {
  assert.ok(watEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * WRS Featured Listing.
 *
 * Content-Fragment-backed: none of this component's real content (header,
 * description, images) has ever been authored or published, because
 * decorate() deliberately does not resolve the Content Fragment yet (see
 * wrs-featured-listing.js and docs/wrs-migration-notes.md
 * "## featuredlistingv2"). These fixtures are therefore constructed from
 * this repo's own confirmed single-`aem-content`-field cell shape (the same
 * `<div><div><a href="...">label</a></div></div>` shape secondary-button and
 * four-column-tiles' cta_link cell use), not copied from a published page,
 * and must be re-verified once a real page authors this block AND once the
 * CF resolution seam is filled in.
 * ------------------------------------------------------------------ */
const wflItemRow = (n, path) => `<div data-aue-resource="urn:item${n}" data-aue-model="wrsfeaturedlistingitem"><div><a href="${path}">${path}</a></div></div>`;

const WFL = `<div class="wrs-featured-listing">
  ${wflItemRow(1, '/content/dam/fragments/zones/lions')}
  ${wflItemRow(2, '/content/dam/fragments/zones/tigers')}
</div>`;

const wfl = await decorateBlock('../blocks/wrs-featured-listing/wrs-featured-listing.js', WFL);

test('wrs-featured-listing: one item per authored row, each holding its CF path', () => {
  const labels = [...wfl.querySelectorAll('.wrs-featured-listing-unresolved-label')].map((el) => el.textContent);
  assert.deepEqual(labels, [
    'Content Fragment not resolved: /content/dam/fragments/zones/lions',
    'Content Fragment not resolved: /content/dam/fragments/zones/tigers',
  ]);
});

test('wrs-featured-listing: a /content/dam path is the expected shape here, not a broken row', () => {
  // Unlike every other block in this repo, a DAM path in this cell is
  // correct - it is the authored Content Fragment reference, not a
  // misread row. The item still renders (as unresolved), it is not dropped.
  assert.equal(wfl.querySelectorAll('.wrs-featured-listing-item').length, 2);
});

test('wrs-featured-listing: instrumentation moves onto each item, not the row it replaces', () => {
  const items = [...wfl.querySelectorAll('.wrs-featured-listing-item')];
  assert.deepEqual(items.map((el) => el.getAttribute('data-aue-resource')), ['urn:item1', 'urn:item2']);
  assert.equal(wfl.querySelectorAll('[data-aue-resource="urn:item1"]').length, 1);
});

const wflBlankRow = '<div data-aue-resource="urn:item3" data-aue-model="wrsfeaturedlistingitem"><div></div></div>';
const wflBlank = await decorateBlock(
  '../blocks/wrs-featured-listing/wrs-featured-listing.js',
  `<div class="wrs-featured-listing">${wflBlankRow}</div>`,
);
test('wrs-featured-listing: a row with no fragment picked yet still renders, not crashes', () => {
  const label = wflBlank.querySelector('.wrs-featured-listing-unresolved-label');
  assert.equal(label.textContent, 'No Content Fragment selected');
});

const wflEmpty = await decorateBlock('../blocks/wrs-featured-listing/wrs-featured-listing.js', '<div class="wrs-featured-listing"></div>');
test('wrs-featured-listing: renders nothing when unconfigured outside the editor', () => {
  assert.equal(wflEmpty.children.length, 0);
});

const wflEdit = await decorateBlock(
  '../blocks/wrs-featured-listing/wrs-featured-listing.js',
  '<div class="wrs-featured-listing" data-aue-resource="urn:block1"></div>',
);
test('wrs-featured-listing: unconfigured block stays selectable in the editor', () => {
  assert.ok(wflEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * WRS Featured Listing - Content Fragment resolution (scripts/wrs-cf.js).
 *
 * The jsdom harness this file uses has no `fetch` of its own, so it is
 * stubbed per-test here. These stub responses are shaped exactly like the
 * ContentFragmentServlet contract (docs/wrs-migration-notes.md /
 * scripts/wrs-cf.js docblock): `{ elements: {...} }` on success, a non-2xx
 * `Response`-like object on failure - not copied from a real HTTP capture,
 * since the servlet has no live content to capture from yet.
 * ------------------------------------------------------------------ */
function stubWflFetch(responsesByPath) {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    const path = url.split('.cfdetails.json')[1];
    const entry = responsesByPath[path];
    if (!entry || entry.ok === false) {
      return { ok: false, status: entry?.status ?? 404, json: async () => ({ error: 'not found' }) };
    }
    return { ok: true, status: 200, json: async () => ({ path, model: 'wrs-emp-zone', elements: entry.elements }) };
  };
  return calls;
}

/** Lets the fetch stub's promise chain (fetch -> json -> .then) settle. */
function flush() {
  return new Promise((resolve) => { setTimeout(resolve, 0); });
}

const wflResolveHtml = `<div class="wrs-featured-listing">
  ${wflItemRow(1, '/content/dam/fragments/zones/lions')}
  ${wflItemRow(2, '/content/dam/fragments/zones/tigers')}
</div>`;

test('wrs-featured-listing: a resolved fragment replaces the placeholder; a 404 sibling stays unresolved', async () => {
  stubWflFetch({
    '/content/dam/fragments/zones/lions': {
      elements: {
        name: 'Lions',
        summary: 'Big cats.',
        imageDesktop: '/content/dam/lions-720.png',
        imageDesktop1x1: '/content/dam/lions-512.png',
        detailLink: '/content/wrs/en/zones/lions',
      },
    },
    '/content/dam/fragments/zones/tigers': { ok: false, status: 404 },
  });

  const el = await decorateBlock('../blocks/wrs-featured-listing/wrs-featured-listing.js', wflResolveHtml);
  await flush();

  const [lionsCard, tigersCard] = [...el.querySelectorAll('.wrs-featured-listing-card')];

  assert.equal(lionsCard.classList.contains('wrs-featured-listing-unresolved'), false);
  assert.equal(lionsCard.querySelector('h4').textContent, 'Lions');
  assert.equal(lionsCard.querySelector('p').textContent, 'Big cats.');
  assert.equal(lionsCard.querySelector('a').getAttribute('href'), '/content/wrs/en/zones/lions.html');
  assert.equal(lionsCard.querySelector('img').getAttribute('src'), '/content/dam/lions-512.png');

  assert.ok(tigersCard.classList.contains('wrs-featured-listing-unresolved'), '404 sibling must stay unresolved, not blank the block');
  assert.equal(
    tigersCard.querySelector('.wrs-featured-listing-unresolved-label').textContent,
    'Content Fragment not resolved: /content/dam/fragments/zones/tigers',
  );
});

test('wrs-featured-listing: a payload with keys omitted renders defensively, not crash', async () => {
  stubWflFetch({
    '/content/dam/fragments/zones/lions': { elements: { name: 'Lions', imageDesktop: '/content/dam/lions-720.png' } },
    '/content/dam/fragments/zones/tigers': { elements: {} },
  });

  const el = await decorateBlock('../blocks/wrs-featured-listing/wrs-featured-listing.js', wflResolveHtml);
  await flush();

  const [lionsLink, tigersLink] = [...el.querySelectorAll('.wrs-featured-listing-link')];

  // No detailLink -> a <div> wrapper, not a dead <a href="">.
  assert.equal(lionsLink.tagName, 'DIV');
  assert.equal(lionsLink.querySelector('h4').textContent, 'Lions');
  assert.equal(lionsLink.querySelector('p'), null, 'no summary key -> no <p>');
  // No imageDesktop1x1 -> falls back to imageDesktop.
  assert.equal(lionsLink.querySelector('img').getAttribute('src'), '/content/dam/lions-720.png');

  // Empty elements object (model has none of these fields) -> still renders, no crash.
  assert.equal(tigersLink.querySelector('h4'), null);
  assert.equal(tigersLink.querySelector('img').getAttribute('src'), '');
});

test('wrs-featured-listing: edit mode performs no fetch at all', async () => {
  const calls = stubWflFetch({
    '/content/dam/fragments/zones/lions': { elements: { name: 'Lions' } },
  });
  const html = `<div class="wrs-featured-listing" data-aue-resource="urn:block1">${wflItemRow(1, '/content/dam/fragments/zones/lions')}</div>`;

  const el = await decorateBlock('../blocks/wrs-featured-listing/wrs-featured-listing.js', html);
  await flush();

  assert.equal(calls.length, 0, 'the editor must not fetch - authors edit the path, not the resolved data');
  assert.ok(el.querySelector('.wrs-featured-listing-unresolved'), 'row stays unresolved but selectable in the editor');
});

delete global.fetch;

/* ------------------------------------------------------------------ *
 * WRS Conservation Banner - no published markup exists yet (this component
 * has not been authored on a real page), so this fixture is constructed from
 * this codebase's own confirmed cell shapes rather than copied from a live
 * page: the content cell mirrors wrs-accordion-tabs' tabCell shape (bare <p>
 * children, richtext kept as markup), the bg cell mirrors
 * one-column-banner-carousel's grouped image-pair cell, the tag cell mirrors
 * four-column-tiles' single reference+imageAlt cell (a bare <picture>, alt
 * baked into the <img> by AEM's own render), and the cta cell mirrors the
 * cta_link/cta_linkText shape proven in cards/four-column-tiles/
 * wrs-accordion-tabs. It should be re-verified against real output once this
 * block has been authored.
 * ------------------------------------------------------------------ */
const WCB = `<div class="wrs-conservation-banner">
  <div><p>Save Our Rainforests</p><p>Every visit helps fund conservation work across the region.</p><p>true</p></div>
  <div><p><picture><img src="/cb-desktop.png?width=750&format=png&optimize=medium" alt=""></picture></p><p><picture><img src="/cb-mobile.png?width=750&format=png&optimize=medium" alt=""></picture></p></div>
  <div><picture><img src="/cb-tag.png" alt="Conservation badge"></picture></div>
  <div><p><a href="/content/wrs/conservation">Learn More</a></p></div>
</div>`;
const wcb = await decorateBlock('../blocks/wrs-conservation-banner/wrs-conservation-banner.js', WCB);

test('wrs-conservation-banner: title and rich description both render', () => {
  assert.equal(wcb.querySelector('.wrs-conservation-banner-title').textContent, 'Save Our Rainforests');
  assert.equal(
    wcb.querySelector('.wrs-conservation-banner-desc').textContent,
    'Every visit helps fund conservation work across the region.',
  );
});

test('wrs-conservation-banner: the gradient boolean toggles the modifier class, not a CTA/desc reader', () => {
  assert.ok(wcb.querySelector('.wrs-conservation-banner-content').classList.contains('gradient'));
});

test('wrs-conservation-banner: desktop and mobile background images both resolve via backgroundUrl()', () => {
  const cover = wcb.querySelector('.wrs-conservation-banner-cover');
  assert.match(cover.style.getPropertyValue('--conservation-bg-desktop'), /cb-desktop\.png\?.*width=2000/);
  assert.match(cover.style.getPropertyValue('--conservation-bg-mobile'), /cb-mobile\.png\?.*width=750/);
});

test('wrs-conservation-banner: the tag image renders with its alt text intact', () => {
  const img = wcb.querySelector('.wrs-conservation-banner-tag img');
  assert.equal(img.getAttribute('alt'), 'Conservation badge');
});

test('wrs-conservation-banner: the CTA link renders as an anchor wrapping a button, not the shared rb-cta shape', () => {
  const anchor = wcb.querySelector('.wrs-conservation-banner-cta-link');
  assert.equal(anchor.getAttribute('href'), '/content/wrs/conservation');
  const button = anchor.querySelector('.wrs-conservation-banner-cta');
  assert.equal(button.textContent, 'Learn More');
  assert.equal(wcb.querySelector('.rb-cta'), null);
});

const WCB_INSTRUMENTED = `<div class="wrs-conservation-banner">
  <div data-aue-resource="urn:content1"><p>Title</p><p>Copy</p><p>false</p></div>
  <div><div></div></div>
  <div data-aue-resource="urn:tag1"><picture><img src="/tag.png" alt="Tag"></picture></div>
  <div data-aue-resource="urn:cta1"><p><a href="/x">Go</a></p></div>
</div>`;
const wcbInstr = await decorateBlock('../blocks/wrs-conservation-banner/wrs-conservation-banner.js', WCB_INSTRUMENTED);
test('wrs-conservation-banner: instrumentation moves onto the content, tag and CTA elements that replace their rows', () => {
  assert.equal(wcbInstr.querySelector('.wrs-conservation-banner-content').getAttribute('data-aue-resource'), 'urn:content1');
  assert.equal(wcbInstr.querySelector('.wrs-conservation-banner-tag').getAttribute('data-aue-resource'), 'urn:tag1');
  assert.equal(wcbInstr.querySelector('.wrs-conservation-banner-cta-link').getAttribute('data-aue-resource'), 'urn:cta1');
});

/* A rich, multi-paragraph description must not shift the trailing gradient
 * boolean - the boundary is found from both ends, not by a fixed index. */
const WCB_RICH = `<div class="wrs-conservation-banner">
  <div><p>Title Only</p><p>First line.</p><p><strong>Bold</strong> second line.</p><p>false</p></div>
  <div><div></div></div>
  <div></div>
  <div></div>
</div>`;
const wcbRich = await decorateBlock('../blocks/wrs-conservation-banner/wrs-conservation-banner.js', WCB_RICH);
test('wrs-conservation-banner: a multi-paragraph rich description keeps the trailing boolean as the gradient flag', () => {
  assert.equal(wcbRich.querySelector('.wrs-conservation-banner-title').textContent, 'Title Only');
  assert.ok(wcbRich.querySelector('.wrs-conservation-banner-desc strong'));
  assert.equal(wcbRich.querySelector('.wrs-conservation-banner-content').classList.contains('gradient'), false);
});

const wcbEmpty = await decorateBlock('../blocks/wrs-conservation-banner/wrs-conservation-banner.js', '<div class="wrs-conservation-banner"></div>');
test('wrs-conservation-banner: renders nothing when unconfigured outside the editor', () => {
  assert.equal(wcbEmpty.children.length, 0);
});

const wcbEdit = await decorateBlock(
  '../blocks/wrs-conservation-banner/wrs-conservation-banner.js',
  '<div class="wrs-conservation-banner" data-aue-resource="urn:block1"></div>',
);
test('wrs-conservation-banner: unconfigured block stays selectable in the editor', () => {
  assert.ok(wcbEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * WRS Visit Our Parks - no published markup exists yet (this component
 * hasn't been authored). Fixtures are constructed from this repo's own
 * confirmed cell shapes: a bare-text single-field cell (four-column-tiles'
 * caption cell), a `<picture>`-holding reference cell (four-column-tiles'
 * image cell), and a single `<a href>` aem-content cell (wrs-featured-listing's
 * fragmentPath cell / secondary-button's link cell) - not copied from a
 * published page, and must be re-verified once this block is authored for
 * real.
 * ------------------------------------------------------------------ */
const parkRow = (n, { title = `Park ${n}`, image = true, link = `/content/wrs/en/park-${n}` } = {}) => `<div data-aue-resource="urn:park${n}" data-aue-model="wrsvisitourpark">
  <div>${title}</div>
  <div>${image ? `<picture><img src="/park${n}.png"></picture>` : ''}</div>
  <div>${link ? `<a href="${link}">${link}</a>` : ''}</div>
</div>`;

const WVOP = `<div class="wrs-visit-our-parks">
  ${parkRow(1, { title: 'River Safari', link: '/content/wrs/en/river-safari' })}
  ${parkRow(2, { title: 'Night Safari', link: '/content/wrs/en/night-safari' })}
</div>`;

const wvop = await decorateBlock('../blocks/wrs-visit-our-parks/wrs-visit-our-parks.js', WVOP);

test('wrs-visit-our-parks: one item per authored park', () => {
  assert.equal(wvop.querySelectorAll('.wrs-visit-our-parks-item').length, 2);
});

test('wrs-visit-our-parks: title becomes both the link title attribute and the image alt text', () => {
  const link = wvop.querySelector('.wrs-visit-our-parks-item:first-child .wrs-visit-our-parks-link');
  assert.equal(link.getAttribute('title'), 'River Safari');
  assert.equal(link.getAttribute('href'), '/content/wrs/en/river-safari');
  assert.equal(link.querySelector('img').getAttribute('alt'), 'River Safari');
});

test('wrs-visit-our-parks: the second park is read independently of the first (no cross-row bleed)', () => {
  const link = wvop.querySelector('.wrs-visit-our-parks-item:last-child .wrs-visit-our-parks-link');
  assert.equal(link.getAttribute('title'), 'Night Safari');
  assert.equal(link.getAttribute('href'), '/content/wrs/en/night-safari');
});

test('wrs-visit-our-parks: instrumentation moves onto the item, not the row it replaces', () => {
  const items = [...wvop.querySelectorAll('.wrs-visit-our-parks-item')];
  assert.deepEqual(items.map((el) => el.getAttribute('data-aue-resource')), ['urn:park1', 'urn:park2']);
  assert.equal(wvop.querySelectorAll('[data-aue-resource="urn:park1"]').length, 1);
});

const wvopNoImage = await decorateBlock(
  '../blocks/wrs-visit-our-parks/wrs-visit-our-parks.js',
  `<div class="wrs-visit-our-parks">${parkRow(3, { title: 'Bird Paradise', image: false })}</div>`,
);
test('wrs-visit-our-parks: a park authored without an image yet still renders as a text link, not dropped', () => {
  const link = wvopNoImage.querySelector('.wrs-visit-our-parks-link');
  assert.equal(link.querySelector('picture'), null);
  assert.equal(link.textContent, 'Bird Paradise');
});

const wvopEmpty = await decorateBlock('../blocks/wrs-visit-our-parks/wrs-visit-our-parks.js', '<div class="wrs-visit-our-parks"></div>');
test('wrs-visit-our-parks: renders nothing when unconfigured outside the editor', () => {
  assert.equal(wvopEmpty.children.length, 0);
});

const wvopEdit = await decorateBlock(
  '../blocks/wrs-visit-our-parks/wrs-visit-our-parks.js',
  '<div class="wrs-visit-our-parks" data-aue-resource="urn:block1"></div>',
);
test('wrs-visit-our-parks: unconfigured block stays selectable in the editor', () => {
  assert.ok(wvopEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * WRS Four Column Listing - fixtures are CONSTRUCTED from this repo's own
 * confirmed cell shapes (readCta-style grouped cells - four-column-tiles;
 * single aem-content + boolean child rows - wrs-visit-our-parks), not copied
 * from a published AEM page (none of these WRS components has been authored
 * yet). Must be re-verified once wrs-four-column-listing has real published
 * markup to check against. See wrs-four-column-listing.js and
 * docs/wrs-migration-notes.md "## mandaicffourcollisting" for why the shell
 * has no Content Fragment resolution.
 * ------------------------------------------------------------------ */
const wfcItemRow = (n, { cfPath = `/content/dam/fragments/things-to-do/item-${n}`, hide = false } = {}) => `<div data-aue-resource="urn:cf${n}" data-aue-model="wrsfourcollistingitem">
  <div>${cfPath ? `<a href="${cfPath}">${cfPath}</a>` : ''}</div>
  <div>${hide}</div>
</div>`;

const wfcRow = ({
  title = 'Discover the Reserves',
  ctaHref = '/content/wrs/en/all-parks',
  ctaText = 'See all parks',
  ctaStyle = 'button',
  layout = 'h2 title-center bg-base items-center quick-facts none',
} = {}) => `<div>${title}</div>
  <div><p><a href="${ctaHref}">${ctaText}</a></p><p>${ctaStyle}</p></div>
  <div>${layout.split(' ').filter(Boolean).map((v) => `<p>${v}</p>`).join('')}</div>`;

const WFC = `<div class="wrs-four-column-listing" data-aue-resource="urn:block1">
  ${wfcRow()}
  ${wfcItemRow(1, { cfPath: '/content/dam/fragments/things-to-do/lion-encounter' })}
  ${wfcItemRow(2, { cfPath: '/content/dam/fragments/things-to-do/river-cruise', hide: true })}
</div>`;

const wfc = await decorateBlock('../blocks/wrs-four-column-listing/wrs-four-column-listing.js', WFC);

test('wrs-four-column-listing: title renders as the selected heading level, centered', () => {
  const heading = wfc.querySelector('.wrs-four-column-listing-title');
  assert.equal(heading.tagName, 'H2');
  assert.equal(heading.textContent, 'Discover the Reserves');
  assert.ok(heading.classList.contains('text-center'));
});

test('wrs-four-column-listing: bgColor select drives the modifier class', () => {
  assert.ok(wfc.querySelector('.wrs-four-column-listing-inner.bg-base'));
  assert.equal(wfc.querySelector('.wrs-four-column-listing-inner.bg-sap-white'), null);
});

test('wrs-four-column-listing: anchorLink becomes the wrapper id, not confused with the enumerated values around it', () => {
  assert.equal(wfc.querySelector('.wrs-four-column-listing-inner').id, 'quick-facts');
});

test('wrs-four-column-listing: alignItems select reaches the list', () => {
  assert.ok(wfc.querySelector('.wrs-four-column-listing-list.items-center'));
});

test('wrs-four-column-listing: one card per authored Content Fragment path, each unresolved', () => {
  const labels = [...wfc.querySelectorAll('.wrs-four-column-listing-unresolved-label')].map((el) => el.textContent);
  assert.deepEqual(labels, [
    'Content Fragment not resolved: /content/dam/fragments/things-to-do/lion-encounter',
    'Content Fragment not resolved: /content/dam/fragments/things-to-do/river-cruise (CTA hidden)',
  ]);
});

test('wrs-four-column-listing: the section CTA renders as a button, from the grouped cta_ cell', () => {
  const link = wfc.querySelector('.wrs-four-column-listing-cta a');
  assert.equal(link.getAttribute('href'), '/content/wrs/en/all-parks');
  const button = link.querySelector('.wrs-four-column-listing-cta-button');
  assert.equal(button.textContent, 'See all parks');
});

test('wrs-four-column-listing: instrumentation moves onto the title, item and CTA elements that replace their rows, not onto a sibling', () => {
  assert.equal(wfc.querySelectorAll('[data-aue-resource="urn:cf1"]').length, 1);
  assert.equal(wfc.querySelector('[data-aue-resource="urn:cf1"]').className, 'wrs-four-column-listing-item');
  assert.equal(wfc.querySelectorAll('[data-aue-resource="urn:cf2"]').length, 1);
});

/*
 * The trap the task brief calls out: two same-domain checkboxes
 * (noTopPadding/noBottomPadding) grouped into one cell would both render as
 * bare "true"/"false" with no way to tell which is which. Collapsed here into
 * one four-value select (layout_padding) instead - each state is checked.
 */
// eslint-disable-next-line no-restricted-syntax
for (const padding of ['none', 'no-top', 'no-bottom', 'no-top-bottom']) {
  const html = `<div class="wrs-four-column-listing">${wfcRow({ layout: `h2 title-center bg-base items-center ${padding}` })}${wfcItemRow(1)}</div>`;
  // eslint-disable-next-line no-await-in-loop
  const el = await decorateBlock('../blocks/wrs-four-column-listing/wrs-four-column-listing.js', html);
  test(`wrs-four-column-listing: layout_padding="${padding}" sets the expected top/bottom classes unambiguously`, () => {
    const inner = el.querySelector('.wrs-four-column-listing-inner');
    assert.equal(inner.classList.contains('no-top-padding'), padding === 'no-top' || padding === 'no-top-bottom');
    assert.equal(inner.classList.contains('no-bottom-padding'), padding === 'no-bottom' || padding === 'no-top-bottom');
  });
}

const wfcNoTitleNoCta = await decorateBlock(
  '../blocks/wrs-four-column-listing/wrs-four-column-listing.js',
  `<div class="wrs-four-column-listing">${wfcRow({ title: '', ctaHref: '', ctaText: '' })}${wfcItemRow(1)}</div>`,
);
test('wrs-four-column-listing: blank optional title and CTA cells do not crash decorate(), items still render', () => {
  assert.equal(wfcNoTitleNoCta.querySelector('.wrs-four-column-listing-title'), null);
  assert.equal(wfcNoTitleNoCta.querySelector('.wrs-four-column-listing-cta'), null);
  assert.equal(wfcNoTitleNoCta.querySelectorAll('.wrs-four-column-listing-item').length, 1);
});

const wfcBlankItem = await decorateBlock(
  '../blocks/wrs-four-column-listing/wrs-four-column-listing.js',
  `<div class="wrs-four-column-listing">${wfcRow()}${wfcItemRow(1, { cfPath: '' })}</div>`,
);
test('wrs-four-column-listing: a row with no Content Fragment picked yet still renders, not crashes', () => {
  const label = wfcBlankItem.querySelector('.wrs-four-column-listing-unresolved-label');
  assert.equal(label.textContent, 'No Content Fragment selected');
});

const wfcEmpty = await decorateBlock('../blocks/wrs-four-column-listing/wrs-four-column-listing.js', '<div class="wrs-four-column-listing"></div>');
test('wrs-four-column-listing: renders nothing when unconfigured outside the editor', () => {
  assert.equal(wfcEmpty.children.length, 0);
});

const wfcEdit = await decorateBlock(
  '../blocks/wrs-four-column-listing/wrs-four-column-listing.js',
  '<div class="wrs-four-column-listing" data-aue-resource="urn:block1"></div>',
);
test('wrs-four-column-listing: unconfigured block stays selectable in the editor', () => {
  assert.ok(wfcEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * WRS Four Column Listing - Content Fragment resolution (scripts/wrs-cf.js).
 * Same stubbing rationale as wrs-featured-listing's equivalent block above -
 * jsdom has no fetch, and the servlet has no live content to capture yet.
 * ------------------------------------------------------------------ */
function stubWfcFetch(responsesByPath) {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    const path = url.split('.cfdetails.json')[1];
    const entry = responsesByPath[path];
    if (!entry || entry.ok === false) {
      return { ok: false, status: entry?.status ?? 404, json: async () => ({ error: 'not found' }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ path, model: 'mandai-things-to-do', elements: entry.elements }),
    };
  };
  return calls;
}

function flushWfc() {
  return new Promise((resolve) => { setTimeout(resolve, 0); });
}

const wfcResolveHtml = `<div class="wrs-four-column-listing">
  ${wfcRow()}
  ${wfcItemRow(1, { cfPath: '/content/dam/fragments/things-to-do/lion-encounter' })}
  ${wfcItemRow(2, { cfPath: '/content/dam/fragments/things-to-do/river-cruise', hide: true })}
</div>`;

test('wrs-four-column-listing: a resolved fragment replaces the placeholder; a 404 sibling stays unresolved', async () => {
  stubWfcFetch({
    '/content/dam/fragments/things-to-do/lion-encounter': {
      elements: {
        title: 'Lion Encounter',
        shortDescription: 'Meet the pride.',
        tags: ['Family', 'Outdoor'],
        image: '/content/dam/lion-encounter.png',
        imageAltText: 'A lion',
        imageIsDecorative: 'false',
        ctaText: 'Book now',
        ctaLink: '/content/wrs/en/book',
        dateLabels: ['Daily'],
        locationLabels: ['Wild Africa'],
        timeLabels: ['10am', '2pm'],
      },
    },
    '/content/dam/fragments/things-to-do/river-cruise': { ok: false, status: 404 },
  });

  const el = await decorateBlock('../blocks/wrs-four-column-listing/wrs-four-column-listing.js', wfcResolveHtml);
  await flushWfc();

  const [lionCard, cruiseCard] = [...el.querySelectorAll('.wrs-four-column-listing-card')];

  assert.equal(lionCard.classList.contains('wrs-four-column-listing-unresolved'), false);
  assert.equal(lionCard.querySelector('h4').textContent, 'Lion Encounter');
  assert.equal(lionCard.querySelector('img').getAttribute('src'), '/content/dam/lion-encounter.png');
  assert.equal(lionCard.querySelector('img').getAttribute('alt'), 'A lion');
  assert.deepEqual(
    [...lionCard.querySelectorAll('.md-tag-label .md-tag')].map((el2) => el2.textContent),
    ['Family', 'Outdoor'],
  );
  // Item 1's hideCTAButton is false (default) -> the resolved CTA renders.
  const cta = lionCard.querySelector('.md-link-with-arrow');
  assert.equal(cta.getAttribute('href'), '/content/wrs/en/book.html');
  assert.equal(cta.textContent.trim().startsWith('Book now'), true);

  assert.ok(cruiseCard.classList.contains('wrs-four-column-listing-unresolved'), '404 sibling must stay unresolved, not blank the block');
});

test('wrs-four-column-listing: hideCTAButton suppresses the CTA even when the fragment has one', async () => {
  stubWfcFetch({
    '/content/dam/fragments/things-to-do/lion-encounter': { elements: { title: 'Lion Encounter' } },
    '/content/dam/fragments/things-to-do/river-cruise': {
      elements: { title: 'River Cruise', ctaText: 'Book now', ctaLink: '/content/wrs/en/book' },
    },
  });

  const el = await decorateBlock('../blocks/wrs-four-column-listing/wrs-four-column-listing.js', wfcResolveHtml);
  await flushWfc();

  const [, cruiseCard] = [...el.querySelectorAll('.wrs-four-column-listing-card')];
  assert.equal(cruiseCard.querySelector('.md-link-with-arrow'), null, 'item 2 has hideCTAButton=true');
});

test('wrs-four-column-listing: a payload with keys omitted (the common case across two models) renders defensively', async () => {
  stubWfcFetch({
    '/content/dam/fragments/things-to-do/lion-encounter': { elements: { title: 'Lion Encounter' } },
    '/content/dam/fragments/things-to-do/river-cruise': { elements: {} },
  });

  const el = await decorateBlock('../blocks/wrs-four-column-listing/wrs-four-column-listing.js', wfcResolveHtml);
  await flushWfc();

  const [lionCard, cruiseCard] = [...el.querySelectorAll('.wrs-four-column-listing-card')];
  assert.equal(lionCard.querySelector('h4').textContent, 'Lion Encounter');
  assert.equal(lionCard.querySelector('img'), null, 'no image key -> no <img>');
  assert.equal(lionCard.querySelector('.md-tag-label'), null, 'no tags key -> no tag list');

  assert.equal(cruiseCard.querySelector('h4'), null, 'empty elements object -> still renders, no crash');
  assert.equal(cruiseCard.classList.contains('wrs-four-column-listing-unresolved'), false);
});

test('wrs-four-column-listing: edit mode performs no fetch at all', async () => {
  const calls = stubWfcFetch({
    '/content/dam/fragments/things-to-do/lion-encounter': { elements: { title: 'Lion Encounter' } },
  });
  const html = `<div class="wrs-four-column-listing" data-aue-resource="urn:block1">${wfcRow()}${wfcItemRow(1, { cfPath: '/content/dam/fragments/things-to-do/lion-encounter' })}</div>`;

  const el = await decorateBlock('../blocks/wrs-four-column-listing/wrs-four-column-listing.js', html);
  await flushWfc();

  assert.equal(calls.length, 0, 'the editor must not fetch - authors edit the path, not the resolved data');
  assert.ok(el.querySelector('.wrs-four-column-listing-unresolved'), 'item stays unresolved but selectable in the editor');
});

delete global.fetch;

/* ------------------------------------------------------------------ *
 * WRS Experience Carousel - fixtures are CONSTRUCTED from this repo's own
 * confirmed cell shapes (readCta-style grouped cta_ cells - four-column-tiles;
 * positional title/description pairs - wrs-accordion-tabs' readTab()), not
 * copied from a published AEM page (none of these WRS components has been
 * authored yet). Must be re-verified once wrs-experience-carousel has real
 * published markup to check against - see wrs-experience-carousel.js's own
 * docblock for the specific, accepted risk in the colour cell and the
 * card title/description pair: both are read POSITIONALLY because neither
 * has a vocabulary to content-match on, so an EARLIER blank field in either
 * group can misattribute a LATER one's value.
 * ------------------------------------------------------------------ */
const wecCardRow = ({
  title = 'Elephant Trail',
  style = 'h2',
  description = 'Discover our elephants up close.',
  placement = 'right',
} = {}) => {
  const parts = [title, style, description, placement].filter((v) => v !== '');
  return `<div>${parts.map((v) => `<p>${v}</p>`).join('')}</div>`;
};

const wecCtaRow = ({ href = '/content/wrs/en/elephants', newTab = true } = {}) => (
  href ? `<div><p><a href="${href}">Learn more</a></p><p>${newTab}</p></div>` : '<div></div>'
);

const wecColors = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777', '#888888'];
const wecColorRow = (colors = wecColors) => `<div>${colors.map((c) => `<p>${c}</p>`).join('')}</div>`;

const wecItemRow = (n, {
  image = true,
  disableGradient = false,
  title = `Elephant Encounter ${n}`,
  description = `Get up close with our herd ${n}.`,
  ctaHref = `/content/wrs/en/elephants/book-${n}`,
  newTab = false,
} = {}) => {
  const imageCell = image
    ? `<div><p><picture><img src="/elephant-${n}.jpg" alt="Elephant ${n}"></picture></p><p>${disableGradient}</p></div>`
    : `<div><p>${disableGradient}</p></div>`;
  const contentParts = [title, description].filter(Boolean);
  const contentCell = `<div>${contentParts.map((v) => `<p>${v}</p>`).join('')}</div>`;
  const ctaCell = ctaHref ? `<div><p><a href="${ctaHref}">Book now</a></p><p>${newTab}</p></div>` : '<div></div>';
  return `<div data-aue-resource="urn:item${n}" data-aue-model="wrsexperiencecarouselitem">
    ${imageCell}
    ${contentCell}
    ${ctaCell}
  </div>`;
};

const WEC = `<div class="wrs-experience-carousel" data-aue-resource="urn:block1">
  ${wecCardRow()}
  ${wecCtaRow()}
  <div>no-top</div>
  ${wecColorRow()}
  ${wecItemRow(1)}
  ${wecItemRow(2, { disableGradient: true, ctaHref: '' })}
</div>`;

const wec = await decorateBlock('../blocks/wrs-experience-carousel/wrs-experience-carousel.js', WEC);

test('wrs-experience-carousel: the card title, heading level and CTA link render together', () => {
  const titleContent = wec.querySelector('.wrs-experience-carousel-title-content');
  assert.equal(titleContent.tagName, 'A');
  assert.equal(titleContent.getAttribute('href'), '/content/wrs/en/elephants');
  assert.equal(titleContent.getAttribute('target'), '_blank');
  const heading = titleContent.querySelector('.wrs-experience-carousel-header');
  assert.equal(heading.tagName, 'H2');
  assert.equal(heading.textContent, 'Elephant Trail');
});

test('wrs-experience-carousel: the card description keeps its markup', () => {
  const desc = wec.querySelector('.wrs-experience-carousel-description');
  assert.match(desc.innerHTML, /Discover our elephants up close\./);
});

test('wrs-experience-carousel: card_placement drives the block-level modifier class', () => {
  assert.ok(wec.classList.contains('wrs-experience-carousel-placement-right'));
  assert.equal(wec.classList.contains('wrs-experience-carousel-placement-left'), false);
});

test('wrs-experience-carousel: the arrow icon only renders when there is a link to follow', () => {
  assert.ok(wec.querySelector('.wrs-experience-carousel-link-arrow'));
});

test('wrs-experience-carousel: the 8 colour fields land as 8 DISTINCT custom properties, not merged', () => {
  const props = [
    '--wrs-ecf-body', '--wrs-ecf-body-hover', '--wrs-ecf-body-title', '--wrs-ecf-body-title-hover',
    '--wrs-ecf-body-text', '--wrs-ecf-body-text-hover', '--wrs-ecf-body-arrow', '--wrs-ecf-body-arrow-hover',
  ];
  const values = props.map((p) => wec.style.getPropertyValue(p));
  assert.deepEqual(values, wecColors);
  // Guards specifically against the collapsing-suffix trap: contentBody +
  // Title/Text would have silently merged three distinct colours into one
  // had the fields been named without the color_ prefix - confirm the
  // first three are genuinely different values, not the same one repeated.
  assert.equal(new Set(values).size, 8);
});

test('wrs-experience-carousel: two items render, one per authored image row', () => {
  assert.equal(wec.querySelectorAll('.wrs-experience-carousel-item').length, 2);
});

test('wrs-experience-carousel: image_disableGradient toggles the text-gradient modifier class', () => {
  const items = [...wec.querySelectorAll('.wrs-experience-carousel-item')];
  assert.ok(items[0].classList.contains('text-gradient'), 'item 1 (disableGradient=false) should keep the gradient');
  assert.equal(items[1].classList.contains('text-gradient'), false, 'item 2 (disableGradient=true) should not');
});

test('wrs-experience-carousel: an item CTA makes the item container a link; a missing one keeps it a div', () => {
  const items = [...wec.querySelectorAll('.wrs-experience-carousel-container')];
  assert.equal(items[0].tagName, 'A');
  assert.equal(items[0].getAttribute('href'), '/content/wrs/en/elephants/book-1');
  assert.equal(items[1].tagName, 'DIV');
});

test('wrs-experience-carousel: item title and description render inside feature-content-inner', () => {
  const first = wec.querySelector('.wrs-experience-carousel-item');
  assert.equal(first.querySelector('.wrs-experience-carousel-item-title').textContent, 'Elephant Encounter 1');
  assert.match(first.querySelector('.body-text1').textContent, /Get up close with our herd 1\./);
});

test('wrs-experience-carousel: dots render for a multi-item carousel', () => {
  assert.ok(wec.querySelector('.wrs-experience-carousel-dots'));
  assert.equal(wec.querySelectorAll('.wrs-experience-carousel-dots .rb-dot').length, 2);
});

test('wrs-experience-carousel: instrumentation moves onto the title block and each item, not a shared sibling', () => {
  assert.equal(wec.querySelectorAll('[data-aue-resource="urn:item1"]').length, 1);
  assert.equal(wec.querySelector('[data-aue-resource="urn:item1"]').className.split(' ')[0], 'wrs-experience-carousel-item');
  assert.equal(wec.querySelectorAll('[data-aue-resource="urn:item2"]').length, 1);
});

// eslint-disable-next-line no-restricted-syntax
for (const padding of ['none', 'no-top', 'no-bottom', 'no-top-bottom']) {
  const html = `<div class="wrs-experience-carousel">${wecCardRow()}${wecCtaRow()}<div>${padding}</div>${wecColorRow()}${wecItemRow(1)}</div>`;
  // eslint-disable-next-line no-await-in-loop
  const el = await decorateBlock('../blocks/wrs-experience-carousel/wrs-experience-carousel.js', html);
  test(`wrs-experience-carousel: layout_padding="${padding}" sets the expected top/bottom classes unambiguously`, () => {
    assert.equal(el.classList.contains('no-top-padding'), padding === 'no-top' || padding === 'no-top-bottom');
    assert.equal(el.classList.contains('no-bottom-padding'), padding === 'no-bottom' || padding === 'no-top-bottom');
  });
}

const wecNoCta = await decorateBlock(
  '../blocks/wrs-experience-carousel/wrs-experience-carousel.js',
  `<div class="wrs-experience-carousel">${wecCardRow()}${wecCtaRow({ href: '' })}<div>none</div>${wecColorRow()}${wecItemRow(1)}</div>`,
);
test('wrs-experience-carousel: with no CTA link, the title card renders as a div, not a dead link, and has no arrow', () => {
  const titleContent = wecNoCta.querySelector('.wrs-experience-carousel-title-content');
  assert.equal(titleContent.tagName, 'DIV');
  assert.equal(wecNoCta.querySelector('.wrs-experience-carousel-link-arrow'), null);
});

const wecNoColors = await decorateBlock(
  '../blocks/wrs-experience-carousel/wrs-experience-carousel.js',
  `<div class="wrs-experience-carousel">${wecCardRow()}${wecCtaRow()}<div>none</div><div></div>${wecItemRow(1)}</div>`,
);
test('wrs-experience-carousel: with no colours authored, no custom properties are set (CSS fallbacks apply)', () => {
  assert.equal(wecNoColors.style.getPropertyValue('--wrs-ecf-body'), '');
  assert.equal(wecNoColors.style.getPropertyValue('--wrs-ecf-body-arrow-hover'), '');
});

const wecNoDesc = await decorateBlock(
  '../blocks/wrs-experience-carousel/wrs-experience-carousel.js',
  `<div class="wrs-experience-carousel">${wecCardRow({ description: '' })}${wecCtaRow({ href: '' })}<div>none</div>${wecColorRow()}</div>`,
);
test('wrs-experience-carousel: a blank optional description does not crash decorate(), title still renders', () => {
  assert.equal(wecNoDesc.querySelector('.wrs-experience-carousel-header').textContent, 'Elephant Trail');
  assert.equal(wecNoDesc.querySelector('.wrs-experience-carousel-description'), null);
  assert.equal(wecNoDesc.querySelector('.wrs-experience-carousel-track'), null);
});

const wecEmpty = await decorateBlock('../blocks/wrs-experience-carousel/wrs-experience-carousel.js', '<div class="wrs-experience-carousel"></div>');
test('wrs-experience-carousel: renders nothing when unconfigured outside the editor', () => {
  assert.equal(wecEmpty.children.length, 0);
});

const wecEdit = await decorateBlock(
  '../blocks/wrs-experience-carousel/wrs-experience-carousel.js',
  '<div class="wrs-experience-carousel" data-aue-resource="urn:block1"></div>',
);
test('wrs-experience-carousel: unconfigured block stays selectable in the editor', () => {
  assert.ok(wecEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * WRS Feature Carousel - no published markup exists yet (this component
 * has not been authored on a real page), so these fixtures are constructed
 * from this codebase's own confirmed cell shapes rather than copied from a
 * live page: the bg cell mirrors one-column-banner's grouped image-pair
 * cell (desktop <picture> then mobile <picture>, in field order) plus a
 * bare text value for the select, the heading cell mirrors
 * wrs-experience-carousel's readCard()-style "first N positional, rest is
 * richtext" read, the item's image+imageAlt cell mirrors
 * wrs-conservation-banner's tag cell (a bare <picture>, alt baked into the
 * <img> by AEM's own render), and the cta_link/cta_linkText-style single-
 * link cells mirror the cta_link/cta_linkText shape proven in cards/
 * four-column-tiles/wrs-conservation-banner. Must be re-verified against
 * real published output once this block has been authored.
 * ------------------------------------------------------------------ */
function wfeatItemRow({
  img = '/item.png?width=750&format=png&optimize=medium', alt = 'Item image', title = 'Tiger Trail',
  description = 'Get up close with our Malayan tigers.', href = '', gradient = '', hide = '',
} = {}) {
  const imgCell = img ? `<div><picture><img src="${img}" alt="${alt}"></picture></div>` : '<div></div>';
  const contentParts = [title, description].filter(Boolean).map((v) => `<p>${v}</p>`).join('');
  const contentCell = contentParts ? `<div>${contentParts}</div>` : '<div></div>';
  const ctaCell = href ? `<div><p><a href="${href}">${title}</a></p></div>` : '<div></div>';
  const displayParts = [gradient, hide].filter(Boolean).map((v) => `<p>${v}</p>`).join('');
  const displayCell = displayParts ? `<div>${displayParts}</div>` : '<div></div>';
  return `<div>${imgCell}${contentCell}${ctaCell}${displayCell}</div>`;
}

/* Colour variant, normal render: heading, 2-paragraph description, 3 items
 * (one hidden, one unlinked with no gradient, one linked with gradient),
 * a view-all CTA and an anchor id. */
const WFEAT = `<div class="wrs-feature-carousel">
  <div><p>bg-dark-green</p><div></div><div></div></div>
  <div><p>Discover Our Habitats</p><p>Explore the habitats carousel</p><p>Step into the wild.</p><p>See it for yourself.</p></div>
  <div><p><a href="/content/wrs/experiences">View All</a></p></div>
  <div>experiences-carousel</div>
  ${wfeatItemRow({
    img: '/tiger.png?width=750&format=png&optimize=medium', alt: 'Tiger', title: 'Tiger Trail', description: 'Get up close with our Malayan tigers.', href: '/content/wrs/tiger-trail', gradient: 'text-gradient', hide: 'false',
  })}
  ${wfeatItemRow({
    img: '/panda.png?width=750&format=png&optimize=medium', alt: 'Panda', title: 'Panda House', description: '', href: '', gradient: '', hide: '',
  })}
  ${wfeatItemRow({
    img: '/hidden.png', alt: 'Hidden', title: 'Hidden Item', description: '', href: '', gradient: '', hide: 'true',
  })}
</div>`;
const wfeat = await decorateBlock('../blocks/wrs-feature-carousel/wrs-feature-carousel.js', WFEAT);

test('wrs-feature-carousel: heading title and multi-paragraph description both render', () => {
  assert.equal(wfeat.querySelector('.wrs-feature-carousel-title').textContent, 'Discover Our Habitats');
  const desc = wfeat.querySelector('.wrs-feature-carousel-description');
  assert.equal(desc.querySelectorAll('p').length, 2);
  assert.equal(desc.textContent.trim(), 'Step into the wild.See it for yourself.');
});

test('wrs-feature-carousel: the colour variant applies the bg_color class, not the image variant', () => {
  assert.ok(wfeat.classList.contains('bg-dark-green'));
  assert.ok(!wfeat.classList.contains('bg-custom'));
  assert.equal(wfeat.style.getPropertyValue('--wfc-bg-desktop'), '');
});

test('wrs-feature-carousel: the anchorLink cell sets the block id', () => {
  assert.equal(wfeat.id, 'experiences-carousel');
});

test('wrs-feature-carousel: a display_hide item is dropped entirely, matching cItems.removeIf() in the source', () => {
  const titles = [...wfeat.querySelectorAll('.wrs-feature-carousel-item-title')].map((el) => el.textContent);
  assert.deepEqual(titles, ['Tiger Trail', 'Panda House']);
});

test('wrs-feature-carousel: an item with a slideLink renders as a linked, gradient column', () => {
  const linked = wfeat.querySelector('.wrs-feature-carousel-column[href="/content/wrs/tiger-trail"]');
  assert.equal(linked.tagName, 'A');
  assert.ok(linked.classList.contains('text-gradient'));
});

test('wrs-feature-carousel: an item with no slideLink renders as an unlinked, non-gradient column', () => {
  const columns = [...wfeat.querySelectorAll('.wrs-feature-carousel-column')];
  const unlinked = columns.find((el) => el.textContent.includes('Panda House'));
  assert.equal(unlinked.tagName, 'DIV');
  assert.ok(!unlinked.classList.contains('text-gradient'));
});

test('wrs-feature-carousel: the view-all CTA renders as an anchor around .md-button', () => {
  const anchor = wfeat.querySelector('.wrs-feature-carousel-view-all a');
  assert.equal(anchor.getAttribute('href'), '/content/wrs/experiences');
  assert.equal(anchor.querySelector('.md-button').textContent, 'View All');
});

/* Image variant: bg_color is "bgImage", so decorate() reads bg_desktop/
 * bg_mobile through backgroundUrl() instead of applying a colour class -
 * the mutually-exclusive branch image-carousel-template.html took in the
 * source. */
const WFEAT_IMAGE = `<div class="wrs-feature-carousel">
  <div><p>bgImage</p><p><picture><img src="/fc-desktop.png?width=750&format=png&optimize=medium" alt=""></picture></p><p><picture><img src="/fc-mobile.png?width=750&format=png&optimize=medium" alt=""></picture></p></div>
  <div><p>Rainforest Encounters</p></div>
  <div></div>
  <div></div>
  ${wfeatItemRow()}
</div>`;
const wfeatImage = await decorateBlock('../blocks/wrs-feature-carousel/wrs-feature-carousel.js', WFEAT_IMAGE);

test('wrs-feature-carousel: the image variant applies bg-custom and both background URLs', () => {
  assert.ok(wfeatImage.classList.contains('bg-custom'));
  assert.ok(!wfeatImage.classList.contains('bg-dark-green'));
  assert.match(wfeatImage.style.getPropertyValue('--wfc-bg-desktop'), /fc-desktop\.png\?.*width=2000/);
  assert.match(wfeatImage.style.getPropertyValue('--wfc-bg-mobile'), /fc-mobile\.png\?.*width=750/);
});

/* Blank optional cells: no heading, no CTA, no anchor - a lone item must
 * still render without crashing decorate(). */
const WFEAT_MINIMAL = `<div class="wrs-feature-carousel">
  <div><div></div><div></div></div>
  <div></div>
  <div></div>
  <div></div>
  ${wfeatItemRow({
    img: '/only.png?width=750&format=png&optimize=medium', alt: 'Only item', title: '', description: '',
  })}
</div>`;
const wfeatMinimal = await decorateBlock('../blocks/wrs-feature-carousel/wrs-feature-carousel.js', WFEAT_MINIMAL);
test('wrs-feature-carousel: blank heading/CTA/anchor cells do not crash decorate(), the item still renders', () => {
  assert.equal(wfeatMinimal.querySelector('.wrs-feature-carousel-title'), null);
  assert.equal(wfeatMinimal.id, '');
  assert.ok(wfeatMinimal.querySelector('.wrs-feature-carousel-img img'));
});

const WFEAT_INSTRUMENTED = `<div class="wrs-feature-carousel">
  <div><p>base</p><div></div><div></div></div>
  <div data-aue-resource="urn:heading1"><p>Title</p></div>
  <div data-aue-resource="urn:cta1"><p><a href="/x">Go</a></p></div>
  <div></div>
  <div data-aue-resource="urn:item1">
    <div><picture><img src="/i.png?width=750&format=png&optimize=medium" alt="Item"></picture></div>
    <div><p>Item One</p></div>
    <div></div>
    <div></div>
  </div>
</div>`;
const wfeatInstr = await decorateBlock('../blocks/wrs-feature-carousel/wrs-feature-carousel.js', WFEAT_INSTRUMENTED);
test('wrs-feature-carousel: instrumentation moves onto the grid, item and view-all elements that replace their rows', () => {
  assert.equal(wfeatInstr.querySelector('.wrs-feature-carousel-grid').getAttribute('data-aue-resource'), 'urn:heading1');
  assert.equal(wfeatInstr.querySelector('.wrs-feature-carousel-item').getAttribute('data-aue-resource'), 'urn:item1');
  assert.equal(wfeatInstr.querySelector('.wrs-feature-carousel-view-all a').getAttribute('data-aue-resource'), 'urn:cta1');
});

const wfeatEmpty = await decorateBlock('../blocks/wrs-feature-carousel/wrs-feature-carousel.js', '<div class="wrs-feature-carousel"></div>');
test('wrs-feature-carousel: renders nothing when unconfigured outside the editor', () => {
  assert.equal(wfeatEmpty.children.length, 0);
});

const wfeatEdit = await decorateBlock(
  '../blocks/wrs-feature-carousel/wrs-feature-carousel.js',
  '<div class="wrs-feature-carousel" data-aue-resource="urn:block1"></div>',
);
test('wrs-feature-carousel: unconfigured block stays selectable in the editor', () => {
  assert.ok(wfeatEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * WRS Masthead Carousel - constructed fixtures, not copied from a
 * published page (none of this run's WRS components has been authored
 * yet - see the migration brief). Shapes are derived from this repo's own
 * confirmed cell conventions: a plain value cell (`primary-button`), a
 * grouped multi-value cell with pictures wrapped in <p> (`missions`,
 * `wrs-conservation-banner`), a bare aem-content anchor with no separate
 * label (`wrs-featured-listing`'s fragmentPath cell). Re-verify once this
 * block has real authored/published markup - see the block's own JS
 * docblock for the specific things flagged as unverified (video-asset
 * `reference` rendering, the gradient class mapping, the countdown's `gmt`
 * handling).
 * ------------------------------------------------------------------ */
const wmcParentRows = (scaling = '100', autoplay = 'true', speed = '4000') => `
  <div><div>${scaling}</div></div>
  <div><div>${autoplay}</div></div>
  <div><div>${speed}</div></div>`;

const wmcImageRow = ({
  aueModel = true, header = 'See the Elephants', subHeader = 'Book now', cta = true,
  countdown = false, fetchPriority = 'false', alt = 'Elephant herd',
} = {}) => `
  <div${aueModel ? ' data-aue-model="wrsmastheadimageslide"' : ''} data-aue-resource="urn:slide-image">
    <div><p>image</p><p><picture><img src="/elephants-d.jpg"></picture></p><p><picture><img src="/elephants-m.jpg"></picture></p><p>${alt}</p><p>${fetchPriority}</p></div>
    <div><p>${header}</p>${subHeader ? `<p>${subHeader}</p>` : ''}<p>text-left</p><p>onImage</p><p>15</p></div>
    <div>${cta ? '<p><a href="/tickets">Buy Tickets</a></p>' : ''}</div>
    <div>${countdown ? '<p>true</p><p>2026-12-31T23:59:00+08:00</p><a href="/redirect">/redirect</a><p>Ends soon!</p>' : ''}</div>
  </div>`;

const wmcVideoRow = ({ aueModel = true } = {}) => `
  <div${aueModel ? ' data-aue-model="wrsmastheadvideoslide"' : ''} data-aue-resource="urn:slide-video">
    <div><p>video</p><p><picture><img src="/video-d.mp4"></picture></p><p><picture><img src="/video-m.mp4"></picture></p></div>
    <div><picture><img src="/video-fallback.jpg"></picture><p>Fallback shot</p></div>
    <div><p>true</p><p>false</p></div>
  </div>`;

const wmcYoutubeRow = ({ aueModel = true } = {}) => `
  <div${aueModel ? ' data-aue-model="wrsmastheadyoutubeslide"' : ''} data-aue-resource="urn:slide-youtube">
    <div><p>youtube</p><p>https://www.youtube.com/embed/abc123</p><p>true</p></div>
  </div>`;

const wmcVimeoRow = ({ aueModel = true } = {}) => `
  <div${aueModel ? ' data-aue-model="wrsmastheadvimeoslide"' : ''} data-aue-resource="urn:slide-vimeo">
    <div><p>vimeo</p><p>111222333</p><p>444555666</p></div>
    <div><picture><img src="/vimeo-fallback.jpg"></picture><p>Vimeo fallback</p></div>
    <div><p>inline</p><p>true</p></div>
    <div><p>true</p><p>true</p></div>
  </div>`;

const WMC_ALL_KINDS = `<div class="wrs-masthead-carousel">${wmcParentRows()}
  ${wmcImageRow({ countdown: true })}
  ${wmcVideoRow()}
  ${wmcYoutubeRow()}
  ${wmcVimeoRow()}
</div>`;
const wmcAll = await decorateBlock('../blocks/wrs-masthead-carousel/wrs-masthead-carousel.js', WMC_ALL_KINDS);

test('wrs-masthead-carousel: all four child kinds render, one slide each, in author order', () => {
  const slides = wmcAll.querySelectorAll('.wrs-masthead-carousel-slide');
  assert.equal(slides.length, 4);
  assert.ok(slides[0].querySelector('h1')?.textContent === 'See the Elephants');
  assert.ok(slides[1].querySelector('video'));
  assert.ok(slides[2].querySelector('.youtube-wrapper iframe'));
  assert.ok(slides[3].querySelector('.vimeo-wrapper iframe'));
});

test('wrs-masthead-carousel: image slide content, CTA and countdown all survive', () => {
  const slide = wmcAll.querySelector('.wrs-masthead-carousel-slide');
  assert.equal(slide.querySelector('h1').textContent, 'See the Elephants');
  assert.equal(slide.querySelector('.wrs-masthead-carousel-content > span:not(.countdown-description)')?.textContent, 'Book now');
  const cta = slide.querySelector('.md-button-big');
  assert.equal(cta.tagName, 'A');
  assert.equal(cta.getAttribute('href'), '/tickets');
  assert.equal(cta.textContent, 'Buy Tickets');
  assert.ok(slide.querySelector('.countdown-wrapper'), 'expected a countdown to render when enabled');
  assert.equal(slide.querySelector('.countdown-description').textContent, 'Ends soon!');
});

test('wrs-masthead-carousel: instrumentation moves onto each rendered slide, not the track', () => {
  const slides = wmcAll.querySelectorAll('.wrs-masthead-carousel-slide');
  ['urn:slide-image', 'urn:slide-video', 'urn:slide-youtube', 'urn:slide-vimeo'].forEach((urn, i) => {
    assert.equal(slides[i].getAttribute('data-aue-resource'), urn);
  });
  assert.equal(wmcAll.querySelector('.wrs-masthead-carousel-track').hasAttribute('data-aue-resource'), false);
});

/* Same four kinds, but with NO data-aue-model anywhere - the published-page
 * shape, where the only signal is each child model's own `_kind` marker
 * field (see rowKind() in the block's own JS). This is the test the task
 * explicitly calls for: distinguishing interleaved child types correctly. */
const WMC_PUBLISHED = `<div class="wrs-masthead-carousel">${wmcParentRows()}
  ${wmcVimeoRow({ aueModel: false })}
  ${wmcImageRow({ aueModel: false, header: 'Published Slide' })}
  ${wmcYoutubeRow({ aueModel: false })}
  ${wmcVideoRow({ aueModel: false })}
</div>`;
const wmcPublished = await decorateBlock('../blocks/wrs-masthead-carousel/wrs-masthead-carousel.js', WMC_PUBLISHED);

test('wrs-masthead-carousel: child kinds are told apart on a published page with no data-aue-model at all', () => {
  const slides = wmcPublished.querySelectorAll('.wrs-masthead-carousel-slide');
  assert.equal(slides.length, 4);
  assert.ok(slides[0].querySelector('.vimeo-wrapper iframe'), 'row 1 should be read as vimeo');
  assert.equal(slides[1].querySelector('h1')?.textContent, 'Published Slide', 'row 2 should be read as image');
  assert.ok(slides[2].querySelector('.youtube-wrapper iframe'), 'row 3 should be read as youtube');
  assert.ok(slides[3].querySelector('video'), 'row 4 should be read as video');
});

/* fetchPriority - ports MandaiMastheadCarouselModel's own pass exactly: the
 * FIRST image slide with its checkbox on gets "high"; every slide of ANY
 * kind authored after it gets "low"; slides before it get no attribute. */
const WMC_PRIORITY = `<div class="wrs-masthead-carousel">${wmcParentRows()}
  ${wmcImageRow({ fetchPriority: 'false', header: 'First (no priority)' })}
  ${wmcImageRow({ fetchPriority: 'true', header: 'Second (high)' })}
  ${wmcVideoRow()}
  ${wmcImageRow({ fetchPriority: 'true', header: 'Fourth (still low)' })}
</div>`;
const wmcPriority = await decorateBlock('../blocks/wrs-masthead-carousel/wrs-masthead-carousel.js', WMC_PRIORITY);

test('wrs-masthead-carousel: fetchPriority is high on the first flagged image, low after, absent before', () => {
  const slides = wmcPriority.querySelectorAll('.wrs-masthead-carousel-slide');
  const firstImg = slides[0].querySelector('.wrs-masthead-carousel-media img');
  const secondImg = slides[1].querySelector('.wrs-masthead-carousel-media img');
  const fourthImg = slides[3].querySelector('.wrs-masthead-carousel-media img');
  assert.equal(firstImg.hasAttribute('fetchpriority'), false, 'first slide is before the flagged one');
  assert.equal(secondImg.getAttribute('fetchpriority'), 'high');
  assert.equal(fourthImg.getAttribute('fetchpriority'), 'low', 'a later slide of any kind still gets low');
});

test('wrs-masthead-carousel: an image slide with only a header renders no CTA, sub-heading or countdown', () => {
  const bare = `<div class="wrs-masthead-carousel">${wmcParentRows()}
    <div data-aue-model="wrsmastheadimageslide">
      <div><p>image</p><p><picture><img src="/only.jpg"></picture></p><p><picture><img src="/only-m.jpg"></picture></p></div>
      <div><p>Only A Header</p></div>
      <div></div>
      <div></div>
    </div>
  </div>`;
  return decorateBlock('../blocks/wrs-masthead-carousel/wrs-masthead-carousel.js', bare).then((block) => {
    const slide = block.querySelector('.wrs-masthead-carousel-slide');
    assert.equal(slide.querySelector('h1').textContent, 'Only A Header');
    assert.equal(slide.querySelector('.md-button-big'), null);
    assert.equal(slide.querySelector('.countdown-wrapper'), null);
  });
});

test('wrs-masthead-carousel: viewportScaling and isAutoplayCarousel are read from the parent rows', () => {
  const scaled75 = wmcParentRows('75', 'false', '9000');
  return decorateBlock(
    '../blocks/wrs-masthead-carousel/wrs-masthead-carousel.js',
    `<div class="wrs-masthead-carousel">${scaled75}${wmcImageRow()}</div>`,
  ).then((block) => {
    assert.ok(block.querySelector('.wrs-masthead-carousel-scale-75'));
  });
});

const wmcEmptyOutside = await decorateBlock(
  '../blocks/wrs-masthead-carousel/wrs-masthead-carousel.js',
  `<div class="wrs-masthead-carousel">${wmcParentRows()}</div>`,
);
test('wrs-masthead-carousel: renders nothing outside the editor with no slides authored', () => {
  assert.equal(wmcEmptyOutside.children.length, 0);
});

const wmcEmptyEdit = await decorateBlock(
  '../blocks/wrs-masthead-carousel/wrs-masthead-carousel.js',
  `<div class="wrs-masthead-carousel" data-aue-resource="urn:block1">${wmcParentRows()}</div>`,
);
test('wrs-masthead-carousel: an unconfigured block stays selectable in the editor', () => {
  assert.ok(wmcEmptyEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * WRS Quote Carousel - fixtures constructed from this codebase's confirmed
 * cell shapes (parent select/text cells as seen in wrs-feature-carousel's
 * bg_color/anchorLink; child richtext/text cells as seen in
 * wrs-feature-carousel's content_title/content_description and
 * wrs-conservation-banner's cta cell), NOT copied from a published AEM page
 * - none of this component's instances have been authored yet. Must be
 * re-verified against real published markup once it has.
 * ------------------------------------------------------------------ */

const WQC = `<div class="wrs-quote-carousel">
  <div>bg-sap-white</div>
  <div>Guest quotes</div>
  <div><div>A truly <strong>magical</strong> experience.</div><div>Jane, visitor</div></div>
  <div><div>Loved every moment.</div><div>Sam, visitor</div></div>
</div>`;
const wqc = await decorateBlock('../blocks/wrs-quote-carousel/wrs-quote-carousel.js', WQC);

test('wrs-quote-carousel: normal render - two quotes, richtext markup preserved', () => {
  const items = [...wqc.querySelectorAll('.wrs-quote-carousel-item')];
  assert.equal(items.length, 2);
  assert.equal(items[0].querySelector('.wrs-quote-carousel-quote').innerHTML, 'A truly <strong>magical</strong> experience.');
  assert.equal(items[0].querySelector('.wrs-quote-carousel-name').textContent, 'Jane, visitor');
  assert.equal(items[1].querySelector('.wrs-quote-carousel-quote').textContent, 'Loved every moment.');
});

test('wrs-quote-carousel: the backgroundColor cell applies the matching bg-* class', () => {
  assert.ok(wqc.classList.contains('bg-sap-white'));
  assert.ok(!wqc.classList.contains('bg-base'));
});

test('wrs-quote-carousel: the ariaLabel cell sets the track aria-label', () => {
  assert.equal(wqc.querySelector('.wrs-quote-carousel-track').getAttribute('aria-label'), 'Guest quotes');
});

test('wrs-quote-carousel: two or more items get dots', () => {
  assert.equal(wqc.querySelectorAll('.rb-dot').length, 2);
});

const WQC_DEFAULTS = `<div class="wrs-quote-carousel">
  <div></div>
  <div></div>
  <div><div>Only quote.</div><div>Only Name</div></div>
</div>`;
const wqcDefaults = await decorateBlock('../blocks/wrs-quote-carousel/wrs-quote-carousel.js', WQC_DEFAULTS);
test('wrs-quote-carousel: a blank backgroundColor cell falls back to bg-base, matching the dialog default', () => {
  assert.ok(wqcDefaults.classList.contains('bg-base'));
});
test('wrs-quote-carousel: a blank ariaLabel cell leaves the track with no aria-label', () => {
  assert.equal(wqcDefaults.querySelector('.wrs-quote-carousel-track').hasAttribute('aria-label'), false);
});
test('wrs-quote-carousel: a single item gets no dots', () => {
  assert.equal(wqcDefaults.querySelectorAll('.rb-dot').length, 0);
});

const WQC_BLANK_NAME = `<div class="wrs-quote-carousel">
  <div>bg-base</div>
  <div></div>
  <div><div>No name given.</div><div></div></div>
</div>`;
const wqcBlankName = await decorateBlock('../blocks/wrs-quote-carousel/wrs-quote-carousel.js', WQC_BLANK_NAME);
test('wrs-quote-carousel: a quote with a blank nameDescription cell does not crash decorate()', () => {
  assert.equal(wqcBlankName.querySelector('.wrs-quote-carousel-quote').textContent, 'No name given.');
  assert.equal(wqcBlankName.querySelector('.wrs-quote-carousel-name'), null);
});

const WQC_INSTRUMENTED = `<div class="wrs-quote-carousel">
  <div>bg-base</div>
  <div></div>
  <div data-aue-resource="urn:quote1"><div>Instrumented quote.</div><div>Attribution</div></div>
</div>`;
const wqcInstr = await decorateBlock('../blocks/wrs-quote-carousel/wrs-quote-carousel.js', WQC_INSTRUMENTED);
test('wrs-quote-carousel: instrumentation moves from the child row onto the rendered item', () => {
  assert.equal(wqcInstr.querySelector('.wrs-quote-carousel-item').getAttribute('data-aue-resource'), 'urn:quote1');
});

const wqcEmptyOutside = await decorateBlock(
  '../blocks/wrs-quote-carousel/wrs-quote-carousel.js',
  '<div class="wrs-quote-carousel"><div>bg-base</div><div></div></div>',
);
test('wrs-quote-carousel: renders nothing outside the editor with no quotes authored', () => {
  assert.equal(wqcEmptyOutside.children.length, 0);
});

const wqcEmptyEdit = await decorateBlock(
  '../blocks/wrs-quote-carousel/wrs-quote-carousel.js',
  '<div class="wrs-quote-carousel" data-aue-resource="urn:block1"><div>bg-base</div><div></div></div>',
);
test('wrs-quote-carousel: an unconfigured block stays selectable in the editor', () => {
  assert.ok(wqcEmptyEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * WRS Social Grid - fixtures constructed from this codebase's confirmed cell
 * shapes (a single-field cell as seen in wrs-admission-types' title/path
 * cells; a grouped two-field cell rendering one <p> per value as seen in
 * primary-button's cta_link/cta_variant/cta_newTab cell; a single-field
 * picture cell as seen in wrs-feature-carousel's image cells), NOT copied
 * from a published AEM page - none of this component's instances have been
 * authored yet. Must be re-verified against real published markup once it
 * has. One case per feed type (facebook/instagram/twitter/text/image) is
 * included deliberately - collapsing 12 dialog fields into 4 cells is the
 * main risk in this block, and only a per-type render check can catch a
 * type whose fields don't actually collapse cleanly.
 * ------------------------------------------------------------------ */

const wsgFacebookRow = (n) => `<div data-aue-resource="urn:fb${n}"><div>fa-facebook-square</div><div><picture><img src="/fb${n}.png" alt=""></picture></div><div><p><a href="https://facebook.com/mandaiwildlife/post/${n}">facebook</a></p><p>@mandaiwildlife</p></div><div></div></div>`;
const wsgInstagramRow = (n) => `<div><div>fa-instagram</div><div><picture><img src="/ig${n}.png" alt=""></picture></div><div><p><a href="https://instagram.com/p/${n}">instagram</a></p><p>@mandai.wildlife</p></div><div></div></div>`;
const wsgTwitterRow = (n) => `<div><div>fa-twitter</div><div></div><div><p><a href="https://twitter.com/mandaiwildlife/status/${n}">twitter</a></p><p>@mandaiwildlife</p></div><div>Baby otter pups spotted at River Wonders!</div></div>`;
const wsgTextRow = (n) => `<div><div>text</div><div></div><div></div><div>Enjoy the National Day <strong>discounts</strong>, item ${n}!</div></div>`;
const wsgImageRow = (n) => `<div><div>image</div><div><picture><img src="/gallery${n}.png" alt=""></picture></div><div></div><div></div></div>`;

const WSG = `<div class="wrs-social-grid">
  <div data-aue-resource="urn:title1">Follow Us</div>
  ${wsgFacebookRow(1)}${wsgInstagramRow(2)}${wsgTwitterRow(3)}${wsgTextRow(4)}${wsgImageRow(5)}
</div>`;
const wsg = await decorateBlock('../blocks/wrs-social-grid/wrs-social-grid.js', WSG);

test('wrs-social-grid: the title cell becomes the main tile heading, instrumentation moved', () => {
  const h3 = wsg.querySelector('.wrs-social-grid-column.main h3');
  assert.equal(h3.textContent, 'Follow Us');
  assert.equal(h3.getAttribute('data-aue-resource'), 'urn:title1');
});

test('wrs-social-grid: facebook - image column, link, handle and icon', () => {
  const col = wsg.querySelectorAll('.wrs-social-grid-column')[1];
  assert.ok(col.classList.contains('photo'));
  assert.equal(col.querySelector('a').getAttribute('href'), 'https://facebook.com/mandaiwildlife/post/1');
  assert.equal(col.querySelector('.wrs-social-grid-handle').textContent, '@mandaiwildlife');
  assert.equal(col.querySelector('.wrs-social-grid-username i').className, 'fab fa-facebook-square');
  assert.ok(col.querySelector('picture img'));
});

test('wrs-social-grid: instagram - same shape as facebook, own values', () => {
  const col = wsg.querySelectorAll('.wrs-social-grid-column')[2];
  assert.ok(col.classList.contains('photo'));
  assert.equal(col.querySelector('a').getAttribute('href'), 'https://instagram.com/p/2');
  assert.equal(col.querySelector('.wrs-social-grid-handle').textContent, '@mandai.wildlife');
});

test('wrs-social-grid: twitter - no image field, renders as a text column with a link and a title', () => {
  const col = wsg.querySelectorAll('.wrs-social-grid-column')[3];
  assert.ok(col.classList.contains('twitter'), 'twitter has no image data, so it must fall into the text-styled column');
  assert.equal(col.querySelector('a').getAttribute('href'), 'https://twitter.com/mandaiwildlife/status/3');
  assert.equal(col.querySelector('.wrs-social-grid-title h4').textContent, 'Baby otter pups spotted at River Wonders!');
  assert.equal(col.querySelector('.wrs-social-grid-handle').textContent, '@mandaiwildlife');
  assert.equal(col.querySelector('.wrs-social-grid-desc'), null, 'twitter renders a title, not a desc panel');
});

test('wrs-social-grid: text - no link, renders the message as a desc panel (not a title), richtext markup preserved', () => {
  const col = wsg.querySelectorAll('.wrs-social-grid-column')[4];
  assert.ok(col.classList.contains('twitter'), 'the "twitter" column class covers every non-photo tile, including type=text');
  assert.equal(col.querySelector('a'), null, 'no link cell authored for this type');
  assert.equal(col.querySelector('.wrs-social-grid-desc').innerHTML, 'Enjoy the National Day <strong>discounts</strong>, item 4!');
  assert.equal(col.querySelector('.wrs-social-grid-title'), null);
});

test('wrs-social-grid: image - photo column, no link, no username (no handle authored for this type)', () => {
  const col = wsg.querySelectorAll('.wrs-social-grid-column')[5];
  assert.ok(col.classList.contains('photo'));
  assert.equal(col.querySelector('a'), null);
  assert.equal(col.querySelector('.wrs-social-grid-username'), null);
  assert.ok(col.querySelector('picture img'));
});

test('wrs-social-grid: instrumentation moves from a child row onto the column it becomes', () => {
  assert.equal(wsg.querySelectorAll('.wrs-social-grid-column')[1].getAttribute('data-aue-resource'), 'urn:fb1');
});

test('wrs-social-grid: 6 columns total (title + 5 items) does not get the compact modifier', () => {
  assert.ok(!wsg.classList.contains('wrs-social-grid-compact'));
});

const WSG_COMPACT = `<div class="wrs-social-grid">
  <div>Follow Us</div>
  ${wsgFacebookRow(1)}${wsgTwitterRow(2)}${wsgImageRow(3)}
</div>`;
const wsgCompact = await decorateBlock('../blocks/wrs-social-grid/wrs-social-grid.js', WSG_COMPACT);
test('wrs-social-grid: 4 columns total (title + 3 items) gets the compact modifier, re-deriving tileOrder', () => {
  assert.ok(wsgCompact.classList.contains('wrs-social-grid-compact'));
});

const WSG_BLANK_LINK = `<div class="wrs-social-grid">
  <div></div>
  <div><div>fa-facebook-square</div><div><picture><img src="/fb.png" alt=""></picture></div><div><p><a href="/mandai">facebook</a></p><p></p></div><div></div></div>
  <div><div>fa-instagram</div><div><picture><img src="/ig.png" alt=""></picture></div><div><p></p></div><div></div></div>
</div>`;
const wsgBlankLink = await decorateBlock('../blocks/wrs-social-grid/wrs-social-grid.js', WSG_BLANK_LINK);
test('wrs-social-grid: a link cell with a url but a blank handle does not crash decorate() and renders no username', () => {
  // index 0 is always the main title column - see the next test's comment.
  const col = wsgBlankLink.querySelectorAll('.wrs-social-grid-column')[1];
  assert.equal(col.querySelector('a').getAttribute('href'), '/mandai');
  assert.equal(col.querySelector('.wrs-social-grid-username'), null);
});
test('wrs-social-grid: a link cell that is entirely blank does not crash decorate() and renders no link', () => {
  // The main tile column always renders (matching the source's own
  // unconditional main-tile <div>, even with a blank title), so it is
  // always index 0 and item columns start at index 1.
  const col = wsgBlankLink.querySelectorAll('.wrs-social-grid-column')[2];
  assert.equal(col.querySelector('a'), null);
});

const wsgEmptyOutside = await decorateBlock(
  '../blocks/wrs-social-grid/wrs-social-grid.js',
  '<div class="wrs-social-grid"><div></div></div>',
);
test('wrs-social-grid: renders nothing outside the editor with no title and no items authored', () => {
  assert.equal(wsgEmptyOutside.children.length, 0);
});

const wsgEmptyEdit = await decorateBlock(
  '../blocks/wrs-social-grid/wrs-social-grid.js',
  '<div class="wrs-social-grid" data-aue-resource="urn:block1"><div></div></div>',
);
test('wrs-social-grid: an unconfigured block stays selectable in the editor', () => {
  assert.ok(wsgEmptyEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * WRS Pull Quote - no published markup exists yet, so this fixture is
 * constructed from this codebase's own confirmed cell shapes: the richtext
 * cell mirrors wrs-conservation-banner's content-description reading (a
 * <div> holding the rich text's own <p> children directly, HTML kept, not
 * flattened) and the variant select mirrors every other lone select cell in
 * this repo (primary-button's `position`, wrs-conservation-banner's
 * gradient marker) - a bare text value in its own cell. Must be re-verified
 * against real published markup once this block has been authored.
 * ------------------------------------------------------------------ */
const WPQ = `<div class="wrs-pull-quote">
  <div><p>Every visit helps fund conservation work.</p></div>
  <div>quote</div>
</div>`;
const wpq = await decorateBlock('../blocks/wrs-pull-quote/wrs-pull-quote.js', WPQ);

test('wrs-pull-quote: renders a blockquote wrapped in curly quote characters', () => {
  const bq = wpq.querySelector('blockquote');
  assert.ok(bq);
  assert.match(bq.textContent, /^“\s*Every visit helps fund conservation work\.\s*”$/);
  assert.equal(wpq.querySelector('.wrs-pull-quote-inner').classList.contains('half-page'), false);
});

const WPQ_MULTI = `<div class="wrs-pull-quote">
  <div><p>First line.</p><p><strong>Bold</strong> second line.</p></div>
  <div>halfPage</div>
</div>`;
const wpqMulti = await decorateBlock('../blocks/wrs-pull-quote/wrs-pull-quote.js', WPQ_MULTI);

test('wrs-pull-quote: a multi-paragraph quote keeps each paragraph\'s own markup (outerHTML, not flattened text)', () => {
  const bq = wpqMulti.querySelector('blockquote');
  assert.ok(bq.querySelector('strong'));
  assert.equal(bq.querySelectorAll('p').length, 2);
});

test('wrs-pull-quote: the halfPage variant adds the half-page modifier class', () => {
  assert.ok(wpqMulti.querySelector('.wrs-pull-quote-inner').classList.contains('half-page'));
});

const WPQ_UNKNOWN_VARIANT = `<div class="wrs-pull-quote">
  <div><p>Falls back to quote.</p></div>
  <div></div>
</div>`;
const wpqDefaultVariant = await decorateBlock('../blocks/wrs-pull-quote/wrs-pull-quote.js', WPQ_UNKNOWN_VARIANT);
test('wrs-pull-quote: a blank variant cell defaults to the quote (non-half-page) style', () => {
  assert.equal(wpqDefaultVariant.querySelector('.wrs-pull-quote-inner').classList.contains('half-page'), false);
});

const WPQ_INSTRUMENTED = `<div class="wrs-pull-quote">
  <div data-aue-resource="urn:text1"><p>Instrumented text.</p></div>
  <div>quote</div>
</div>`;
const wpqInstr = await decorateBlock('../blocks/wrs-pull-quote/wrs-pull-quote.js', WPQ_INSTRUMENTED);
test('wrs-pull-quote: instrumentation moves from the text row onto the element that replaces it', () => {
  assert.equal(wpqInstr.querySelector('.wrs-pull-quote-inner').getAttribute('data-aue-resource'), 'urn:text1');
});

const wpqEmpty = await decorateBlock('../blocks/wrs-pull-quote/wrs-pull-quote.js', '<div class="wrs-pull-quote"></div>');
test('wrs-pull-quote: renders nothing when unconfigured outside the editor', () => {
  assert.equal(wpqEmpty.children.length, 0);
});

const wpqEdit = await decorateBlock(
  '../blocks/wrs-pull-quote/wrs-pull-quote.js',
  '<div class="wrs-pull-quote" data-aue-resource="urn:block1"></div>',
);
test('wrs-pull-quote: unconfigured block stays selectable in the editor', () => {
  assert.ok(wpqEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ *
 * WRS Section Title - no published markup exists yet (this component has
 * not been authored on a real page), so this fixture is constructed from
 * this codebase's own confirmed cell shapes rather than copied from a live
 * page: a single-field cell (title) renders bare text with no <p>, a
 * grouped cell with two authored values renders one <p> per value, and a
 * grouped cell with only one of its two fields authored (the required
 * select always present, the optional field blank) falls back to bare
 * text too - the same shapes wrs-accordion-tabs' opt cell and
 * wrs-featured-listing's lone aem-content cell already confirm. Must be
 * re-verified against real output once this block has been authored once.
 * ------------------------------------------------------------------ */
const WST_FULL = `<div class="wrs-section-title" data-aue-resource="urn:block1">
  <div data-aue-resource="urn:title1">Quick Facts</div>
  <div><p>h3</p><p>quick-facts</p></div>
  <div><p>title-left</p><p>section-title-space--no-padding-bottom</p></div>
  <div><a href="/content/wrs/en/about">About</a></div>
</div>`;
const wstFull = await decorateBlock('../blocks/wrs-section-title/wrs-section-title.js', WST_FULL);

test('wrs-section-title: style selects the heading tag', () => {
  const heading = wstFull.querySelector('.wrs-section-title-heading');
  assert.equal(heading.tagName, 'H3');
});

test('wrs-section-title: anchorLink becomes the heading id', () => {
  assert.equal(wstFull.querySelector('.wrs-section-title-heading').id, 'quick-facts');
});

test('wrs-section-title: align adds the align-left modifier', () => {
  assert.ok(wstFull.querySelector('.wrs-section-title-heading').classList.contains('align-left'));
});

test('wrs-section-title: bottomPadding=None adds no-padding-bottom to the block', () => {
  assert.ok(wstFull.classList.contains('no-padding-bottom'));
  assert.equal(wstFull.classList.contains('small-padding-bottom'), false);
});

test('wrs-section-title: a link makes the title text an anchor, with the .html suffix appended', () => {
  const a = wstFull.querySelector('.wrs-section-title-heading a');
  assert.equal(a.getAttribute('href'), '/content/wrs/en/about.html');
  assert.equal(a.textContent, 'Quick Facts');
});

test('wrs-section-title: instrumentation moves onto the anchor, not the heading, when a link is authored', () => {
  const a = wstFull.querySelector('.wrs-section-title-heading a');
  assert.equal(a.getAttribute('data-aue-resource'), 'urn:title1');
  assert.equal(wstFull.querySelector('.wrs-section-title-heading').hasAttribute('data-aue-resource'), false);
});

/* Minimal fixture: only the required fields (title, the default style/align)
 * are authored - anchorLink, bottomPadding and link are all left blank. */
const WST_MINIMAL = `<div class="wrs-section-title" data-aue-resource="urn:block2">
  <div data-aue-resource="urn:title2">Our Mission</div>
  <div>h2</div>
  <div>title-center</div>
  <div></div>
</div>`;
const wstMinimal = await decorateBlock('../blocks/wrs-section-title/wrs-section-title.js', WST_MINIMAL);

test('wrs-section-title: blank anchorLink/bottomPadding/link cells do not throw and default sensibly', () => {
  const heading = wstMinimal.querySelector('.wrs-section-title-heading');
  assert.equal(heading.tagName, 'H2');
  assert.equal(heading.hasAttribute('id'), false);
  assert.equal(heading.classList.contains('align-left'), false);
  assert.equal(wstMinimal.classList.contains('no-padding-bottom'), false);
  assert.equal(wstMinimal.classList.contains('small-padding-bottom'), false);
  assert.equal(heading.querySelector('a'), null);
  assert.equal(heading.textContent, 'Our Mission');
});

test('wrs-section-title: instrumentation moves onto the heading itself when there is no link', () => {
  assert.equal(wstMinimal.querySelector('.wrs-section-title-heading').getAttribute('data-aue-resource'), 'urn:title2');
});

const wstSmall = await decorateBlock('../blocks/wrs-section-title/wrs-section-title.js', `<div class="wrs-section-title">
  <div>Smaller Padding</div>
  <div><p>h4</p></div>
  <div><p>title-center</p><p>section-title-space--small-padding-bottom</p></div>
  <div></div>
</div>`);
test('wrs-section-title: bottomPadding=Smaller adds small-padding-bottom to the block', () => {
  assert.ok(wstSmall.classList.contains('small-padding-bottom'));
  assert.equal(wstSmall.classList.contains('no-padding-bottom'), false);
});

const wstEmpty = await decorateBlock('../blocks/wrs-section-title/wrs-section-title.js', '<div class="wrs-section-title"></div>');
test('wrs-section-title: renders nothing when unconfigured outside the editor', () => {
  assert.equal(wstEmpty.children.length, 0);
});

const wstEdit = await decorateBlock(
  '../blocks/wrs-section-title/wrs-section-title.js',
  '<div class="wrs-section-title" data-aue-resource="urn:block3"></div>',
);
test('wrs-section-title: unconfigured block stays selectable in the editor', () => {
  assert.ok(wstEdit.querySelector('.rb-placeholder'), 'expected a placeholder to click');
});

/* ------------------------------------------------------------------ */
let failed = 0;
results.forEach(([status, name]) => {
  if (status === 'FAIL') failed += 1;
  console.log(`${status === 'pass' ? '  ok' : 'FAIL'}  ${name}`);
});
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
