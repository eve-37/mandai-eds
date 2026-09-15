/**
 * WRS Masthead Carousel
 *
 * Ported from wrs-aem/.../wrs/components/mandai/mandaimastheadcarousel.
 *
 * THE SPLIT DECISION - why this is FOUR child block types, not one
 * -------------------------------------------------------------
 * The source `bannerItems` multifield has 33 fields gated by a `mediaOption`
 * select into five branches (image / video / youtube / vimeo, plus a
 * countdown-timer panel nested inside the image branch). One child model
 * cannot hold 33 fields - even 7 underscore-prefixed groups exceeds the
 * 4-cell maximum a single model is allowed.
 *
 * Weighed three shapes (see docs/wrs-migration-notes.md for the full writeup):
 *   1. one container, one child model - REJECTED, does not fit in 4 cells.
 *   2. one container, FOUR child models (image/video/youtube/vimeo), each
 *      its own multifield-shaped set of fields - CHOSEN. Each branch's own
 *      field count, grouped the same way every other block in this repo
 *      groups fields, fits comfortably in <=4 cells on its own (image: 16
 *      fields -> 4 cells; video: 6 -> 3; youtube: 2 -> 1; vimeo: 8 -> 4).
 *   3. merge video/youtube/vimeo into one "video" child with a `source`
 *      select - REJECTED. The three branches share almost no fields
 *      (youtube has no mobile fallback at all, vimeo has a playback-behavior
 *      toggle neither of the others has) - a merged model would need every
 *      field of all three, right back to the count problem #1 hit, for a
 *      grouping that does not exist in the source dialog.
 *   4. image-only now, others flagged - REJECTED. Unlike featuredlistingv2
 *      (a genuine server-side architecture gap) or footer's inherited
 *      site-chrome panels, video/youtube/vimeo here are ordinary,
 *      client-renderable HTML (<video>, an iframe) with no repository/OSGi
 *      dependency - there is no architectural reason to leave them
 *      unbuilt, only an effort one. They are built below (see "WHAT IS
 *      BUILT" for the one exception).
 *
 * This is exactly the "block item cannot itself be a container, so flatten
 * to siblings" case the skill documents (see `blocks/tabs/tabs.js`,
 * `blocks/wrs-feature-carousel` in this repo for the two-child precedent).
 * Four sibling child types is the same technique one level wider.
 *
 * TELLING FOUR CHILD TYPES APART, NOT TWO
 * -------------------------------------------------------------
 * `tabs` distinguishes 2 child types by re-reading an existing `align`
 * select's value. Four types is one too many to safely overload an existing
 * field, so each child model carries one dedicated marker field
 * (`image_kind` / `video_kind` / `youtube_kind` / `vimeo_kind`) - a select
 * with exactly one fixed option, always first in the model so it is always
 * the first text value of the row's first cell. In the editor `rowKind()`
 * asks `data-aue-model` directly (present from creation); on a published
 * page it falls back to reading that first value. This is a field the
 * source dialog does not have - a deliberate, documented exception to the
 * ground rule's "do not add fields the dialog lacks", because it is exactly
 * the discriminator pattern the migration skill itself prescribes for this
 * situation, not an authoring convenience.
 *
 * WHAT IS BUILT, WHAT IS NOT
 * -------------------------------------------------------------
 * - Image slides: built completely - background image swap, heading, sub
 *   heading, CTA, gradient overlay, text alignment/bottom-spacing, fetch
 *   priority, and a countdown timer (see below).
 * - Video (mp4) slides: built - desktop/mobile <video> source swap, mobile
 *   fallback image, mute/play controller buttons.
 * - YouTube slides: built - lazy iframe embed (loaded on intersection, not
 *   eagerly, matching this repo's masthead.js's own lazy-Brightcove
 *   rationale), mute/unmute control via the documented YouTube postMessage
 *   API (no iframe_api script load required).
 * - Vimeo slides: built - lazy iframe embed, inline vs popup playback
 *   behavior, mute/play controls via Vimeo's documented postMessage
 *   protocol. NOT built: the "popup" playback behavior's actual modal
 *   (`#vimeoModal` in the source HTL is shared, page-level markup outside
 *   this component's own DOM, wired by a script not in this bundle either;
 *   only "inline" is implemented, "popup" falls back to inline rendering -
 *   flagged, not invented).
 *
 * SCRIPTS THE SOURCE HTL REFERENCES
 * -------------------------------------------------------------
 * - `timer-countdown.js` - was missing from the export when this block was
 *   written, so `initCountdown()` below was built from what the markup and
 *   field descriptions imply rather than copied. The file has since been
 *   recovered from Mandai-EMP-Frontend and CHECKED AGAINST this
 *   implementation: both assumptions held. It reads `data-time-end` with a
 *   plain `new Date(...)` and never touches `gmt` at all, and it guards the
 *   expiry redirect with `mode === 'publish'`, which is what `!isEditMode`
 *   expresses here. The source also clamps the four units to 0 on expiry,
 *   which this does. No change was needed - recorded so the next reader does
 *   not re-derive it.
 * - Nothing in the bundle wires `.md-masthead__volume-button` /
 *   `.md-masthead__play-button` clicks for THIS component's own controller
 *   markup - `video-banner.js`'s `embedSoundControl()` targets a different,
 *   older `.sound-controller` pattern used elsewhere on the site, not
 *   `.md-masthead__controller`. The click handling below (`wireControls()`)
 *   is original code providing equivalent UX (mute/unmute, play/pause,
 *   matching icon swap), not a verified port.
 *
 * GRADIENT CLASSES - a reconstruction, not a verified port
 * -------------------------------------------------------------
 * The HTL applies `item.imageGradient` / `item.textGradient` - computed by
 * `MastheadCarouselItem.java`, which is NOT in this bundle (only the parent
 * `MandaiMastheadCarouselModel.java` is). The dialog's own `gradientOption`
 * values are `onText`/`onImage`; the deployed CSS extract's gradient rules
 * are keyed on differently-named classes (`gradients-right-left` etc, see
 * `deployed-bundle-extract.css` lines ~1524-1900) that do not obviously map
 * 1:1 to those two dialog values, and the bean that would resolve one into
 * the other is missing. `onImage` is ported as a gradient over the picture
 * (`gradients-bottom-top`'s shape - a bottom-anchored dark fade, the most
 * common masthead treatment and the only one of the extract's three gradient
 * directions that does not depend on `content_textAlignment`), `onText` as
 * a soft radial gradient behind the text panel only. Both are a best-effort
 * reconstruction from the CSS alone - flag for re-check once authored.
 *
 * CONSOLIDATION WITH THE EXISTING `masthead` AND `hero` BLOCKS
 * -------------------------------------------------------------
 * Not attempted here, and `blocks/masthead/` and `blocks/hero/` are
 * untouched, per the task's constraints. Worth a human decision later:
 * `masthead.js`'s lazy-Brightcove-behind-an-IntersectionObserver pattern is
 * reused here for YouTube/Vimeo, and `masthead.js`'s DESKTOP=992 breakpoint
 * constant is duplicated rather than imported, because that block's is a
 * private, undocumented convention of its own module, not an exported
 * shared constant - promoting it to a shared helper (in `scripts/scripts.js`
 * or a new `masthead-helpers.js`) once BOTH blocks are authored and this
 * one's real usage is known would remove the duplication cleanly. This
 * block is also, structurally, a superset of `masthead` (single-slide
 * masthead vs multi-slide carousel with 4 media types) - if `mandaimasthead`
 * (the non-carousel sibling, migrated separately if in scope) turns out to
 * need the same 4 media types, unifying the two behind one shared renderer
 * would be the next real step, not attempted here to avoid touching a block
 * outside this task's scope.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import {
  cellText, cellValues, cellSlots, readCta, renderEmpty, splitRows,
} from '../../scripts/rb-helpers.js';

const PREFIX = 'wrs-masthead-carousel';

/** viewportScaling, isAutoplayCarousel, carouselSpeed - see _wrs-masthead-carousel.json. */
const PARENT_CELLS = 3;

