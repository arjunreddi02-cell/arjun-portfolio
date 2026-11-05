// The projection booth. Loads the content, pours it into the template, then
// runs the one frame loop every reel samples. Reels off screen do no work.
// Rule kept throughout: everything is readable at rest; classes added here only
// play the approach to a frame that already exists.

import { Film } from './fx/film.js';
import { initOpening } from './scenes/opening.js';
import { render } from './render.js';
import { pinProgress, damp, clamp } from './lib/ease.js';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const now = () => performance.now() / 1000;

async function boot() {
  let data;
  try {
    const res = await fetch('content/site.json', { cache: 'no-cache' });
    data = await res.json();
  } catch (e) {
    root.classList.remove('is-opening');
    document.querySelector('main').insertAdjacentHTML('afterbegin',
      '<p class="noscript">The portfolio content could not be loaded. Please refresh the page.</p>');
    console.error('content/site.json failed to load or parse', e);
    return;
  }
  const { reel } = render(data);
  await hidePdfIfMissing();

  const film = new Film(document.getElementById('film'), { reduced });
  const opening = initOpening({ film, reduced });
  wireReel(reel);
  wireSides();
  wireFilters();
  wireCopy();
  wireDock();
  wireNav();

  // ---- first sight of a section plays its entrance + a reel-change burn --
  document.querySelectorAll('#photos .sheet__frame').forEach((el, i) => el.style.setProperty('--f', Math.min(i, 8)));
  const seenIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-seen');
      film.burn(now());
      seenIO.unobserve(e.target);
    }
  }, { threshold: 0.15 });
  document.querySelectorAll('main > section:not([hidden]):not(#top)').forEach((s) => seenIO.observe(s));

  // ---- pinned reels -------------------------------------------------------
  const onScreen = new Set();
  const pinIO = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? onScreen.add(e.target.id) : onScreen.delete(e.target.id);
  }, { threshold: 0 });
  ['story', 'screen-test', 'credits'].forEach((id) => pinIO.observe(document.getElementById(id)));

  const story = document.getElementById('story');
  const cards = [...story.querySelectorAll('.title-card')];
  const storyN = document.getElementById('story-n');
  let cardOn = 0;
  function updateStory() {
    if (cards.length < 2) return;
    const p = pinProgress(story);
    const i = Math.min(cards.length - 1, Math.floor(p * cards.length * 0.999 + 0.0001));
    if (i === cardOn) return;
    cards[cardOn].classList.remove('is-on');
    cards[i].classList.add('is-on');
    cardOn = i;
    storyN.textContent = String(i + 1);
    film.stutter(now());
  }

  const test = document.getElementById('screen-test');
  const strip = document.getElementById('strip');
  const track = document.getElementById('strip-track');
  const frames = [...track.children];
  let stripP = 0;
  function updateStrip(dt) {
    const target = pinProgress(test);
    stripP = reduced ? target : damp(stripP, target, 9, dt);
    const travel = Math.max(0, track.scrollWidth - strip.clientWidth);
    const x = -stripP * travel;
    track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    const mid = strip.clientWidth / 2 - x;
    let best = 0, bd = Infinity;
    frames.forEach((f, i) => {
      const d = Math.abs(f.offsetLeft + f.offsetWidth / 2 - mid);
      if (d < bd) { bd = d; best = i; }
    });
    frames.forEach((f, i) => f.classList.toggle('is-gate', i === best));
  }

  const credits = document.getElementById('credits');
  const roll = document.getElementById('roll');
  const theEnd = roll.querySelector('.credits__end');
  let rollP = 0;
  function updateCredits(dt) {
    const target = pinProgress(credits);
    rollP = reduced ? target : damp(rollP, target, 7, dt);
    const vh = window.innerHeight;
    const start = vh * 0.55;
    const end = vh / 2 - (theEnd.offsetTop + theEnd.offsetHeight / 2);
    roll.style.transform = `translate3d(0, ${(start + (end - start) * rollP).toFixed(1)}px, 0)`;
  }
  // the roll needs room in proportion to its length
  credits.style.setProperty('--pin-h', `${Math.round(160 + roll.offsetHeight / window.innerHeight * 70)}svh`);

  const weave = [...document.querySelectorAll('.weave')];
  let weaveFrame = -1;
  function updateWeave(t) {
    if (reduced) return;
    const f = Math.floor(t * 24);
    if (f === weaveFrame) return;
    weaveFrame = f;
    const jump = Math.random() < 0.012 ? 2.5 : 0;
    const x = (Math.random() - 0.5) * 0.7;
    const y = (Math.random() - 0.5) * 0.9 + jump;
    for (const el of weave) el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  }

  let last = now();
  function frame() {
    const t = now();
    const dt = clamp(t - last, 0, 0.05); last = t;
    opening.update(t);
    film.render(t);
    updateWeave(t);
    if (onScreen.has('story')) updateStory();
    if (onScreen.has('screen-test')) updateStrip(dt);
    if (onScreen.has('credits')) updateCredits(dt);
    requestAnimationFrame(frame);
  }
  updateStrip(1); updateCredits(1);
  window.addEventListener('resize', () => { updateStrip(1); updateCredits(1); });
  requestAnimationFrame(frame);
}

