// Procedural "photos" (no real pictures), and a small develop pipeline that edits them for real.
"use strict";

const Photos = (() => {
  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }

  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const lerpC = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

  function sky(ctx, w, h, stops, horizon) {
    const g = ctx.createLinearGradient(0, 0, 0, h * horizon);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), rgb(c)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  function glow(ctx, x, y, r, c, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgb(c, a)); g.addColorStop(0.35, rgb(c, a * 0.35)); g.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }

  // A ridge line from summed sines (seeded), filled down to the bottom with a vertical gradient.
  function ridge(ctx, w, h, base, amp, freq, seed, top, bottom, opts = {}) {
    const r = rng(seed), ph = [r() * 6, r() * 6, r() * 6], f = [freq, freq * 2.3, freq * 5.1];
    const y = (x) => h * (base - amp * (0.55 * Math.sin(x * f[0] + ph[0]) + 0.3 * Math.sin(x * f[1] + ph[1]) + 0.15 * Math.sin(x * f[2] + ph[2])));
    ctx.beginPath(); ctx.moveTo(0, h);
    let minY = h;
    for (let i = 0; i <= 120; i++) {
      const x = i / 120, yy = y(x) + (opts.jag ? (r() - 0.5) * h * opts.jag : 0);
      minY = Math.min(minY, yy); ctx.lineTo(x * w, yy);
    }
    ctx.lineTo(w, h); ctx.closePath();
    const g = ctx.createLinearGradient(0, minY, 0, h * Math.min(1, base + 0.25));
    g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bottom));
    ctx.fillStyle = g; ctx.fill();
    return y;
  }

  function mist(ctx, w, h, y, height, c, a) {
    const g = ctx.createLinearGradient(0, y - height, 0, y + height);
    g.addColorStop(0, rgb(c, 0)); g.addColorStop(0.5, rgb(c, a)); g.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, y - height, w, 2 * height);
  }

  function clouds(ctx, w, h, seed, n, c, a, band) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = h * (band[0] + r() * (band[1] - band[0])), rw = w * (0.12 + r() * 0.22), rh = h * (0.015 + r() * 0.03);
      ctx.save(); ctx.translate(x, y); ctx.scale(1, rh / rw);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rw);
      g.addColorStop(0, rgb(c, a)); g.addColorStop(1, rgb(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rw, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }

  function reflect(ctx, w, h, horizon, tint, a) {
    // Mirror the sky above the horizon into the water, darkened and rippled.
    const hy = Math.round(h * horizon);
    const band = Math.min(hy, h - hy);
    for (let y = 0; y < band; y += 2) {
      const off = Math.sin(y * 0.35) * (1 + y * 0.02);
      ctx.globalAlpha = 0.75 - 0.5 * (y / band);
      ctx.drawImage(ctx.canvas, 0, hy - y - 2, w, 2, off - 8, hy + y, w + 16, 2);
    }
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, hy, 0, h);
    g.addColorStop(0, rgb(tint, a * 0.4)); g.addColorStop(1, rgb(tint, a));
    ctx.fillStyle = g; ctx.fillRect(0, hy, w, h - hy);
  }

  function grain(ctx, w, h, seed, amount) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data, r = rng(seed);
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * amount;
      d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  }

  function vignette(ctx, w, h, a) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  const scenes = {
    dunes(ctx, w, h) {
      sky(ctx, w, h, [[96, 120, 168], [214, 158, 128], [252, 196, 132]], 0.62);
      glow(ctx, w * 0.72, h * 0.5, h * 0.7, [255, 214, 150], 0.7);
      ctx.fillStyle = rgb([255, 236, 200]); ctx.beginPath(); ctx.arc(w * 0.72, h * 0.5, h * 0.045, 0, Math.PI * 2); ctx.fill();
      ridge(ctx, w, h, 0.62, 0.06, 3, 11, [214, 140, 92], [176, 98, 66]);
      ridge(ctx, w, h, 0.74, 0.09, 2.2, 12, [232, 150, 92], [150, 78, 52]);
      const y = ridge(ctx, w, h, 0.86, 0.1, 1.6, 13, [244, 168, 104], [120, 60, 40]);
      ctx.strokeStyle = "rgba(255,230,190,.35)"; ctx.lineWidth = Math.max(1, w / 600); ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const x = i / 120; ctx.lineTo(x * w, y(x)); } ctx.stroke();
    },
    lake(ctx, w, h) {
      sky(ctx, w, h, [[40, 70, 120], [120, 150, 190], [236, 200, 186]], 0.55);
      clouds(ctx, w, h, 21, 7, [255, 220, 214], 0.45, [0.12, 0.35]);
      ridge(ctx, w, h, 0.5, 0.16, 2.4, 22, [92, 108, 150], [60, 72, 104], { jag: 0.004 });
      ridge(ctx, w, h, 0.56, 0.08, 3.4, 23, [46, 64, 78], [30, 44, 52]);
      reflect(ctx, w, h, 0.58, [20, 40, 60], 0.5);
      mist(ctx, w, h, h * 0.58, h * 0.03, [230, 220, 230], 0.35);
    },
    coast(ctx, w, h) {
      sky(ctx, w, h, [[60, 46, 96], [206, 96, 104], [255, 170, 110]], 0.56);
      clouds(ctx, w, h, 31, 9, [255, 160, 140], 0.5, [0.1, 0.42]);
      glow(ctx, w * 0.38, h * 0.55, h * 0.6, [255, 190, 120], 0.8);
      ctx.fillStyle = rgb([255, 228, 180]); ctx.beginPath(); ctx.arc(w * 0.38, h * 0.555, h * 0.05, Math.PI, 0); ctx.fill();
      ctx.fillStyle = rgb([70, 40, 70]); ctx.fillRect(0, h * 0.555, w, h);
      reflect(ctx, w, h, 0.555, [40, 24, 48], 0.35);
      // The sun's path on the water: glints that widen toward the shore.
      const r = rng(34);
      for (let i = 0; i < 70; i++) {
        const t = r(), y = h * (0.57 + 0.43 * t * t), spread = w * (0.02 + 0.16 * t), x = w * 0.38 + (r() - 0.5) * 2 * spread;
        ctx.strokeStyle = `rgba(255,${200 + 40 * r() | 0},150,${0.25 + 0.45 * (1 - t)})`; ctx.lineWidth = 1 + t * 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * (0.01 + r() * 0.04) * (1 + t), y); ctx.stroke();
      }
      // A dark headland on the left, and the near shore.
      ctx.fillStyle = rgb([30, 18, 30]); ctx.beginPath(); ctx.moveTo(0, h * 0.62); ctx.lineTo(0, h * 0.5);
      ctx.bezierCurveTo(w * 0.05, h * 0.49, w * 0.09, h * 0.52, w * 0.13, h * 0.545);
      ctx.quadraticCurveTo(w * 0.16, h * 0.556, w * 0.19, h * 0.556);
      ctx.lineTo(w * 0.19, h * 0.562); ctx.quadraticCurveTo(w * 0.1, h * 0.585, 0, h * 0.62); ctx.fill();
      const sand = ctx.createLinearGradient(0, h * 0.88, 0, h);
      sand.addColorStop(0, rgb([60, 34, 44], 0)); sand.addColorStop(0.3, rgb([60, 34, 44])); sand.addColorStop(1, rgb([34, 20, 26]));
      ctx.fillStyle = sand; ctx.fillRect(0, h * 0.88, w, h * 0.12);
    },
    forest(ctx, w, h) {
      sky(ctx, w, h, [[176, 196, 196], [214, 220, 210], [232, 230, 214]], 0.5);
      const layers = [[0.42, [150, 172, 168]], [0.52, [110, 138, 130]], [0.64, [70, 96, 86]], [0.8, [34, 54, 46]]];
      layers.forEach(([b, c], i) => {
        ridge(ctx, w, h, b, 0.05, 3 + i, 41 + i, c, lerpC(c, [10, 20, 16], 0.4), { jag: 0.012 + i * 0.004 });
        mist(ctx, w, h, h * (b + 0.05), h * 0.06, [226, 230, 222], 0.55 - i * 0.1);
      });
      const r = rng(45); ctx.fillStyle = rgb([22, 36, 30]);
      for (let i = 0; i < 40; i++) {
        const x = r() * w, base = h * (0.88 + r() * 0.14), th = h * (0.16 + r() * 0.2), tw = th * 0.28;
        ctx.beginPath(); ctx.moveTo(x, base - th); ctx.lineTo(x - tw / 2, base); ctx.lineTo(x + tw / 2, base); ctx.closePath(); ctx.fill();
      }
    },
    city(ctx, w, h) {
      sky(ctx, w, h, [[12, 16, 40], [36, 34, 84], [120, 64, 110]], 0.7);
      glow(ctx, w * 0.5, h * 0.75, h * 0.8, [255, 140, 90], 0.35);
      const r = rng(51);
      let x = 0;
      while (x < w) {
        const bw = w * (0.03 + r() * 0.06), bh = h * (0.18 + r() * 0.42);
        ctx.fillStyle = rgb(lerpC([16, 16, 30], [30, 26, 50], r()));
        ctx.fillRect(x, h - bh, bw, bh);
        for (let wy = h - bh + 6; wy < h - 4; wy += 7) for (let wx = x + 3; wx < x + bw - 3; wx += 6) {
          if (r() < 0.32) { ctx.fillStyle = r() < 0.7 ? "rgba(255,210,140,.85)" : "rgba(170,210,255,.8)"; ctx.fillRect(wx, wy, 2.5, 3); }
        }
        x += bw + w * 0.004;
      }
      for (let i = 0; i < 22; i++) glow(ctx, r() * w, h * (0.6 + r() * 0.4), h * (0.03 + r() * 0.06), r() < 0.5 ? [255, 170, 90] : [120, 180, 255], 0.5);
    },
    field(ctx, w, h) {
      sky(ctx, w, h, [[90, 140, 210], [150, 186, 230], [226, 230, 236]], 0.55);
      clouds(ctx, w, h, 61, 10, [255, 255, 255], 0.75, [0.08, 0.4]);
      ridge(ctx, w, h, 0.55, 0.04, 2, 62, [120, 150, 110], [96, 120, 90]);
      const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
      g.addColorStop(0, rgb([150, 110, 190])); g.addColorStop(1, rgb([96, 56, 140]));
      ctx.fillStyle = g; ctx.fillRect(0, h * 0.6, w, h * 0.4);
      const r = rng(63);
      for (let row = 0; row < 26; row++) {
        const t = row / 25, y = h * (0.6 + 0.4 * t * t), lw = 1 + t * 5;
        ctx.strokeStyle = rgb(lerpC([190, 160, 230], [120, 70, 170], r()), 0.55); ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + (r() - 0.5) * 4); ctx.stroke();
      }
      // A lone tree: trunk, then a canopy of overlapping crowns lit from the upper right.
      const tx = w * 0.78, ty = h * 0.56, s = h * 0.075;
      ctx.fillStyle = rgb([46, 40, 34]); ctx.fillRect(tx - s * 0.07, ty - s * 0.9, s * 0.14, s * 0.95);
      [[0, -1.25, 0.62], [-0.45, -1.0, 0.48], [0.45, -1.05, 0.5], [-0.2, -1.6, 0.45], [0.25, -1.55, 0.42], [0, -0.85, 0.42]].forEach(([dx, dy, r], i) => {
        const cx = tx + dx * s, cy = ty + dy * s, g2 = ctx.createRadialGradient(cx + r * s * 0.35, cy - r * s * 0.4, r * s * 0.1, cx, cy, r * s);
        g2.addColorStop(0, rgb([104, 128, 72])); g2.addColorStop(1, rgb([40, 60, 34]));
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = "rgba(30,40,24,.35)"; ctx.beginPath(); ctx.ellipse(tx - s * 0.2, ty + s * 0.05, s * 0.8, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    },
    hills(ctx, w, h) {
      sky(ctx, w, h, [[34, 26, 72], [122, 52, 96], [232, 128, 76]], 0.64);
      glow(ctx, w * 0.63, h * 0.6, h * 0.7, [255, 190, 110], 0.6);
      ctx.fillStyle = rgb([255, 242, 212]); ctx.beginPath(); ctx.arc(w * 0.63, h * 0.58, h * 0.07, 0, Math.PI * 2); ctx.fill();
      ridge(ctx, w, h, 0.66, 0.04, 7, 71, [120, 60, 92], [100, 44, 80]);
      mist(ctx, w, h, h * 0.68, h * 0.04, [236, 150, 124], 0.3);
      ridge(ctx, w, h, 0.76, 0.05, 4.3, 72, [70, 36, 66], [54, 27, 56]);
      ridge(ctx, w, h, 0.86, 0.06, 3, 73, [30, 16, 34], [22, 13, 28]);
    },
    snow(ctx, w, h) {
      sky(ctx, w, h, [[60, 100, 170], [140, 176, 220], [214, 226, 240]], 0.5);
      ridge(ctx, w, h, 0.48, 0.2, 2, 81, [240, 244, 250], [150, 170, 200], { jag: 0.01 });
      ridge(ctx, w, h, 0.62, 0.12, 2.8, 82, [210, 220, 236], [120, 140, 170], { jag: 0.008 });
      mist(ctx, w, h, h * 0.7, h * 0.05, [255, 255, 255], 0.5);
      ridge(ctx, w, h, 0.84, 0.07, 3.6, 83, [40, 56, 70], [24, 34, 44], { jag: 0.02 });
    },
    canyon(ctx, w, h) {
      sky(ctx, w, h, [[70, 120, 190], [170, 190, 210], [240, 210, 170]], 0.4);
      ridge(ctx, w, h, 0.44, 0.08, 2.6, 91, [196, 110, 70], [150, 70, 46], { jag: 0.006 });
      ridge(ctx, w, h, 0.6, 0.1, 3.4, 92, [170, 84, 52], [110, 50, 34], { jag: 0.006 });
      ridge(ctx, w, h, 0.8, 0.12, 1.8, 93, [120, 56, 38], [60, 28, 22]);
      const g = ctx.createLinearGradient(0, h * 0.86, 0, h);
      g.addColorStop(0, "rgba(90,140,160,.0)"); g.addColorStop(1, "rgba(90,140,160,.5)"); ctx.fillStyle = g; ctx.fillRect(0, h * 0.86, w, h);
    },
  };
  const kinds = Object.keys(scenes);
  const cache = new Map();

  /** A painted photo as a canvas (cached). */
  function paint(kind, w = 900, h = 600) {
    const key = `${kind}:${w}x${h}`;
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    scenes[kind](ctx, w, h);
    vignette(ctx, w, h, 0.18);
    grain(ctx, w, h, kind.length * 977 + w, 9);
    cache.set(key, c);
    return c;
  }

  /** A copy drawn into a new canvas of the given size. */
  function copy(src, w, h) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const s = Math.max(w / src.width, h / src.height), sw = w / s, sh = h / s;
    ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h);
    return c;
  }

  // ---------- Develop: the app's ideas in miniature (linear light, scene curve for bitmaps) ----------
  const toLin = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const v = i / 255; toLin[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  const OUT = 4096, toSRGB = new Uint8ClampedArray(OUT + 1);
  for (let i = 0; i <= OUT; i++) { const v = i / OUT; toSRGB[i] = Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); }
  // SceneControls.bitmapToScene / sceneToBitmap: identity to 0.36, rational shoulder above.
  const toScene = (n) => n <= 0.36 ? n : n <= 0.98 ? 0.36 + 0.64 * (n - 0.36) / (1 - n) : 20.2 * n / 0.98;
  const toDisplay = (x) => { if (x <= 0.36) return x; const u = x - 0.36; return x <= 20.2 ? 0.36 + 0.64 * u / (u + 0.64) : 0.98 * x / 20.2; };

  const vigCache = new Map();
  function vigMap(w, h) {
    const key = w + "x" + h;
    if (vigCache.has(key)) return vigCache.get(key);
    const m = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = (x - w / 2) / (w / 2), py = (y - h / 2) / (h / 2);
      const t = clamp((Math.hypot(px, py) / Math.SQRT2 - 0.35) / 0.65, 0, 1);
      m[y * w + x] = t * t * t * (t * (t * 6 - 15) + 10);
    }
    vigCache.set(key, m);
    return m;
  }

  /**
   * Develops `src` (ImageData) into `dst` (ImageData of the same size).
   * a: { exposure, contrast, highlights, shadows, white, black, temperature, tint, saturation, vibrance, vignette }
   * Optional mask: { x, y, r, exposure } in 0…1 frame units (a radial local adjustment).
   */
  function develop(src, dst, a, mask) {
    const s = src.data, d = dst.data, w = src.width, h = src.height;
    const gain = Math.pow(2, a.exposure || 0);
    const t = (a.temperature || 0) / 100, ti = (a.tint || 0) / 100;
    const wr = 1 + 0.32 * t, wb = 1 - 0.32 * t, wg = 1 - 0.18 * ti;
    const sh = (a.shadows || 0) / 100, hi = (a.highlights || 0) / 100;
    const k = Math.pow(2, (a.contrast || 0) / 100 * ((a.contrast || 0) > 0 ? 0.75 : 0.6));
    const wh = (a.white || 0) / 100, bl = (a.black || 0) / 100;
    const sat = 1 + (a.saturation || 0) / 100, vib = (a.vibrance || 0) / 100;
    const vig = a.vignette ? vigMap(w, h) : null, va = (a.vignette || 0) / 100;
    const grey = Math.log2(0.18);
    const shEV = sh > 1 ? 3.3 + 1.4 * (sh - 1) : sh * (sh > 0 ? 3.3 : 1.5);
    for (let y = 0, i = 0; y < h; y++) {
      for (let x = 0; x < w; x++, i += 4) {
        let r = toLin[s[i]] * wr * gain, g = toLin[s[i + 1]] * wg * gain, b = toLin[s[i + 2]] * wb * gain;
        // Into scene light (on the RGB norm, chromaticity kept).
        let n = Math.sqrt(r * r + g * g + b * b) * 0.57735027;
        if (n > 1e-6) {
          const x0 = toScene(n), q = x0 / n; r *= q; g *= q; b *= q; n = x0;
          let dd = Math.log2(n) - grey;
          let ev = (1 - smooth(-7, 0, dd)) * shEV + smooth(0, 4, dd) * hi * (hi < 0 ? 1.75 : 0.8);
          if (mask) {
            const mx = x / w - mask.x, my = (y / h - mask.y) * (h / w), dist = Math.sqrt(mx * mx + my * my);
            ev += mask.exposure * (1 - smooth(mask.r * 0.55, mask.r, dist));
          }
          dd += ev;
          if (k !== 1) { const u = clamp(dd / 1.6, -9, 9), e2 = Math.exp(2 * u); dd = dd + (k - 1) * 1.6 * (e2 - 1) / (e2 + 1); }
          dd += wh * (wh > 0 ? 1.25 : 1) * smooth(0.5, 2.5, dd) + bl * (bl > 0 ? 1.5 : 2.5) * (1 - smooth(-6, -3, dd));
          const nn = 0.18 * Math.pow(2, dd);
          const out = toDisplay(nn) / n;
          r *= out; g *= out; b *= out;
        }
        if (sat !== 1 || vib) {
          const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const c = Math.max(r, g, b) - Math.min(r, g, b);
          const f = Math.max(0, sat + vib * (1 - Math.min(c / Math.max(L, 1e-4) * 0.6, 1)));
          r = L + (r - L) * f; g = L + (g - L) * f; b = L + (b - L) * f;
        }
        if (vig) { const m = Math.pow(2, 2 * va * vig[y * w + x]); r *= m; g *= m; b *= m; }
        d[i] = toSRGB[(clamp(r, 0, 1) * OUT) | 0]; d[i + 1] = toSRGB[(clamp(g, 0, 1) * OUT) | 0]; d[i + 2] = toSRGB[(clamp(b, 0, 1) * OUT) | 0]; d[i + 3] = 255;
      }
    }
  }

  /** A develop target bound to a visible canvas: call render(adjustments) as often as needed. */
  function developer(srcCanvas, out) {
    out.width = srcCanvas.width; out.height = srcCanvas.height;
    const sctx = srcCanvas.getContext("2d", { willReadFrequently: true });
    const src = sctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const octx = out.getContext("2d");
    const dst = octx.createImageData(src.width, src.height);
    let pending = null, scheduled = false;
    function flush() { scheduled = false; if (!pending) return; develop(src, dst, pending.a, pending.mask); octx.putImageData(dst, 0, 0); pending = null; }
    return {
      render(a, mask, now = false) { pending = { a, mask }; if (now) flush(); else if (!scheduled) { scheduled = true; requestAnimationFrame(flush); } },
      original() { octx.putImageData(src, 0, 0); },
      canvas: out,
    };
  }

  /** Luminance histogram into `canvas` (three channels, additive, like the app's). */
  function histogram(srcCanvas, canvas) {
    const w = 120, h = Math.round(120 * srcCanvas.height / srcCanvas.width);
    const tmp = copy(srcCanvas, w, h), data = tmp.getContext("2d").getImageData(0, 0, w, h).data;
    const bins = [new Float32Array(64), new Float32Array(64), new Float32Array(64)];
    for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) bins[c][data[i + c] >> 2]++;
    const W = canvas.width = canvas.clientWidth * 2 || 400, H = canvas.height = canvas.clientHeight * 2 || 116;
    const ctx = canvas.getContext("2d"); ctx.clearRect(0, 0, W, H);
    const max = Math.max(...bins.map((b) => Math.max(...b))) || 1;
    const cols = ["rgba(255,80,80,.55)", "rgba(80,220,110,.5)", "rgba(90,140,255,.55)"];
    ctx.globalCompositeOperation = "lighter";
    bins.forEach((b, c) => {
      ctx.fillStyle = cols[c]; ctx.beginPath(); ctx.moveTo(0, H);
      for (let i = 0; i < 64; i++) ctx.lineTo((i / 63) * W, H - Math.pow(b[i] / max, 0.7) * H * 0.95);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
  }

  // ---------- The export's print: white border and a film camera's date imprint ----------
  const SEG = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg" };
  // The app's DateStamp geometry exactly: cell, bar shapes, spacing, dot and slant (y up, lean forward).
  function digits(ctx, text, x, y, h) {
    const w = h * 0.52, t = h * 0.13, gap = h * 0.17, dotW = h * 0.24, slant = 0.12, half = t / 2, inset = t * 0.18;
    const poly = (pts) => { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill(); };
    const horizontal = (ox, yy) => { const l = ox + inset + half, r = ox + w - inset - half; poly([[l - half, yy], [l, yy + half], [r, yy + half], [r + half, yy], [r, yy - half], [l, yy - half]]); };
    const vertical = (xx, from, to) => { const bt = from + inset + half, tp = to - inset - half; poly([[xx, bt - half], [xx + half, bt], [xx + half, tp], [xx, tp + half], [xx - half, tp], [xx - half, bt]]); };
    ctx.save(); ctx.fillStyle = "rgba(247,160,38,0.95)";
    ctx.translate(x, y + h); ctx.scale(1, -1); ctx.transform(1, 0, slant, 1, 0, 0);
    let cx = 0;
    for (const ch of text) {
      if (ch === ".") { ctx.fillRect(cx + (dotW - t) / 2 - gap * 0.3, 0, t, t); cx += dotW; continue; }
      const on = SEG[ch] || "", o = ch === "1" ? cx - (w - t) / 2 : cx;  // a 1 sits centred in its cell
      const L = o + half, R = o + w - half, B = half, M = h / 2, T = h - half;
      if (on.includes("a")) horizontal(o, T); if (on.includes("g")) horizontal(o, M); if (on.includes("d")) horizontal(o, B);
      if (ch === "1") vertical(R, B, T);  // one unbroken stroke, as the app draws it
      else {
        if (on.includes("f")) vertical(L, M, T); if (on.includes("b")) vertical(R, M, T);
        if (on.includes("e")) vertical(L, B, M); if (on.includes("c")) vertical(R, B, M);
      }
      cx += w + gap;
    }
    ctx.restore();
    return cx - gap + slant * h;
  }

  /** The exported file: `photo` (canvas) with an optional white border (fraction of the long edge) and date. */
  function print(photo, { border = 0.04, date = "21.10.26", width = 360, dateSize = 0.05 } = {}) {
    const ar = photo.height / photo.width, pw = width, ph = Math.round(width * ar);
    const m = Math.round(Math.max(pw, ph) * border);
    const c = document.createElement("canvas"); c.width = pw + 2 * m; c.height = ph + 2 * m;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fbfaf7"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(photo, m, m, pw, ph);
    if (date) {
      const hgt = Math.min(pw, ph) * dateSize, inset = Math.min(pw, ph) * 0.05;
      // Measure, then place bottom right.
      const probe = document.createElement("canvas").getContext("2d");
      const tw = digits(probe, date, 0, 0, hgt);
      digits(ctx, date, m + pw - inset - tw, m + ph - inset - hgt, hgt);
    }
    return c;
  }

  return { kinds, paint, copy, develop, developer, histogram, print, rng };
})();