/** Source's own breakpoint for "big enough for a desktop media variant". */
const DESKTOP = 992;

const MODEL_TO_KIND = {
  wrsmastheadimageslide: 'image',
  wrsmastheadvideoslide: 'video',
  wrsmastheadyoutubeslide: 'youtube',
  wrsmastheadvimeoslide: 'vimeo',
};
const KNOWN_KINDS = Object.values(MODEL_TO_KIND);

const ALIGNMENTS = ['text-left', 'text-center'];
const GRADIENTS = ['ontext', 'onimage'];

/**
 * Identifies which of the four child models produced this row.
 *
 * In the editor `data-aue-model` is present the moment a row is created,
 * before any field has a value - the reliable signal. On a published page
 * there is none, so this falls back to each child model's own `_kind`
 * marker field, which is always the first field of the first cell and is
 * never blank (it is a locked single-option select) - unlike every other
 * discriminator used elsewhere in this repo, it cannot be desynced by an
 * author leaving a field empty.
 */
function rowKind(row) {
  const model = row.getAttribute('data-aue-model');
  if (model && MODEL_TO_KIND[model]) return MODEL_TO_KIND[model];
  const first = cellValues(row.children[0])[0];
  return KNOWN_KINDS.includes(first) ? first : null;
}

/** True for a cellValues() entry that is a rendered boolean field's value. */
function isBool(v) { return v === 'true' || v === 'false'; }

