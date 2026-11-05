// Small motion vocabulary shared by every reel.

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
/** progress of t across [a, b], clamped to 0..1 */
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const smoothstep = (a, b, x) => { const t = span(x, a, b); return t * t * (3 - 2 * t); };
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
/** frame-rate independent approach toward a target */
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));
/** a soft single pulse over 0..1 */
export const bell = (p) => (p <= 0 || p >= 1 ? 0 : Math.sin(p * Math.PI) ** 2);
/** progress of a pinned section through its extra scroll room */
export function pinProgress(section) {
  const r = section.getBoundingClientRect();
  const room = section.offsetHeight - window.innerHeight;
  return room > 4 ? clamp(-r.top / room) : 0;
}
