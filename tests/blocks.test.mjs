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
  <div><div><a href="/" title="Come click on the CTA">index page</a></div></div>
  <div><div>green</div></div>
  <div><div>center</div></div>
  <div><div>true</div></div>
</div>`;

const pb = await decorateBlock('../blocks/primary-button/primary-button.js', PRIMARY_BUTTON);

test('primary-button: link, text and title all come off the one collapsed anchor', () => {
  const a = pb.querySelector('a');
  assert.equal(a.getAttribute('href'), '/');
  assert.equal(a.textContent, 'index page');
  assert.equal(a.getAttribute('title'), 'Come click on the CTA');
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
  <div><div><p><a href="/">View More</a></p><p>yellow</p><p>true</p></div></div>
  <div data-aue-resource="urn:c1"><div><picture><img src="/1.png" alt="iceberg"></picture></div><div>image 1</div><div><p><a href="/">View More Details</a></p><p>green</p></div></div>
  <div data-aue-resource="urn:c2"><div><picture><img src="/2.png" alt="headless"></picture></div><div>image 2</div><div><p><a href="/">View More Details</a></p><p>yellow</p></div></div>
</div>`;
const tc = await decorateBlock('../blocks/three-column-tiles/three-column-tiles.js', THREE_COL);

test('three-column-tiles: parent copy, mask and CTA are all read', () => {
  assert.equal(tc.querySelector('.three-column-tiles-title').textContent, 'Three Column Tiles');
  assert.equal(tc.querySelector('.three-column-tiles-subtitle').textContent, 'more description here');
  assert.ok(tc.querySelector('.rb-section.mask-2'));
  assert.ok(tc.querySelector('.three-column-tiles-cta .rb-cta.yellow'));
});

test('three-column-tiles: each tile keeps its own caption and CTA variant', () => {
  const items = [...tc.querySelectorAll('li.three-column-tiles-item')];
  assert.equal(items.length, 2);
  assert.equal(items[0].querySelector('h4').textContent, 'image 1');
  assert.ok(items[0].querySelector('.rb-cta.green'));
  assert.ok(items[1].querySelector('.rb-cta.yellow'));
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

/* Editor mode: a hidden panel is not a drop target, so with only the first
 * panel visible a tile could only ever be dropped into the first tab. */
const tbEdit = await decorateBlock(
  '../blocks/tabs/tabs.js',
  `<div class="tabs" data-aue-resource="urn:tabs">${tabsTabRow(1, 'green')}${tabsTabRow(2, 'yellow')}</div>`,
);
test('tabs: every panel is a drop target in the editor', () => {
  const panels = [...tbEdit.querySelectorAll('.tabs-panel')];
  assert.equal(panels.length, 2);
  assert.ok(panels.every((p) => p.hidden === false), 'no panel may be hidden while editing');
  assert.ok(tbEdit.classList.contains('tabs-editing'));
});

test('tabs: a tab with no tiles still gets an empty grid to drop into', () => {
  const grids = tbEdit.querySelectorAll('.tabs-tiles');
  assert.equal(grids.length, 2);
  assert.equal(grids[1].children.length, 0);
});

test('tabs: each editor panel is labelled with its tab name', () => {
  assert.deepEqual(
    [...tbEdit.querySelectorAll('.tabs-panel-label')].map((l) => l.textContent),
    ['Tab 1', 'Tab 2'],
  );
});

test('tabs: the published page still hides all but the first panel', () => {
  const panels = [...tb.querySelectorAll('.tabs-panel')];
  assert.equal(panels[1].hidden, true);
  assert.ok(!tb.classList.contains('tabs-editing'));
  assert.equal(tb.querySelectorAll('.tabs-panel-label').length, 0);
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
  <div><p><picture><img src="/desktop${n}.png" alt=""></picture></p><p><picture><img src="/mobile${n}.png" alt=""></picture></p></div>
  <div><p><a href="/">View More</a></p><p>green</p><p>true</p></div>
  <div><p>mask-1</p><p>left</p><p>false</p></div>
</div>`;
const carousel = await decorateBlock(
  '../blocks/one-column-banner-carousel/one-column-banner-carousel.js',
  `<div class="one-column-banner-carousel">${BANNER(1)}${BANNER(2)}</div>`,
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
  assert.match(section.style.getPropertyValue('--banner-bg-desktop'), /desktop1\.png/);
  assert.match(section.style.getPropertyValue('--banner-bg-mobile'), /mobile1\.png/);
});

test('one-column-banner-carousel: style keywords are not rendered as copy', () => {
  const first = carousel.querySelector('li.one-column-banner-carousel-item');
  assert.ok(first.querySelector('.one-column-banner-carousel-content.align-left'));
  assert.ok(!first.querySelector('.rb-section').classList.contains('has-gradient'));
  assert.doesNotMatch(first.textContent, /mask-1|false/);
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
  <div><div><picture><img src="/desktop.png" alt=""></picture></div></div>
  <div><div><picture><img src="/mobile.png" alt=""></picture></div></div>
</div>`;
const sh = await decorateBlock('../blocks/sub-header/sub-header.js', SUB_HEADER);
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
  <div><div><p><picture><img src="/d.png" alt=""></picture></p><p><picture><img src="/m.png" alt=""></picture></p></div></div>
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
  assert.match(s.style.getPropertyValue('--banner-bg-desktop'), /d\.png/);
  assert.match(s.style.getPropertyValue('--banner-bg-mobile'), /m\.png/);
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

/* ------------------------------------------------------------------ */
let failed = 0;
results.forEach(([status, name]) => {
  if (status === 'FAIL') failed += 1;
  console.log(`${status === 'pass' ? '  ok' : 'FAIL'}  ${name}`);
});
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
