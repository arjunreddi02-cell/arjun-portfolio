// The film itself: one fixed canvas over the whole page that adds what a
// projected print has and a screen does not. Grain, lamp flicker, the odd
// vertical scratch and fleck of dust, a soft vignette, and a warm burn that
// flares across the frame when a new reel starts.
//
// It renders at 24 frames a second on purpose (film cadence, and a third of the
// GPU work), at reduced resolution so the grain has some body. The output is
// premultiplied: rgb adds light, alpha darkens what is underneath.

import { bell, clamp } from '../lib/ease.js';

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uFrame;
uniform float uGrain;
uniform float uFlicker;
uniform float uBurn;
uniform vec2 uBurnAt;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float f = uFrame;

  float g = hash(floor(gl_FragCoord.xy) + vec2(f * 13.17, f * 7.31)) - 0.5;

  vec2 c = uv - 0.5; c.x *= aspect;
  float vig = smoothstep(0.42, 1.12, length(c));

  float fl = max(0.0, hash(vec2(f, 1.7)) - 0.35) * 0.075 * uFlicker;

  // scratches persist for a few frames, wander a hair, and break up along y
  float s = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float seed = floor(f / (5.0 + fi * 3.0));
    float on = step(0.62, hash(vec2(seed, fi + 3.1)));
    float x = hash(vec2(seed, fi + 7.3)) + (hash(vec2(f, fi)) - 0.5) * 0.0015;
    float w = (0.8 + hash(vec2(seed, fi)) * 1.2) / uRes.x;
    float line = 1.0 - smoothstep(0.0, w, abs(uv.x - x));
    line *= step(0.25, hash(vec2(floor(uv.y * 5.0), seed)));
    s += line * on;
  }

  float dust = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float on = step(0.78, hash(vec2(f * 0.37, fi)));
    vec2 p = vec2(hash(vec2(f, fi * 3.1)), hash(vec2(fi * 1.3, f)));
    float r = (1.5 + hash(vec2(fi, f * 0.9)) * 4.0) / uRes.y;
    vec2 d = uv - p; d.x *= aspect;
    dust += on * (1.0 - smoothstep(r * 0.3, r, length(d)));
  }

  vec2 b = uv - uBurnAt; b.x *= aspect;
  float burn = uBurn * (1.0 - smoothstep(0.0, 0.95, length(b)));

  float dark = vig * 0.5 + fl + dust * 0.55 + max(-g, 0.0) * uGrain;
  vec3 light = vec3(1.0, 0.93, 0.8) * (max(g, 0.0) * uGrain + s * 0.16)
             + vec3(1.0, 0.62, 0.28) * burn * 0.9 + vec3(1.0) * burn * burn * 0.35;

  gl_FragColor = vec4(light, clamp(dark, 0.0, 0.85));
}`;

export class Film {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas;
    this.reduced = reduced;
    this.burnT0 = -10;
    this.burnAt = [0, 1];
    this.pulse = 0;
    this.lastFrame = -1;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
    this.gl = gl;
    if (!gl) { canvas.classList.add('is-flat'); return; }

    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ['uRes', 'uFrame', 'uGrain', 'uFlicker', 'uBurn', 'uBurnAt']) this.u[n] = gl.getUniformLocation(prog, n);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  get ok() { return !!this.gl; }

  resize() {
    if (!this.gl) return;
    // ~0.6 of CSS pixels: grain with body, and a lighter fill
    const s = 0.6;
    this.canvas.width = Math.max(2, Math.round(window.innerWidth * s));
    this.canvas.height = Math.max(2, Math.round(window.innerHeight * s));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.lastFrame = -1;
  }

  /** a warm flare across the frame, as at a reel change */
  burn(t) {
    this.burnT0 = t;
    const side = Math.random();
    this.burnAt = side < 0.5 ? [Math.random() < 0.5 ? -0.05 : 1.05, 0.2 + Math.random() * 0.6]
      : [0.15 + Math.random() * 0.7, Math.random() < 0.5 ? -0.05 : 1.05];
  }

  /** a stronger lamp flicker for a beat (title-card changes) */
  stutter(t) { this.pulseT0 = t; }

  render(t) {
    const gl = this.gl;
    if (!gl) return;
    const frame = this.reduced ? 1 : Math.floor(t * 24);
    if (frame === this.lastFrame) return;          // hold each frame for 1/24 s
    this.lastFrame = frame;
    const burn = this.reduced ? 0 : bell(clamp((t - this.burnT0) / 0.75)) * 0.55;
    const stutter = this.pulseT0 ? bell(clamp((t - this.pulseT0) / 0.5)) : 0;
    gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.uFrame, frame % 997);
    gl.uniform1f(this.u.uGrain, 0.16);
    gl.uniform1f(this.u.uFlicker, this.reduced ? 0 : 1 + stutter * 4);
    gl.uniform1f(this.u.uBurn, burn);
    gl.uniform2f(this.u.uBurnAt, this.burnAt[0], this.burnAt[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