/**
 * Reads the `image_` cell: kind marker, two `reference` images, alt text,
 * fetch-priority boolean - a mix of picture elements and plain text values.
 *
 * Pictures are read by tag, independent of position (`querySelectorAll`
 * returns them in DOM/declaration order: desktop first, mobile second - the
 * same technique `one-column-banner`'s `bg_` cell and `wrs-feature-carousel`'s
 * `readBackground()` both rely on). Text values are matched by shape
 * (alt vs the literal 'true'/'false' of the boolean) rather than position,
 * which is slightly more robust than pure position here because a blank alt
 * would otherwise shift the boolean into the alt slot.
 */
function readImageCell(cell) {
  const [desktop = null, mobile = null] = [...(cell?.querySelectorAll('picture') ?? [])];
  const texts = cellValues(cell).slice(1); // drop the kind marker
  const fetchPriority = texts.some((t) => t === 'true');
  const alt = texts.find((t) => !isBool(t)) || '';
  return {
    desktop, mobile, alt, fetchPriority,
  };
}

/**
 * Reads the `content_` cell: header, subHeader, textAlignment (select),
 * gradient (select, default '' so it drops out of cellValues() entirely
 * when unset), bottomSpacing (number).
 *
 * `alignment`/`gradient`/`bottomSpacing` are matched by shape against each
 * field's own fixed vocabulary, the same technique `tabs.js`'s TILE_ALIGNS
 * uses - immune to a dropped blank, since a missing entry just never
 * matches anything, so they stay on `cellValues()`.
 *
 * `header`/`subHeader` are different: both are free text with nothing to
 * tell them apart by content, so they are read via `cellSlots()` at their
 * fixed field-declaration indices (0, 1) instead - a blank header no longer
 * pulls subHeader's value into the header slot. This fixes that IF AEM
 * emits an empty `<p></p>` for the blank field; see cellSlots()'s own
 * docblock for the known-vs-assumed caveat, and re-verify once authored.
 */
function readContentCell(cell) {
  const content = {
    header: '', subHeader: '', alignment: 'text-left', gradient: '', bottomSpacing: '',
  };
  const [header = '', subHeader = ''] = cellSlots(cell);
  content.header = header;
  content.subHeader = subHeader;
  cellValues(cell).forEach((raw) => {
    const lower = raw.toLowerCase();
    if (ALIGNMENTS.includes(lower)) { content.alignment = lower; return; }
    if (GRADIENTS.includes(lower)) { content.gradient = lower; return; }
    if (/^\d+$/.test(raw) && !content.bottomSpacing) content.bottomSpacing = raw;
  });
  return content;
}

/**
 * Reads the `countdown_` cell. `gmt` is read but NOT used to compute the
 * countdown target - see `initCountdown()`'s own comment for why.
 */
function readCountdownCell(cell) {
  const countdown = {
    enabled: false, timer: '', redirectHref: cell?.querySelector('a')?.getAttribute('href') || '', description: '',
  };
  cellValues(cell).forEach((raw) => {
    if (isBool(raw)) { countdown.enabled = raw === 'true'; return; }
    if (!countdown.timer && !Number.isNaN(Date.parse(raw))) { countdown.timer = raw; return; }
    if (!countdown.description) countdown.description = raw;
  });
  return countdown;
}

