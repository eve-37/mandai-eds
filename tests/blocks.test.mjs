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
  assert.equal(ft.querySelectorAll('.four-column-tiles-dot').length, 3);
});

const ftOne = await decorateBlock('../blocks/four-column-tiles/four-column-tiles.js', FOUR_COL([1]));
test('four-column-tiles: a single tile gets no dots', () => {
  assert.equal(ftOne.querySelectorAll('.four-column-tiles-dot').length, 0);
  assert.equal(ftOne.querySelectorAll('li.four-column-tiles-item').length, 1);
});

const ftNone = await decorateBlock('../blocks/four-column-tiles/four-column-tiles.js', FOUR_COL([]));
test('four-column-tiles: parent still renders with no tiles at all', () => {
  assert.ok(ftNone.querySelector('.four-column-tiles-title'));
  assert.equal(ftNone.querySelectorAll('li').length, 0);
});

/* A tile whose image the author left blank must still be a tile, not be
 * mistaken for a parent property row - that is what the cell-count check buys. */
const NO_IMAGE = `<div class="four-column-tiles">
  <div><div>Title here</div></div>
  <div><div><picture><img src="/a.png" alt=""></picture></div><div>Has image</div></div>
  <div data-aue-resource="urn:x"><div></div><div>No image yet</div></div>
</div>`;
const ftBlank = await decorateBlock('../blocks/four-column-tiles/four-column-tiles.js', NO_IMAGE);
test('four-column-tiles: a tile with no image is still a tile', () => {
  assert.equal(ftBlank.querySelectorAll('li.four-column-tiles-item').length, 2);
  assert.equal(ftBlank.querySelector('.four-column-tiles-title').textContent, 'Title here');
});

/* ------------------------------------------------------------------ */
let failed = 0;
results.forEach(([status, name]) => {
  if (status === 'FAIL') failed += 1;
  console.log(`${status === 'pass' ? '  ok' : 'FAIL'}  ${name}`);
});
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
