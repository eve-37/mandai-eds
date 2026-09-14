import { moveInstrumentation } from '../../scripts/scripts.js';
import { cellText, renderEmpty } from '../../scripts/rb-helpers.js';

/** The source's own breakpoint for "big enough to autoplay video". */
const DESKTOP = 992;

/**
 * Loads the Brightcove player script once, however many mastheads a page has.
 */
const playerScripts = new Map();
function loadPlayer(accountId, playerId) {
  const src = `https://players.brightcove.net/${accountId}/${playerId || 'default'}_default/index.min.js`;
  if (!playerScripts.has(src)) {
    playerScripts.set(src, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    }));
  }
  return playerScripts.get(src);
}

/**
 * Swaps the poster for the real player.
 *
 * Deliberately lazy. A masthead is the LCP element, and the Brightcove player
 * is a few hundred KB of third-party JavaScript - loading it up front is the
 * single easiest way to lose the performance the migration is for. The poster
 * renders immediately and is the LCP image; the player replaces it once the
 * block is on screen and the browser is idle.
 *
 * Mobile never loads it at all: the source only autoplays above 992px, so below
 * that the poster IS the design rather than a placeholder for it.
 */
function upgradeToVideo(media, { accountId, videoId, playerId }) {
  if (!videoId || window.innerWidth <= DESKTOP) return;

  const start = () => {
    loadPlayer(accountId, playerId).then(() => {
      const video = document.createElement('video-js');
      video.setAttribute('data-account', accountId);
      video.setAttribute('data-video-id', videoId);
      if (playerId) video.setAttribute('data-player', playerId);
      video.setAttribute('data-embed', 'default');
      // Muted is not decoration - autoplay is blocked without it.
      video.setAttribute('muted', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('loop', '');
      video.setAttribute('playsinline', '');
      video.classList.add('masthead-video');
      media.append(video);
      media.classList.add('has-video');
      if (window.bc) window.bc(video);
    }).catch(() => {
      // Leave the poster in place. A masthead with no video still reads fine;
      // a broken player does not.
    });
  };

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 2000 });
    else setTimeout(start, 0);
  });
  observer.observe(media);
}

export default function decorate(block) {
  const rows = [...block.children];

  let posterRow = null;
  let video = null;
  const texts = [];

  rows.forEach((row) => {
    if (row.querySelector('picture, img')) { posterRow = row; return; }

    // The grouped video_ cell: account, id and player as separate children.
    const parts = [...row.querySelectorAll('p, div')]
      .map((el) => el.textContent.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      const [accountId, videoId, playerId] = parts;
      video = { accountId, videoId, playerId };
      return;
    }

    const text = cellText(row);
    if (text) texts.push({ row, text });
  });

  const [title, desc] = texts;

  if (!title && !posterRow && !video?.videoId) {
    renderEmpty(block, 'Masthead — add a title and a video');
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'masthead-wrapper';

  const media = document.createElement('div');
  media.className = 'masthead-media';
  const picture = posterRow?.querySelector('picture');
  if (picture) {
    media.append(picture);
    moveInstrumentation(posterRow, media);
  }

  const content = document.createElement('div');
  content.className = 'masthead-content';
  if (title) {
    const h1 = document.createElement('h1');
    h1.textContent = title.text;
    moveInstrumentation(title.row, h1);
    content.append(h1);
  }
  if (desc) {
    const p = document.createElement('p');
    p.textContent = desc.text;
    content.append(p);
  }

  wrapper.append(media, content);

  // Scroll-down affordance. A button, not a bare div as the source had it, so
  // it is reachable by keyboard and announced.
  const arrow = document.createElement('button');
  arrow.type = 'button';
  arrow.className = 'masthead-arrow';
  arrow.setAttribute('aria-label', 'Scroll to content');
  arrow.addEventListener('click', () => {
    window.scrollTo({ top: block.clientHeight - 80, left: 0, behavior: 'smooth' });
  });
  wrapper.append(arrow);

  block.replaceChildren(wrapper);

  if (video?.videoId) upgradeToVideo(media, video);
}