/** First image/video-ish URL under an element: <img src>, <source src>, or an <a href>. */
function firstAssetUrl(el) {
  if (!el) return '';
  const img = el.querySelector('img');
  if (img?.getAttribute('src')) return img.getAttribute('src');
  const source = el.querySelector('source');
  if (source?.getAttribute('src')) return source.getAttribute('src');
  const a = el.querySelector('a');
  if (a?.getAttribute('href')) return a.getAttribute('href');
  return '';
}

/**
 * Reads a `video_`/`vimeo_` pair of consecutive `reference`/`text` fields.
 *
 * UNVERIFIED: unlike an image `reference` field (confirmed elsewhere in this
 * repo to render a <picture>), how a DAM VIDEO asset reference renders is
 * not evidenced anywhere in this codebase - there is no other video-asset
 * field to check it against. `firstAssetUrl()` is deliberately defensive
 * (tries <img>, <source>, then <a>) rather than assuming one shape. Flagged
 * for re-check once this block has been authored with a real video asset.
 */
function readAssetPairCell(cell) {
  const urls = [...(cell?.children ?? [])].map(firstAssetUrl).filter(Boolean);
  return { desktop: urls[0] || '', mobile: urls[1] || '' };
}

/** Reads the shared `fallback_` cell (image + reference, video and vimeo slides). */
function readFallbackCell(cell) {
  const picture = cell?.querySelector('picture') || null;
  const alt = cellValues(cell).find((t) => !isBool(t)) || '';
  return { picture, alt };
}

/** Reads a cell of only booleans, in declared field order (mute, then play/pause). */
function readControlsCell(cell) {
  const bools = cellValues(cell).filter(isBool);
  return { mute: bools[0] === 'true', playPause: bools[1] === 'true' };
}

function readYoutubeCell(cell) {
  const texts = cellValues(cell).slice(1); // drop the kind marker
  const unmute = texts.some((t) => t === 'true');
  const path = texts.find((t) => !isBool(t)) || '';
  return { path, unmute };
}

/**
 * Reads the vimeo_kind / vimeo_desktop / vimeo_mobile cell via `cellSlots()`,
 * not `cellValues()` - a mobile-only video (desktop id left blank) is a
 * plausible authoring choice, and `cellValues()`'s dropped blank would have
 * read the mobile id into the desktop slot instead. Flagged in
 * docs/wrs-migration-notes.md "## 6. Pre-authoring audit" as the most likely
 * of this codebase's positional-shift risks to actually bite; this is the
 * fix for it.
 */
function readVimeoIdsCell(cell) {
  const texts = cellSlots(cell).slice(1); // drop the kind marker
  return { desktop: texts[0] || '', mobile: texts[1] || '' };
}

function readPlaybackCell(cell) {
  const values = cellValues(cell).map((v) => v.toLowerCase());
  return { behavior: values.includes('popup') ? 'popup' : 'inline', autoloop: values.includes('true') };
}

/**
 * Countdown timer - `timer-countdown.js` is referenced by the source HTL but
 * is NOT in the export bundle (see this file's top docblock). This is a
 * minimal reconstruction from the markup alone:
 *   <ul><li><span class="days"></span>Days</li>...</ul>
 * and the two data attributes the HTL sets (`data-time-end`, matched here to
 * `countdown_timer`; `data-url-redirect`, matched to `countdown_redirectLink`).
 *
 * ASSUMPTION, stated plainly because it could not be verified: `countdown_gmt`
 * is read and carried in the model but NOT used here to compute the target
 * time. AEM Cloud's datepicker (`type="datetime"`) serialises with its own
 * UTC offset already, so `new Date(timer)` resolves to the correct absolute
 * instant without needing a separate zone; `gmt`'s only other plausible use
 * (redundant author-facing "this countdown is in GMT+8" documentation) has
 * no field in this markup to render it into. If the real
 * `timer-countdown.js` combined the two differently, this needs revisiting
 * once that script - or authored, published output to test against - is
 * available.
 */
