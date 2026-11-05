// Reel 1. One clock, overlapping beats:
//
//   0.00  black, then the leader: 3 2 1 with the sweep (first visit only)
//   1.45  two white frames as the leader runs out
//   1.55  the lamp: the projector beam opens over the house
//   1.65  the portrait develops out of overexposure
//   1.95  the name flickers on like marquee bulbs, centre out; buttons arrive
//   3.60  settled: dust keeps drifting in the beam
//
// Casting people decide fast, so the face, the reel button and WhatsApp are
// on screen within two seconds. A returning visitor starts at the lamp.

import { span, bell, clamp } from '../lib/ease.js';

const T = { count: 0.1, step: 0.45, n: 3, flash: 1.45, lamp: 1.55, develop: 1.65, title: 1.95, bar: 2.6, settled: 3.6 };

export function initOpening({ film, reduced }) {
  const sec = document.getElementById('top');
  const canvas = document.getElementById('leader');
  const skip = document.getElementById('skip');
  const root = document.documentElement;
  const ctx = canvas.getContext('2d');

  // centre-out bulb order, whatever the length of the name
  const letters = [...sec.querySelectorAll('.opening__name span')];
  const mid = (letters.length - 1) / 2;
  letters.map((s, i) => ({ s, d: Math.abs(i - mid) + i * 0.001 }))
    .sort((a, b) => a.d - b.d)
    .forEach(({ s }, k) => s.style.setProperty('--o', k));

  let seen = false;
  try { seen = sessionStorage.getItem('arjun-leader') === '1'; } catch { /* storage may be blocked */ }

  let t0 = performance.now() / 1000 - (reduced ? T.settled + 0.1 : seen ? T.lamp : 0);
  const fired = new Set();
  let w = 0, h = 0, dpr = 1;
  let visible = true;

  const motes = Array.from({ length: 70 }, () => ({
    a: Math.random(), r: Math.random(), s: 0.15 + Math.random() * 0.5,
    z: Math.random(), ph: Math.random() * 6.28,
  }));

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = sec.clientWidth; h = sec.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  size();
  window.addEventListener('resize', size);

  const cue = (name, fn) => { if (!fired.has(name)) { fired.add(name); fn(); } };

  function drawLeader(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.34;
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, Math.max(w, h) * 0.75);
    g.addColorStop(0, '#9b917f'); g.addColorStop(1, '#3e372d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    const k = clamp(Math.floor((t - T.count) / T.step), 0, T.n - 1);
    const frac = clamp(((t - T.count) % T.step) / T.step);
    // the sweep
    ctx.fillStyle = 'rgba(20, 16, 10, .32)';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, Math.hypot(w, h), -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.closePath(); ctx.fill();
    // crosshair and rings
    ctx.strokeStyle = 'rgba(25, 20, 14, .75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, Math.PI * 2); ctx.stroke();
    // the number
    ctx.fillStyle = '#17120c';
    ctx.font = `${Math.round(R * 1.15)}px Limelight, Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(T.n - k), cx, cy + R * 0.06);
    // the leader's own projector light: brighter centre, unsteady
    ctx.fillStyle = `rgba(255, 240, 210, ${0.05 + Math.random() * 0.05})`;
    ctx.fillRect(0, 0, w, h);
    // two white frames as it runs out
    const fl = bell(span(t, T.flash - 0.05, T.lamp + 0.05));
    if (fl > 0) { ctx.fillStyle = `rgba(255, 248, 232, ${fl})`; ctx.fillRect(0, 0, w, h); }
  }

  function drawDust(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const portrait = w < 820 || w / h < 0.8;
    const ox = -0.2 * w, oy = -0.1 * h;
    const a0 = (portrait ? 30 : 20) * Math.PI / 180, a1 = (portrait ? 70 : 52) * Math.PI / 180;
    const len = Math.hypot(w, h) * 1.1;
    const lamp = span(t, T.lamp, T.lamp + 1.4);
    for (const m of motes) {
      m.r += m.s * dt * 0.012;
      if (m.r > 1) { m.r = 0.05; m.a = Math.random(); }
      const ang = a0 + (a1 - a0) * (0.5 + (m.a - 0.5) * 0.85) + Math.sin(t * 0.3 + m.ph) * 0.01;
      const d = 0.15 * len + m.r * len * 0.85;
      const x = ox + Math.cos(ang) * d, y = oy + Math.sin(ang) * d;
      const core = 1 - Math.abs(m.a - 0.5) * 1.6;
      const tw = 0.55 + 0.45 * Math.sin(t * (1.2 + m.z) + m.ph);
      ctx.fillStyle = `rgba(255, 226, 170, ${(0.14 + 0.4 * m.z) * core * tw * lamp})`;
      ctx.beginPath(); ctx.arc(x, y, 0.6 + m.z * 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function jumpToLamp() {
    const now = performance.now() / 1000;
    if (now - t0 < T.lamp) t0 = now - T.lamp;
  }
  skip.addEventListener('click', jumpToLamp);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') jumpToLamp(); });
  window.addEventListener('wheel', () => { if (sec.classList.contains('is-leader')) jumpToLamp(); }, { passive: true });
  window.addEventListener('touchmove', () => { if (sec.classList.contains('is-leader')) jumpToLamp(); }, { passive: true });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(sec);

  sec.classList.add('is-leader');

  let last = performance.now() / 1000;
  return {
    update(now) {
      const t = now - t0;
      const dt = Math.min(0.05, now - last); last = now;

      if (t < T.lamp) drawLeader(t);
      if (t >= T.lamp) cue('lamp', () => {
        sec.classList.remove('is-leader');
        sec.classList.add('is-lamp', 'is-dust');
        try { sessionStorage.setItem('arjun-leader', '1'); } catch { /* fine */ }
        if (!reduced) film.burn(now);
      });
      if (t >= T.develop) cue('develop', () => sec.classList.add('is-develop'));
      if (t >= T.title) cue('title', () => sec.classList.add('is-title'));
      if (t >= T.bar) cue('bar', () => root.classList.remove('is-opening'));
      if (t >= T.settled) cue('settled', () => sec.classList.add('is-settled'));

      if (t >= T.lamp && visible && !reduced) drawDust(t, dt);
      if (reduced && t >= T.lamp && !fired.has('still')) { fired.add('still'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    },
  };
}
