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

/* ------------------------------------------------------------------ */
let failed = 0;
results.forEach(([status, name]) => {
  if (status === 'FAIL') failed += 1;
  console.log(`${status === 'pass' ? '  ok' : 'FAIL'}  ${name}`);
});
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