function initCountdown(el, timer, redirectHref, isEditMode) {
  const target = Date.parse(timer);
  if (Number.isNaN(target)) return;

  const days = el.querySelector('.days');
  const hours = el.querySelector('.hours');
  const minutes = el.querySelector('.minutes');
  const seconds = el.querySelector('.seconds');

  let timerId;
  const tick = () => {
    const diff = target - Date.now();
    if (diff <= 0) {
      if (days) days.textContent = '0';
      if (hours) hours.textContent = '0';
      if (minutes) minutes.textContent = '0';
      if (seconds) seconds.textContent = '0';
      clearInterval(timerId);
      // Matches the source's own edit-mode guard (`data-mode="publish"` only
      // outside wcmmode.edit/preview) - do not redirect an author out of the
      // page they are editing.
      if (!isEditMode && redirectHref) window.location.href = redirectHref;
      return;
    }
    if (days) days.textContent = String(Math.floor(diff / 86400000));
    if (hours) hours.textContent = String(Math.floor((diff % 86400000) / 3600000));
    if (minutes) minutes.textContent = String(Math.floor((diff % 3600000) / 60000));
    if (seconds) seconds.textContent = String(Math.floor((diff % 60000) / 1000));
  };

  tick();
  timerId = setInterval(tick, 1000);
}

/** Builds the shared mute/play controller markup and wires it. See top docblock. */
function buildControls({ mute, playPause }, onMute, onPlayPause) {
  if (!mute && !playPause) return null;

  const wrapper = document.createElement('div');
  wrapper.className = `${PREFIX}-controller md-masthead__controller`;
  const inner = document.createElement('div');
  inner.className = `${PREFIX}-controller-wrapper md-masthead__controller-wrapper`;
  wrapper.append(inner);

  if (mute) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${PREFIX}-volume-button md-masthead__volume-button`;
    btn.setAttribute('aria-label', 'Mute or unmute video');
    const up = document.createElement('i');
    up.className = 'md-icon fas fa-volume-up hidden';
    const off = document.createElement('i');
    off.className = 'md-icon fas fa-volume-mute';
    btn.append(up, off);
    btn.addEventListener('click', () => {
      const muted = onMute();
      up.classList.toggle('hidden', muted);
      off.classList.toggle('hidden', !muted);
    });
    inner.append(btn);
  }

  if (playPause) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${PREFIX}-play-button md-masthead__play-button`;
    btn.setAttribute('aria-label', 'Play or pause video');
    const play = document.createElement('i');
    play.className = 'md-icon fas fa-play hidden';
    const pause = document.createElement('i');
    pause.className = 'md-icon fas fa-pause';
    btn.append(play, pause);
    btn.addEventListener('click', () => {
      const paused = onPlayPause();
      play.classList.toggle('hidden', !paused);
      pause.classList.toggle('hidden', paused);
    });
    inner.append(btn);
  }

  return wrapper;
}

function buildMobileFallback(picture, alt) {
  if (!picture) return null;
  const img = picture.querySelector('img');
  if (img) img.alt = alt;
  const wrap = document.createElement('div');
  wrap.className = `${PREFIX}-fallback mobile-fallback-img`;
  wrap.append(picture);
  return wrap;
}