// ---- showreel: plays in place on the real site; opens a tab where embedding is not allowed
function wireReel(reel) {
  const btn = document.getElementById('reel-play');
  if (!btn || !reel.url) return;
  btn.addEventListener('click', () => {
    const embed = embedUrl(reel.url);
    const framed = window.self !== window.top;   // inside a preview frame, other sites cannot be embedded
    if (!embed || framed) { window.open(reel.url, '_blank', 'noopener'); return; }
    const frame = document.getElementById('reel-frame');
    frame.replaceChildren(Object.assign(document.createElement('iframe'), {
      src: embed, title: reel.title || 'Showreel', allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
      allowFullscreen: true, referrerPolicy: 'strict-origin-when-cross-origin',
    }));
  });
}
function embedUrl(u) {
  let m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0`;
  m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  m = u.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}?autoplay=1`;
  return '';
}

// ---- in front / behind: a switch on phones, a split screen on desktop ----------
function wireSides() {
  const sides = document.getElementById('sides');
  const tabs = [...document.querySelectorAll('.sides__switch [data-side]')];
  const pick = (side) => {
    sides.dataset.show = side;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.side === side)));
  };
  tabs.forEach((t) => t.addEventListener('click', () => pick(t.dataset.side)));
  // on desktop, leaning toward a side widens it
  ['front', 'behind'].forEach((side) => {
    document.getElementById(`side-${side}`).addEventListener('pointerenter', () => { sides.dataset.lean = side; });
  });
  sides.addEventListener('pointerleave', () => { delete sides.dataset.lean; });
}

// ---- photo filters --------------------------------------------------------------
function wireFilters() {
  const bar = document.getElementById('filters');
  const frames = [...document.querySelectorAll('#sheet .sheet__frame')];
  bar.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-tag]');
    if (!chip) return;
    bar.querySelectorAll('.chip').forEach((c) => { c.classList.toggle('is-on', c === chip); c.setAttribute('aria-pressed', String(c === chip)); });
    const tag = chip.dataset.tag;
    frames.forEach((f) => { f.hidden = !!tag && !f.dataset.tags.split('|').includes(tag); });
  });
}

function wireCopy() {
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const label = btn.textContent;
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Copied';
      } catch {
        const r = document.createRange(); r.selectNodeContents(btn.previousElementSibling);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        btn.textContent = 'Selected';
      }
      setTimeout(() => { btn.textContent = label; }, 1800);
    });
  });
}

// the phone dock appears once the opening has scrolled away, and steps aside at the contact section
function wireDock() {
  const hero = document.getElementById('top');
  const contact = document.getElementById('contact');
  let past = false, atContact = false;
  const set = () => root.classList.toggle('is-docked', past && !atContact);
  new IntersectionObserver(([e]) => { past = !e.isIntersecting; set(); }, { threshold: 0.15 }).observe(hero);
  new IntersectionObserver(([e]) => { atContact = e.isIntersecting; set(); }, { threshold: 0.1 }).observe(contact);
}

function wireNav() {
  const links = new Map([...document.querySelectorAll('.bar__nav a')].map((a) => [a.getAttribute('href').slice(1), a]));
  const alias = { credits: 'contact', story: 'work', coming: 'work', press: 'photos' };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.classList.remove('is-here'));
      links.get(alias[e.target.id] || e.target.id)?.classList.add('is-here');
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main > section').forEach((s) => io.observe(s));
}

// the downloadable profile is optional: if the file is not there, its buttons go
async function hidePdfIfMissing() {
  const btns = [...document.querySelectorAll('[data-pdf]')];
  if (!btns.length) return;
  try {
    const r = await fetch(btns[0].getAttribute('href'), { method: 'HEAD' });
    if (r.ok) return;
  } catch { /* fall through */ }
  btns.forEach((b) => b.remove());
}

boot();
