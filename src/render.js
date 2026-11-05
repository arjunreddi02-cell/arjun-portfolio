// Pours content/site.json into the template. Every list grows with its data
// and every optional section stays hidden while it is empty, so adding a
// project, a photo or a review never needs a code change.

const $ = (id) => document.getElementById(id);
const has = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '');
const list = (v) => (Array.isArray(v) ? v.filter(has) : []);
/** media paths are relative, whatever the editor wrote, so the site works on any host or sub-folder */
export const src = (p) => (has(p) ? String(p).replace(/^\/+/, '') : '');

/** tiny element builder: h('a', {href, class}, child, 'text', ...) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style') el.setAttribute('style', v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k);
  return el;
}

const waLink = (c, msg) => `https://wa.me/${String(c.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
const telLink = (c) => `tel:${String(c.phone).replace(/[^\d+]/g, '')}`;

export function render(data) {
  const p = data.profile || {};
  const c = data.contact || {};
  const reel = data.showreel || {};
  const projects = list(data.projects);
  const photos = list(data.photos).filter((x) => has(x.image));
  const press = list(data.press).filter((x) => has(x.quote));
  const name = p.name || 'Arjun';
  const roles = list(p.roles).join(' & ');
  const hello = `Hi ${name}, I saw your portfolio and would like to talk about a role.`;

  document.title = `${name}, ${roles || 'Actor'}`;
  document.querySelectorAll('[data-bind="name"]').forEach((e) => { e.textContent = name; });

  // ---- opening -----------------------------------------------------------
  const hero = $('hero-img');
  hero.src = src(p.heroImage || (photos[0] && photos[0].image));
  hero.alt = p.heroImageAlt || `${name}, portrait`;
  const nameEl = $('name');
  nameEl.setAttribute('aria-label', name);
  nameEl.style.setProperty('--len', Math.max(4, name.length));
  nameEl.replaceChildren(...[...name.toUpperCase()].map((ch) => h('span', { 'aria-hidden': 'true' }, ch === ' ' ? ' ' : ch)));
  $('hero-roles').textContent = roles;
  $('hero-tag').textContent = p.tagline || '';
  $('hero-tag').hidden = !has(p.tagline);

  const ctas = [];
  if (has(reel.url)) ctas.push(h('a', { class: 'btn btn--lamp', href: '#reel' }, h('span', { 'aria-hidden': 'true' }, '▶ '), 'Watch the reel'));
  if (has(c.whatsapp)) ctas.push(h('a', { class: 'btn', href: waLink(c, hello), target: '_blank', rel: 'noopener' }, 'WhatsApp'));
  else if (has(c.email)) ctas.push(h('a', { class: 'btn', href: `mailto:${c.email}` }, 'Email'));
  if (has(p.profilePdf)) ctas.push(h('a', { class: 'btn btn--quiet', href: src(p.profilePdf), target: '_blank', rel: 'noopener', 'data-pdf': '' }, 'Profile (PDF)'));
  $('hero-ctas').replaceChildren(...ctas);

  const proof = [];
  if (has(p.height)) proof.push(p.height);
  if (has(p.screenAge)) proof.push(`Screen age ${p.screenAge}`);
  if (list(p.languages).length) proof.push(`${list(p.languages).length} languages`);
  if (list(p.skills).length) proof.push(list(p.skills).slice(0, 2).join(' & '));
  list(p.honours).slice(0, 1).forEach((x) => proof.push(x));
  $('proof').replaceChildren(...proof.map((x) => h('li', {}, x)));

  // ---- showreel ----------------------------------------------------------
  if (has(reel.url)) {
    $('reel').hidden = false;
    $('reel-title').textContent = reel.title || 'Showreel';
    $('reel-note').textContent = reel.note || '';
    $('reel-poster').src = src(reel.poster || p.heroImage);
    $('reel-poster').alt = '';
    $('reel-link').href = reel.url;
  } else {
    document.querySelectorAll('[data-needs="reel"]').forEach((e) => { e.hidden = true; });
  }

  // ---- both sides of the camera -----------------------------------------
  const front = projects.filter((x) => x.side !== 'behind' && x.status !== 'Upcoming');
  const behind = projects.filter((x) => x.side === 'behind' && x.status !== 'Upcoming');
  $('wall-front').replaceChildren(...front.map(card));
  $('wall-behind').replaceChildren(...behind.map(card));
  document.querySelector('[data-count="front"]').textContent = String(front.length);
  document.querySelector('[data-count="behind"]').textContent = String(behind.length);
  if (!behind.length) document.getElementById('sides').classList.add('is-one');

  const upcoming = projects.filter((x) => x.status === 'Upcoming');
  if (upcoming.length) {
    $('coming').hidden = false;
    $('coming-list').replaceChildren(...upcoming.map(card));
  }

  // ---- title cards -------------------------------------------------------
  const lines = list(p.summary);
  $('story-cards').replaceChildren(...lines.map((t, i) => h('figure', { class: `title-card${i === 0 ? ' is-on' : ''}` },
    h('p', { class: `title-card__text${i === 0 && t.length < 60 ? ' title-card__text--salute' : ''}` }, t),
    i === lines.length - 1 ? h('p', { class: 'title-card__sign' }, name) : null)));
  $('story-total').textContent = String(lines.length);
  $('story').style.setProperty('--pin-h', `${Math.max(1, lines.length) * 75 + 60}svh`);
  if (!lines.length) $('story').hidden = true;

  // ---- screen test -------------------------------------------------------
  const cells = [
    ['Actor', name, true], ['Height', p.height], ['Screen age', p.screenAge], ['Hair', p.hair],
    ['Skin tone', p.skinTone], ['Build', p.build], ['Languages', list(p.languages).length || ''],
    ['Speaks', list(p.languages).join(' · '), true],
  ].filter(([, v]) => has(v));
  $('slate').replaceChildren(...cells.map(([k, v, wide], i) => h('div', { class: `slate__cell${wide ? ' slate__cell--wide' : ''}`, style: `--c:${i}` },
    h('dt', {}, k), h('dd', {}, String(v)))));
  const heads = photos.filter((x) => list(x.tags).some((t) => /headshot/i.test(t)));
  const stripPhotos = heads.length ? heads : photos.slice(0, 6);
  $('strip-track').replaceChildren(...stripPhotos.map((x, i) => h('figure', { class: 'strip__frame' },
    h('img', { src: src(x.image), alt: x.caption || `${name}, headshot ${i + 1}`, loading: 'lazy', decoding: 'async' }),
    h('figcaption', {}, String(i + 1)))));

  // ---- photos ------------------------------------------------------------
  const tagCount = new Map();
  photos.forEach((x) => list(x.tags).forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
  // a filter is only useful when it narrows to a group: tags on two or more photos, at most eight
  const tags = [...tagCount.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  $('filters').replaceChildren(
    h('button', { type: 'button', class: 'chip is-on', 'data-tag': '', 'aria-pressed': 'true' }, `All · ${photos.length}`),
    ...tags.map((t) => h('button', { type: 'button', class: 'chip', 'data-tag': t, 'aria-pressed': 'false' }, `${t} · ${tagCount.get(t)}`)),
  );
  $('filters').hidden = tags.length < 2;
  $('sheet').replaceChildren(...photos.map((x, i) => h('figure', { class: 'sheet__frame', tabindex: '0', 'data-tags': list(x.tags).join('|'), style: `--f:${i}` },
    h('span', { class: 'sheet__img' }, h('img', { src: src(x.image), alt: x.caption || `${name}, photo ${i + 1}`, loading: 'lazy', decoding: 'async' })),
    h('span', { class: 'sheet__ring', 'aria-hidden': 'true' }),
    has(x.caption) ? h('figcaption', {}, x.caption) : null)));
  if (!photos.length) $('photos').hidden = true;

  // ---- press -------------------------------------------------------------
  if (press.length) {
    $('press').hidden = false;
    $('press-list').replaceChildren(...press.map((x) => h('figure', { class: 'quote' },
      h('blockquote', {}, x.quote),
      h('figcaption', {}, has(x.link) ? h('a', { href: x.link, target: '_blank', rel: 'noopener' }, x.source || 'Source') : (x.source || '')))));
  }

  // ---- credits -----------------------------------------------------------
  $('credits-title').textContent = name;
  $('credits-role').textContent = roles;
  const groups = [];
  if (list(p.languages).length) groups.push(['Languages', list(p.languages).map((x) => [x])]);
  if (list(p.skills).length) groups.push(['Special skills', list(p.skills).map((x) => [x])]);
  if (list(p.honours).length) groups.push(['Honours', list(p.honours).map((x) => [x])]);
  const byRole = new Map();
  projects.filter((x) => x.status !== 'Upcoming' && !/^(him|her|them)self$/i.test(x.role || '')).forEach((x) => {
    const r = x.role || (x.side === 'behind' ? 'Crew' : 'Cast');
    if (!byRole.has(r)) byRole.set(r, []);
    byRole.get(r).push([x.title, [list(x.languages).join(', '), x.place, x.year].filter(has).join(' · ')]);
  });
  byRole.forEach((v, k) => groups.push([k, v]));
  const scr = [p.height, has(p.screenAge) ? `Screen age ${p.screenAge}` : '', p.hair && `${p.hair} hair`, p.skinTone, p.build].filter(has);
  if (scr.length) groups.push(['Screen profile', [[scr.join(' · ')]]]);
  $('credits-list').replaceChildren(...groups.map(([dt, dds]) => h('div', {},
    h('dt', {}, dt), ...dds.map(([main, sub]) => h('dd', {}, main, has(sub) ? h('span', {}, sub) : null)))));

  // ---- contact -----------------------------------------------------------
  const cc = [];
  if (has(c.whatsapp)) cc.push(h('a', { class: 'btn btn--lamp', href: waLink(c, hello), target: '_blank', rel: 'noopener' }, 'Message on WhatsApp'));
  if (has(p.profilePdf)) cc.push(h('a', { class: 'btn', href: src(p.profilePdf), target: '_blank', rel: 'noopener', 'data-pdf': '' }, 'Download profile (PDF)'));
  $('contact-ctas').replaceChildren(...cc);
  const rows = [];
  if (has(c.email)) rows.push(['Email', c.email, `mailto:${c.email}`, c.email]);
  if (has(c.phone)) rows.push(['Phone', c.phone, telLink(c), String(c.phone).replace(/\s/g, '')]);
  $('contact-rows').replaceChildren(...rows.map(([k, v, href, copy]) => h('div', { class: 'contact__row' },
    h('span', { class: 'contact__label' }, k),
    h('a', { class: 'contact__value', href }, v),
    h('button', { class: 'contact__copy', type: 'button', 'data-copy': copy }, 'Copy'))));
  const socials = [['Instagram', c.instagram], ['YouTube', c.youtube], ['IMDb', c.imdb]].filter(([, v]) => has(v));
  $('contact-links').replaceChildren(...socials.map(([k, v]) => h('a', { href: v, target: '_blank', rel: 'noopener' }, k)));
  $('foot').textContent = `© ${new Date().getFullYear()} ${name} · ${list(p.languages).join(' · ')}`;

  const dock = [];
  if (has(c.whatsapp)) dock.push(h('a', { href: waLink(c, hello), target: '_blank', rel: 'noopener' }, 'WhatsApp'));
  if (has(c.phone)) dock.push(h('a', { href: telLink(c) }, 'Call'));
  if (has(c.email)) dock.push(h('a', { href: `mailto:${c.email}` }, 'Email'));
  $('dock').replaceChildren(...dock);

  return { reel, photos };
}

/** a lobby card for one project; posters are optional, the card designs itself without one */
function card(x, i) {
  const langs = list(x.languages).join(' · ');
  const meta = [x.type, langs, x.place, x.year].filter(has).join(' · ');
  const art = has(x.poster)
    ? h('span', { class: 'poster__art' }, h('img', { src: src(x.poster), alt: `${x.title} poster`, loading: 'lazy', decoding: 'async' }))
    : h('span', { class: `poster__art poster__art--type${x.side === 'behind' ? ' poster__art--velvet' : ''}`, 'aria-hidden': 'true' },
      h('span', { class: 'poster__kicker' }, x.type || (x.side === 'behind' ? 'Behind the camera' : 'Film')),
      h('span', { class: `poster__big${x.title.length > 12 ? ' poster__big--sm' : ''}` }, x.title),
      h('span', { class: 'poster__kicker' }, [x.place, x.year].filter(has).join(' · ')));
  const info = h('span', { class: 'poster__info' },
    h('span', { class: 'poster__head' },
      h('span', { class: 'poster__title' }, x.title),
      has(x.status) ? h('span', { class: `pill pill--${String(x.status).toLowerCase().replace(/\W+/g, '-')}` }, x.status) : null),
    has(meta) ? h('span', { class: 'poster__line' }, meta) : null,
    has(x.role) ? h('span', { class: 'poster__role' }, x.role) : null,
    list(x.notes).length ? h('span', { class: 'poster__notes' }, ...list(x.notes).map((n) => h('span', {}, n))) : null,
    list(x.tags).length ? h('span', { class: 'poster__tags' }, ...list(x.tags).map((t) => h('span', { class: 'tag' }, t))) : null,
    has(x.link) ? h('span', { class: 'poster__go' }, x.linkLabel || 'Watch', h('span', { 'aria-hidden': 'true' }, ' ↗')) : null);
  const inner = has(x.link)
    ? h('a', { class: 'poster__frame', href: x.link, target: '_blank', rel: 'noopener' }, art, info)
    : h('div', { class: 'poster__frame' }, art, info);
  return h('li', { class: 'poster', style: `--rank:${i}` }, inner);
}