function renderImageSlide(row, fetchPriority) {
  const [imageCell, contentCell, ctaCell, countdownCell] = [...row.children];
  const image = readImageCell(imageCell);
  const content = readContentCell(contentCell);
  const cta = readCta(ctaCell);
  const countdown = readCountdownCell(countdownCell);

  const slide = document.createElement('div');
  slide.className = `${PREFIX}-slide banner__content-item`;
  moveInstrumentation(row, slide);

  const media = document.createElement('picture');
  media.className = `${PREFIX}-media cover-picture`;
  if (content.gradient) media.classList.add(`${PREFIX}-gradient-${content.gradient}`);
  [image.desktop, image.mobile].forEach((picture, i) => {
    if (!picture) return;
    const img = picture.querySelector('img');
    if (img) {
      img.alt = image.alt;
      if (fetchPriority) img.setAttribute('fetchpriority', fetchPriority);
    }
    picture.classList.add(i === 0 ? `${PREFIX}-media-desktop` : `${PREFIX}-media-mobile`);
    media.append(picture);
  });
  slide.append(media);

  const hasContent = content.header || content.subHeader || cta || countdown.enabled;
  if (hasContent) {
    const panel = document.createElement('div');
    panel.className = `${PREFIX}-content banner__content__text ${content.alignment}`;
    if (content.gradient === 'ontext') panel.classList.add(`${PREFIX}-text-gradient`);
    if (content.bottomSpacing) {
      panel.classList.add(`${PREFIX}-align-end`);
      panel.style.bottom = `${content.bottomSpacing}%`;
    }

    if (content.header) {
      const h1 = document.createElement('h1');
      h1.textContent = content.header;
      panel.append(h1);
    }

    if (countdown.enabled && countdown.timer) {
      const wrap = document.createElement('div');
      wrap.className = 'countdown-wrapper';
      wrap.innerHTML = '<ul>'
        + '<li><span class="days"></span>Days</li>'
        + '<li><span class="hours"></span>Hours</li>'
        + '<li><span class="minutes"></span>Mins</li>'
        + '<li><span class="seconds"></span>Secs</li>'
        + '</ul>';
      panel.append(wrap);
      if (countdown.description) {
        const desc = document.createElement('span');
        desc.className = 'countdown-description';
        desc.textContent = countdown.description;
        panel.append(desc);
      }
      // Deferred so it never blocks the slide's own render.
      requestAnimationFrame(() => {
        initCountdown(wrap, countdown.timer, countdown.redirectHref, panel.closest('[data-aue-resource]') !== null);
      });
    }

    if (content.subHeader) {
      const span = document.createElement('span');
      span.textContent = content.subHeader;
      panel.append(span);
    }

    if (cta?.href && cta?.text) {
      const a = document.createElement('a');
      a.className = 'md-button-big';
      a.href = cta.href;
      a.textContent = cta.text;
      panel.append(a);
    } else if (cta?.text) {
      const span = document.createElement('span');
      span.className = 'md-button-big';
      span.textContent = cta.text;
      panel.append(span);
    }

    slide.append(panel);
  }

  return slide;
}

function pickResponsiveSrc({ desktop, mobile }) {
  return window.innerWidth >= DESKTOP ? (desktop || mobile) : (mobile || desktop);
}

function renderVideoSlide(row) {
  const [videoCell, fallbackCell, controlsCell] = [...row.children];
  const video = readAssetPairCell(videoCell);
  const fallback = readFallbackCell(fallbackCell);
  const controls = readControlsCell(controlsCell);

  const slide = document.createElement('div');
  slide.className = `${PREFIX}-slide banner__content-item`;
  if (!video.mobile && fallback.picture) slide.classList.add('no-mobile-src');
  moveInstrumentation(row, slide);

  const wrap = document.createElement('div');
  wrap.className = `${PREFIX}-media cover-picture`;

  const showVideo = window.innerWidth >= DESKTOP || video.mobile || !fallback.picture;
  if (showVideo && (video.desktop || video.mobile)) {
    const videoWrap = document.createElement('div');
    videoWrap.className = 'video-wrapper';
    const videoEl = document.createElement('video');
    videoEl.className = 'video-banner arrows-on-playing';
    videoEl.loop = true;
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    const source = document.createElement('source');
    source.type = 'video/mp4';
    source.src = pickResponsiveSrc(video);
    videoEl.append(source);
    videoWrap.append(videoEl);
    wrap.append(videoWrap);

    const controlsEl = buildControls(
      controls,
      () => { videoEl.muted = !videoEl.muted; return videoEl.muted; },
      () => {
        if (videoEl.paused) { videoEl.play(); return false; }
        videoEl.pause();
        return true;
      },
    );
    if (controlsEl) wrap.append(controlsEl);
  } else {
    const img = buildMobileFallback(fallback.picture, fallback.alt);
    if (img) wrap.append(img);
  }

  slide.append(wrap);
  return slide;
}

/**
 * Loads a heavy iframe only once the slide is on (or near) screen.
 *
 * Falls back to loading immediately where IntersectionObserver is
 * unavailable (jsdom's test environment; ancient browsers) - a missing
 * masthead video is a worse failure than an eager one.
 */
function lazyLoadIframe(iframe, src) {
  if (typeof IntersectionObserver === 'undefined') {
    iframe.src = src;
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    iframe.src = src;
  });
  observer.observe(iframe);
}

function renderYoutubeSlide(row) {
  const [youtubeCell] = [...row.children];
  const youtube = readYoutubeCell(youtubeCell);

  const slide = document.createElement('div');
  slide.className = `${PREFIX}-slide banner__content-item`;
  moveInstrumentation(row, slide);

  const wrap = document.createElement('div');
  wrap.className = `${PREFIX}-media cover-picture`;
  const inner = document.createElement('div');
  inner.className = 'youtube-wrapper';
  const iframe = document.createElement('iframe');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('title', 'Masthead video');
  inner.append(iframe);
  wrap.append(inner);

  if (youtube.path) {
    lazyLoadIframe(iframe, `${youtube.path}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&loop=1&controls=0`);
  }

  if (youtube.unmute) {
    const controller = document.createElement('div');
    controller.className = 'controller-wrapper sound-controller';
    const volOn = document.createElement('div');
    volOn.className = 'volume-up-button hidden';
    volOn.innerHTML = '<span class="fa fa-volume-up"></span>';
    const volOff = document.createElement('div');
    volOff.className = 'volume-off-button';
    volOff.innerHTML = '<span class="fa fa-volume-off"></span>';
    controller.append(volOn, volOff);
    let muted = true;
    controller.addEventListener('click', () => {
      muted = !muted;
      // Documented YouTube iframe postMessage API - no iframe_api script load
      // required, matching this block's lazy-loading intent for the iframe
      // itself.
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }),
        '*',
      );
      volOn.classList.toggle('hidden', muted);
      volOff.classList.toggle('hidden', !muted);
    });
    wrap.append(controller);
  }

  slide.append(wrap);
  return slide;
}

function renderVimeoSlide(row) {
  const [vimeoCell, fallbackCell, playbackCell, controlsCell] = [...row.children];
  const vimeo = readVimeoIdsCell(vimeoCell);
  const fallback = readFallbackCell(fallbackCell);
  const playback = readPlaybackCell(playbackCell);
  const controls = readControlsCell(controlsCell);

  const slide = document.createElement('div');
  slide.className = `${PREFIX}-slide banner__content-item`;
  if (!vimeo.mobile && fallback.picture) slide.classList.add('no-mobile-src');
  moveInstrumentation(row, slide);

  const wrap = document.createElement('div');
  wrap.className = `${PREFIX}-media cover-picture lazyload image-loaded`;
  const inner = document.createElement('div');
  inner.className = 'vimeo-wrapper';

  const id = pickResponsiveSrc(vimeo);
  const iframe = document.createElement('iframe');
  iframe.className = window.innerWidth >= DESKTOP ? 'vimeo-video vimeo-desktop' : 'vimeo-video vimeo-mobile';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'autoplay; fullscreen');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('title', 'Masthead video');
  inner.append(iframe);
  wrap.append(inner);

  if (id) {
    // "popup" playback behavior's modal is shared, page-level markup
    // (#vimeoModal in the source) wired by a script not in this bundle -
    // not built. Falls back to the same inline embed "inline" uses -
    // flagged in this file's top docblock, not invented.
    const loop = playback.autoloop ? 1 : 0;
    const src = playback.behavior === 'inline'
      ? `https://player.vimeo.com/video/${id}?autoplay=1&loop=${loop}&muted=1&background=1&title=0&byline=0&portrait=0&controls=0&playsinline=1&autopause=0`
      : `https://player.vimeo.com/video/${id}?autoplay=1&loop=0&muted=0&background=1&title=0&byline=0&portrait=0&controls=0&playsinline=1`;
    lazyLoadIframe(iframe, src);
  } else {
    const img = buildMobileFallback(fallback.picture, fallback.alt);
    if (img) wrap.append(img);
  }

  const controlsEl = buildControls(
    controls,
    () => {
      // Vimeo's documented postMessage protocol - no Player SDK script load.
      const next = !iframe.dataset.muted || iframe.dataset.muted === 'false';
      iframe.dataset.muted = String(next);
      iframe.contentWindow?.postMessage(JSON.stringify({ method: 'setMuted', value: next }), '*');
      return next;
    },
    () => {
      const wasPlaying = iframe.dataset.playing !== 'false';
      iframe.dataset.playing = String(!wasPlaying);
      iframe.contentWindow?.postMessage(
        JSON.stringify({ method: wasPlaying ? 'pause' : 'play' }),
        '*',
      );
      return wasPlaying;
    },
  );
  if (controlsEl) wrap.append(controlsEl);

  slide.append(wrap);
  return slide;
}

const RENDERERS = {
  image: renderImageSlide,
  video: renderVideoSlide,
  youtube: renderYoutubeSlide,
  vimeo: renderVimeoSlide,
};

/**
 * Cross-fades between slides, replacing Slick's `fade:true` carousel
 * (`masthead-carousel.js`) with a plain class toggle + CSS transition -
 * no jQuery/Slick dependency, matching every other carousel ported in this
 * run (see `buildDots()` in rb-helpers.js and its callers).
 */
function initCarousel(root, slideEls, autoplay, speed) {
  if (slideEls.length < 2) {
    slideEls.forEach((el) => el.classList.add('is-active'));
    return;
  }

  let current = 0;
  let timerId;

  const show = (index) => {
    current = ((index % slideEls.length) + slideEls.length) % slideEls.length;
    slideEls.forEach((el, i) => {
      el.classList.toggle('is-active', i === current);
      el.setAttribute('aria-hidden', i === current ? 'false' : 'true');
    });
  };

  const stop = () => clearInterval(timerId);
  const start = () => {
    stop();
    if (autoplay) timerId = setInterval(() => show(current + 1), speed);
  };

  const nav = document.createElement('div');
  nav.className = `${PREFIX}-arrow banner__carousel-arrow`;
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'btn btn-pre-zoo slick-arrow';
  prev.setAttribute('aria-label', 'Previous slide');
  prev.addEventListener('click', () => { show(current - 1); start(); });
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'btn btn-next-zoo slick-arrow';
  next.setAttribute('aria-label', 'Next slide');
  next.addEventListener('click', () => { show(current + 1); start(); });
  nav.append(prev, next);
  root.after(nav);

  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);

  show(0);
  start();
}

export default function decorate(block) {
  const isEditMode = block.hasAttribute('data-aue-resource');
  const { parentRows, childRows } = splitRows(block, PARENT_CELLS);
  const [scalingRow, autoplayRow, speedRow] = parentRows;

  const viewportScaling = cellText(scalingRow) || '100';
  const isAutoplay = cellValues(autoplayRow).some((v) => v.toLowerCase() === 'true');
  const speed = parseInt(cellText(speedRow), 10) || 5000;

  const rows = childRows
    .map((row) => ({ row, kind: rowKind(row) }))
    .filter(({ kind }) => kind);

  // Ports MandaiMastheadCarouselModel's fetchPriority pass exactly: the
  // first image slide with its own fetchPriority checkbox on gets "high";
  // every slide of ANY kind authored after it gets "low"; everything before
  // it gets no attribute at all. Only the image renderer ever applies the
  // computed value (fetchpriority has nowhere to attach on the other three
  // kinds' markup, same as the source, which only sets it on the <img>).
  let highSeen = false;
  const priorities = rows.map(({ row, kind }) => {
    if (!highSeen && kind === 'image') {
      const [imageCell] = [...row.children];
      if (readImageCell(imageCell).fetchPriority) { highSeen = true; return 'high'; }
    }
    return highSeen ? 'low' : '';
  });

  if (!rows.length) {
    renderEmpty(block, 'WRS Masthead Carousel — add at least one slide');
    return;
  }

  const SCALE_CLASSES = { 75: `${PREFIX}-scale-75`, 0: `${PREFIX}-scale-off` };
  const scaleClass = SCALE_CLASSES[viewportScaling] || `${PREFIX}-scale-100`;

  const wrapper = document.createElement('div');
  wrapper.className = `${PREFIX}-wrapper banner__carousel-wrapper ${scaleClass}`;

  const track = document.createElement('div');
  track.className = `${PREFIX}-track banner__carousel banner__content`;

  const slideEls = rows.map(({ row, kind }, i) => {
    const renderer = RENDERERS[kind];
    const slideEl = renderer(row, priorities[i]);
    track.append(slideEl);
    return slideEl;
  });

  wrapper.append(track);
  block.replaceChildren(wrapper);

  initCarousel(track, slideEls, isAutoplay, speed);

  if (isEditMode) {
    // Keep every slide visible for editing, matching this repo's house
    // style of not hiding authored content behind interaction in the
    // editor (see wrs-accordion-tabs, wrs-feature-carousel).
    slideEls.forEach((el) => { el.classList.add('is-active'); el.removeAttribute('aria-hidden'); });
  }
}
