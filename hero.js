// The hero is the app's own opening (LaunchIntro.swift): night turns to sunrise, the sun rises,
// glides to the centre and becomes the icon. Once it settles the hiker keeps walking and the
// hills turn through spring, summer, autumn and winter, then back to the sunrise.
"use strict";

const Hero = (() => {
  const zones = [[22, 18, 36], [50, 28, 62], [104, 40, 76], [176, 66, 70], [236, 124, 68], [255, 190, 110], [255, 242, 212]];
  const ink = [9, 8, 17], moonlight = [206, 214, 238];
  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
  const progress = (t, from, over) => clamp((t - from) / over, 0, 1);
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const smooth = (x) => x * x * (3 - 2 * x);
  const easeInOut = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const mix = (a, b, t) => typeof a === "number" ? a + (b - a) * t : a.map((v, i) => mix(v, b[i], t));
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const lead = 1.2;

  // ---------- Palettes ----------
  const night = { sky: [[6, 8, 24], [12, 15, 40], [22, 24, 58], [36, 34, 76], [52, 44, 90]], hills: [[32, 32, 66], [18, 19, 44], [8, 8, 19]],
    crest: [150, 110, 150], mist: [70, 72, 120], rim: moonlight, cloudLit: [46, 50, 92], cloudShade: [30, 34, 70] };
  // fire: the campfire; blossom: a flowering tree in its place; heat: the summer sun's glare; river: a summer stream;
  // ground: fallen leaves on the hills; lift: how much the dim over the settled scene lifts.
  const season = (o) => Object.assign({ glow: 1, grass: 0, flowers: 0, leaves: 0, snow: 0, grassCol: [60, 40, 50], snowCap: 0,
    fire: 1, blossom: 0, heat: 0, river: 0, ground: 0, lift: 0 }, o);
  // The first is the opening's sunrise, exactly: the loop starts and ends on it without a seam.
  const SEASONS = [
    season({ sky: [[34, 26, 72], [70, 36, 92], [122, 52, 96], [186, 84, 84], [232, 128, 76]], hills: [[100, 44, 80], [54, 27, 56], [22, 13, 28]],
      crest: [240, 150, 110], mist: [236, 150, 124], rim: zones[5], cloudLit: [255, 168, 116], cloudShade: [108, 52, 98] }),
    season({ sky: [[78, 128, 196], [112, 160, 214], [150, 190, 228], [190, 215, 234], [222, 234, 230]], hills: [[120, 160, 124], [84, 138, 78], [44, 96, 46]],
      crest: [214, 238, 186], mist: [232, 242, 230], rim: [236, 246, 222], cloudLit: [255, 255, 255], cloudShade: [204, 216, 232],
      glow: 0.3, grass: 1, flowers: 1, grassCol: [104, 168, 70], fire: 0, blossom: 1, lift: 0.5 }),
    season({ sky: [[36, 100, 190], [64, 132, 208], [104, 162, 220], [160, 198, 228], [236, 222, 186]], hills: [[150, 164, 108], [122, 142, 64], [78, 102, 40]],
      crest: [244, 232, 172], mist: [242, 232, 204], rim: [255, 240, 200], cloudLit: [255, 255, 255], cloudShade: [210, 222, 238],
      glow: 0.35, grass: 1, flowers: 0.3, grassCol: [176, 168, 72], fire: 0, heat: 1, river: 1, lift: 0.55 }),
    season({ sky: [[62, 80, 130], [112, 112, 146], [176, 140, 128], [226, 166, 116], [240, 188, 138]], hills: [[168, 106, 76], [152, 74, 42], [90, 42, 28]],
      crest: [252, 192, 132], mist: [238, 192, 162], rim: [255, 204, 146], cloudLit: [255, 228, 204], cloudShade: [172, 142, 152],
      glow: 0.7, leaves: 1, ground: 1, grassCol: [156, 98, 46], lift: 0.45 }),
    season({ sky: [[64, 98, 156], [112, 146, 196], [166, 190, 222], [210, 224, 240], [240, 246, 252]], hills: [[212, 224, 242], [188, 204, 230], [164, 184, 216]],
      crest: [255, 255, 255], mist: [244, 248, 255], rim: [255, 255, 255], cloudLit: [246, 249, 255], cloudShade: [186, 198, 216],
      glow: 0.6, snow: 1, snowCap: 1, grassCol: [210, 218, 228], lift: 0.62 }),
  ];
  // Story seconds: the seasons begin right after the name settles; each holds, then dissolves into the next.
  const seasonStart = 4.4, holds = [1.5, 4, 4, 4, 4], change = 2;
  const cycle = holds.reduce((a, b) => a + b, 0) + change * holds.length;
  function seasonAt(sc) {
    let f = sc % cycle, i = 0;
    while (f > holds[i] + change) { f -= holds[i] + change; i++; }
    const k = smooth(clamp((f - holds[i]) / change, 0, 1)), a = SEASONS[i], b = SEASONS[(i + 1) % SEASONS.length];
    const out = {};
    for (const key of Object.keys(a)) out[key] = mix(a[key], b[key], k);
    return out;
  }

  function zone(i) {
    const p = i / 6, side = 824 - 574 * Math.pow(p, 0.8);
    return { side, radius: side * (0.225 + 0.275 * Math.pow(p, 1.4)), sink: 0.36 * (824 - side) * 0.5 };
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function seeded(n, seed) {
    let s = seed; const next = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return Array.from({ length: n }, () => [next(), next(), next(), next(), next()]);
  }
  const STARS = seeded(110, 0x5eed), BLADES = seeded(220, 77), FLOWERS = seeded(70, 91), LEAVES = seeded(46, 13), FLAKES = seeded(150, 29),
    BLOOMS = seeded(60, 53), PETALS = seeded(24, 61), RIPPLES = seeded(46, 71), SPARKS = seeded(90, 83);

  function start(canvas, onFormed) {
    const ctx = canvas.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let w = 0, h = 0, dpr = 1, raf = 0, formedSent = false, visible = true;

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    addEventListener("resize", resize); resize();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(canvas);

    const hill = (layer, x) => layer === 0 ? 0.665 + 0.025 * Math.sin(x * 7.1 + 0.6) + 0.018 * Math.sin(x * 13.3 + 2.1)
      : layer === 1 ? 0.745 + 0.035 * Math.sin(x * 4.3 + 2.4) + 0.012 * Math.sin(x * 11.7)
      : 0.83 - 0.07 * Math.exp(-Math.pow((x - 0.33) / 0.2, 2)) + 0.012 * Math.sin(x * 9.4 + 1.3);
    function hillPath(layer, dy) {
      ctx.beginPath(); ctx.moveTo(0, h);
      const pts = []; for (let i = 0; i <= 96; i++) { const x = i / 96; pts.push([x * w, hill(layer, x) * h + dy]); }
      ctx.lineTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], (pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2);
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.lineTo(w, h); ctx.closePath();
    }

    function frame(now) {
      raf = 0;
      // Reduce Motion: the settled sunrise, still.
      const t = reduce ? 12 : (now - t0) / 1000, story = t - lead;
      const appear = (s, o) => smooth(progress(t, s, o));
      const dawn = smooth(progress(story, 1.0, 1.7));
      const forming = progress(story, 2.8, 1.1);
      const sc = reduce ? 0 : story - seasonStart;
      const pal = sc > 0 ? seasonAt(sc) : Object.assign({}, SEASONS[0], {
        sky: mix(night.sky, SEASONS[0].sky, dawn), hills: mix(night.hills, SEASONS[0].hills, dawn), crest: mix(night.crest, SEASONS[0].crest, dawn),
        mist: mix(night.mist, SEASONS[0].mist, dawn), rim: mix(night.rim, SEASONS[0].rim, dawn),
        cloudLit: mix(night.cloudLit, SEASONS[0].cloudLit, dawn), cloudShade: mix(night.cloudShade, SEASONS[0].cloudShade, dawn) });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = css(ink); ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = appear(0, 0.8);

      const horizon = h * 0.64;
      const g = ctx.createLinearGradient(0, 0, 0, horizon + h * 0.04);
      pal.sky.forEach((c, i) => g.addColorStop(i / 4, css(c)));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      const sv = appear(0.25, 1.0) * (1 - smooth(progress(dawn, 0.1, 0.6)));
      if (sv > 0) for (const [sx, sy, sr, sp, ph] of STARS) {
        ctx.fillStyle = css(mix(moonlight, [255, 226, 196], sr * 0.5), 0.85 * (0.55 + 0.45 * Math.sin(t * (1.5 + sp * 2.5) + ph * 6.28)) * sv);
        ctx.beginPath(); ctx.arc(sx * w, sy * horizon * 0.8, 0.4 + sr * 0.9, 0, Math.PI * 2); ctx.fill();
      }

      const setting = ease(progress(story, 0.6, 2.4));
      const mv = appear(0.6, 0.9) * (1 - smooth(progress(story, 1.7, 1.0)));
      if (mv > 0) {
        const r = h * 0.05, cx = w * (0.22 - 0.08 * setting), cy = h * (0.19 + 0.36 * setting);
        const halo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 6);
        halo.addColorStop(0, css(moonlight, 0.24 * mv)); halo.addColorStop(0.4, css(moonlight, 0.06 * mv)); halo.addColorStop(1, css(moonlight, 0));
        ctx.fillStyle = halo; ctx.fillRect(cx - r * 6, cy - r * 6, r * 12, r * 12);
        const disc = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        disc.addColorStop(0, css([244, 244, 236], mv)); disc.addColorStop(1, css([196, 200, 210], mv));
        ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = css([160, 164, 178], 0.35 * mv);
        [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.35, 0.12], [0.3, -0.35, 0.1]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(cx + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2); ctx.fill(); });
      }

      const cv = appear(0.8, 1.0);
      [[0.2, 0.44, 0.34, 0.035], [0.72, 0.36, 0.42, 0.03], [0.5, 0.53, 0.5, 0.025]].forEach((b, i) => {
        const span = w * 1.4, drift = ((t * w * 0.006 * (i % 2 ? -1 : 1)) % span + span) % span;
        const bw = w * b[2], bh = h * b[3];
        for (let k = 0; k < 5; k++) {
          const dx = (k / 4 - 0.5) * 0.75, dy = k % 2 ? 0.15 : -0.2;
          const pw = bw * (0.42 - Math.abs(dx) * 0.3), ph = bh * (1.2 - Math.abs(dx) * 0.6);
          let px = w * b[0] + drift + bw * dx; px = ((px + w * 0.2) % span + span) % span - w * 0.2;
          const py = h * b[1] + bh * dy, col = mix(pal.cloudShade, pal.cloudLit, 0.35 + 0.65 * (k % 2));
          ctx.save(); ctx.translate(px, py); ctx.scale(1, ph / pw);
          const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, pw);
          cg.addColorStop(0, css(col, (0.34 + 0.18 * dawn) * cv)); cg.addColorStop(0.5, css(col, (0.12 + 0.08 * dawn) * cv)); cg.addColorStop(1, css(col, 0));
          ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, pw, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
      });

      const finalIcon = { x: w / 2, y: h * 0.34, side: Math.min(h * 0.22, 190) };
      const rise = ease(progress(story, 1.1, 1.6)), m = easeInOut(forming), sunSide = h * 0.34;
      const sun = { x: w * 0.63, y: h * (0.84 - 0.38 * rise) };
      const icon = { x: sun.x + (finalIcon.x - sun.x) * m, y: sun.y + (finalIcon.y - sun.y) * m, side: sunSide + (finalIcon.side - sunSide) * m };

      const warmth = dawn * (1 - 0.6 * m);
      if (warmth > 0) {
        const gr = icon.side * 1.5, gy = icon.y + icon.side * 0.12;
        const sg = ctx.createRadialGradient(icon.x, gy, 0, icon.x, gy, gr);
        sg.addColorStop(0, css(zones[5], 0.34 * warmth)); sg.addColorStop(0.4, css(zones[4], 0.16 * warmth)); sg.addColorStop(0.7, css(zones[3], 0.05 * warmth)); sg.addColorStop(1, css(zones[3], 0));
        ctx.fillStyle = sg; ctx.fillRect(icon.x - gr, gy - gr, gr * 2, gr * 2);
      }

      const drawSun = () => {
        const shown = smooth(progress(story, 1.1, 0.4));
        if (shown <= 0) return;
        const u = icon.side / 824, baseAlpha = ctx.globalAlpha;
        ctx.globalAlpha = baseAlpha * shown;
        const rect = (side, sink) => [icon.x - side * u / 2, icon.y + sink * u - side * u / 2, side * u];
        const growth = (i) => ease(progress(forming, [0.55, 0.35, 0.15][i], 0.45));
        const grown = { 3: { side: zone(3).side, sink: zone(3).sink } };
        for (const i of [2, 1, 0]) { const own = zone(i), inner = grown[i + 1], gg = growth(i); grown[i] = { side: inner.side + (own.side - inner.side) * gg, sink: inner.sink + (own.sink - inner.sink) * gg }; }
        for (const i of [0, 1, 2]) {
          const gg = growth(i); if (gg <= 0) continue;
          const own = zone(i), { side, sink } = grown[i], [x, y, s] = rect(side, sink);
          if (i === 0) { ctx.save(); ctx.shadowColor = `rgba(0,0,0,${0.4 * gg})`; ctx.shadowBlur = 24 * u * dpr; ctx.shadowOffsetY = 10 * u * dpr; }
          ctx.fillStyle = css(zones[i], Math.min(gg * 2.5, 1)); roundRect(ctx, x, y, s, s, side * (own.radius / own.side) * u); ctx.fill();
          if (i === 0) ctx.restore();
        }
        for (let i = 3; i < 7; i++) { const z = zone(i), [x, y, s] = rect(z.side, z.sink); ctx.fillStyle = css(zones[i]); roundRect(ctx, x, y, s, s, z.radius * u); ctx.fill(); }
        ctx.globalAlpha = baseAlpha;
      };
      if (forming === 0) drawSun();

      const crossing = progress(story, 1.3, 2.9);
      if (crossing > 0 && crossing < 1) {
        const vis = smooth(Math.min(crossing * 5, 1)) * smooth(Math.min((1 - crossing) * 5, 1)), b = h * 0.011;
        const lx = w * (-0.08 + 1.16 * crossing), ly = h * (0.27 - 0.05 * crossing);
        ctx.strokeStyle = css(ink, 0.8 * vis); ctx.lineWidth = Math.max(b * 0.28, 1); ctx.lineCap = "round"; ctx.beginPath();
        [[0, 0, 0], [-2.6, 1.6, 1.3], [-5, 3.1, 2.2], [-2.4, -1.9, 0.7], [-4.9, -3.6, 2.9], [-7.6, 0.4, 1.8]].forEach(([dx, dy, p]) => {
          const cx = lx + dx * b * 2.2, cy = ly + dy * b * 2 + Math.sin(t * 2.2 + p) * b * 0.6, tip = b * (0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * 10 + p)));
          ctx.moveTo(cx - b * 1.4, cy - tip); ctx.quadraticCurveTo(cx - b * 0.6, cy - tip * 0.25 - b * 0.35, cx, cy);
          ctx.quadraticCurveTo(cx + b * 0.6, cy - tip * 0.25 - b * 0.35, cx + b * 1.4, cy - tip);
        });
        ctx.stroke();
      }

      const crests = [0.6, 0.69, 0.75];
      for (let layer = 0; layer < 3; layer++) {
        const shown = appear(0.35 + 0.2 * layer, 0.8);
        if (shown <= 0) continue;
        const base = ctx.globalAlpha; ctx.globalAlpha = base * shown;
        const dy = h * 0.025 * (1 - shown), col = pal.hills[layer];
        const crest = mix(col, pal.crest, 0.12 - 0.035 * layer + 0.25 * pal.snowCap);
        hillPath(layer, dy);
        const hg = ctx.createLinearGradient(0, h * crests[layer], 0, h * (crests[layer] + 0.12));
        hg.addColorStop(0, css(crest)); hg.addColorStop(1, css(col)); ctx.fillStyle = hg; ctx.fill();
        ctx.strokeStyle = css(pal.rim, 0.16 + 0.12 * dawn - 0.05 * layer + 0.5 * pal.snowCap); ctx.lineWidth = 1 + 2 * pal.snowCap; ctx.stroke();

        // Grass along the crests in spring and summer, flowers in spring.
        if (pal.grass > 0.01 && layer > 0) {
          ctx.strokeStyle = css(mix(pal.grassCol, col, layer === 1 ? 0.45 : 0), pal.grass * (layer === 1 ? 0.55 : 0.9)); ctx.lineWidth = layer === 1 ? 1 : 1.4; ctx.lineCap = "round";
          ctx.beginPath();
          for (const [bx, bh, bs] of BLADES) {
            if (layer === 1 && bs > 0.5) continue;
            const x = bx * w, gy = hill(layer, bx) * h + dy + (layer === 2 ? bs * h * 0.03 : 0);
            const len = h * (layer === 1 ? 0.008 : 0.016) * (0.6 + bh * 0.8), sway = Math.sin(t * 1.6 + bx * 14) * len * 0.35;
            ctx.moveTo(x, gy); ctx.quadraticCurveTo(x + sway * 0.3, gy - len * 0.6, x + sway, gy - len);
          }
          ctx.stroke();
        }
        if (pal.flowers > 0.01 && layer === 2) {
          for (const [fx, fy, fc] of FLOWERS) {
            const x = fx * w, y = hill(2, fx) * h + dy + h * (0.008 + fy * 0.07);
            ctx.fillStyle = css(fc < 0.33 ? [255, 214, 232] : fc < 0.66 ? [255, 244, 170] : [255, 255, 255], 0.85 * pal.flowers);
            ctx.beginPath(); ctx.arc(x, y, 1.2 + fc * 1.4, 0, Math.PI * 2); ctx.fill();
          }
        }

        if (pal.ground > 0.01 && layer > 0) {
          for (const [bx, bh, bs, bc] of BLADES) {
            if (layer === 1 && bs > 0.4) continue;
            const x = bx * w, y = hill(layer, bx) * h + dy + (layer === 2 ? bs * h * 0.06 : bh * h * 0.006) - 1;
            const rustle = Math.sin(t * 2 + bx * 30) * 0.3;
            ctx.save(); ctx.translate(x, y); ctx.rotate(bh * 6 + rustle);
            ctx.fillStyle = css(bc < 0.33 ? [214, 112, 46] : bc < 0.66 ? [178, 64, 34] : [228, 170, 64], pal.ground * (layer === 1 ? 0.6 : 0.95));
            ctx.beginPath(); ctx.ellipse(0, 0, (layer === 1 ? 2 : 3.4) * (0.7 + bs * 0.6), (layer === 1 ? 1.1 : 1.8), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
        }
        if (pal.snowCap > 0.01 && layer === 2) {
          ctx.fillStyle = "#fff";
          for (const [sx, sy, ss, sp] of SPARKS) {
            const tw = 0.5 + 0.5 * Math.sin(t * (2 + sp * 3) + sx * 40);
            ctx.globalAlpha = base * shown * pal.snowCap * tw * 0.9;
            ctx.beginPath(); ctx.arc(sx * w, hill(2, sx) * h + dy + h * (0.01 + sy * 0.15), 0.6 + ss * 0.9, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = base * shown;
        }
        if (pal.river > 0.01 && layer === 2) {
          // A summer river winding across the near plain, its surface flowing left to right.
          const yAt = (x) => h * (0.905 + 0.022 * Math.sin(x * 5.2 + 0.8) + 0.008 * Math.sin(x * 13 + 2)), wAt = (x) => h * (0.016 + 0.02 * x);
          ctx.beginPath();
          for (let i = 0; i <= 80; i++) { const x = i / 80; ctx.lineTo(x * w, yAt(x) - wAt(x) + dy); }
          for (let i = 80; i >= 0; i--) { const x = i / 80; ctx.lineTo(x * w, yAt(x) + wAt(x) + dy); }
          ctx.closePath();
          const rg = ctx.createLinearGradient(0, h * 0.87, 0, h * 0.95);
          rg.addColorStop(0, css([150, 200, 226], 0.95 * pal.river)); rg.addColorStop(1, css([70, 130, 176], 0.95 * pal.river));
          ctx.fillStyle = rg; ctx.fill();
          ctx.strokeStyle = css([255, 255, 255], 0.55 * pal.river); ctx.lineWidth = 1.2; ctx.lineCap = "round";
          ctx.beginPath();
          for (const [rx, ry, rs] of RIPPLES) {
            const u = (rx + t * (0.02 + rs * 0.02)) % 1, x = u * w, y = yAt(u) + (ry - 0.5) * wAt(u) * 1.2 + dy, len = w * (0.008 + rs * 0.014);
            ctx.moveTo(x, y); ctx.lineTo(x + len, y + Math.cos(u * 5.2 + 0.8) * 0.022 * h * 5.2 * len / w);
          }
          ctx.stroke();
        }

        if (layer === 1) {
          // The hiker walks on for good: just past the right edge, he comes back in on the left.
          const hv = appear(1.0, 0.7), xr = ((0.82 + 0.009 * t) % 1.04) - 0.02, x = xr * w, gy = hill(1, clamp(xr, 0, 1)) * h + dy;
          const s = h * 0.058, ph = t * 5.2, bob = Math.abs(Math.sin(ph)) * s * 0.03, sw = Math.sin(ph);
          ctx.save(); ctx.globalAlpha = base * shown * hv; ctx.strokeStyle = ctx.fillStyle = css(mix(col, ink, 0.6 + 0.25 * pal.snowCap));
          ctx.lineCap = "round"; ctx.lineJoin = "round";
          const P = (dx, dy2) => [x + dx * s, gy + dy2 * s - bob];
          const hip = P(-0.04, -0.47), sh = P(0.04, -0.82);
          ctx.lineWidth = s * 0.1;
          for (const k of [1, -1]) {
            const foot = [x + (-0.04 + 0.2 * sw * k) * s, gy], knee = [(hip[0] + foot[0]) / 2 + 0.06 * s, (hip[1] + foot[1]) / 2];
            ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...knee); ctx.lineTo(...foot); ctx.stroke();
          }
          ctx.lineWidth = s * 0.17; ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...sh); ctx.stroke();
          roundRect(ctx, sh[0] - 0.24 * s, sh[1] - 0.02 * s, 0.17 * s, 0.32 * s, 0.05 * s); ctx.fill();
          ctx.beginPath(); ctx.arc(...P(0.1, -0.95), 0.085 * s, 0, Math.PI * 2); ctx.fill();
          const hand = P(0.2 + 0.05 * sw, -0.58);
          ctx.lineWidth = s * 0.07; ctx.beginPath(); ctx.moveTo(...sh); ctx.lineTo(...hand); ctx.stroke();
          ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(hand[0], hand[1] - 0.05 * s); ctx.lineTo(hand[0] + 0.12 * s, gy); ctx.stroke();
          ctx.restore();
        }
        if (layer === 2 && pal.blossom > 0.01) {
          // Spring: a flowering tree where the campfire burns, petals drifting off it.
          const bx = w * 0.3, by = hill(2, 0.3) * h + dy, s = h * 0.07;
          ctx.save(); ctx.globalAlpha = base * shown * pal.blossom;
          ctx.strokeStyle = css([70, 46, 40]); ctx.lineCap = "round"; ctx.lineWidth = s * 0.12;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - s * 0.08, by - s * 0.5, bx + s * 0.04, by - s * 0.95);
          ctx.moveTo(bx - s * 0.02, by - s * 0.55); ctx.lineTo(bx - s * 0.4, by - s * 0.95); ctx.moveTo(bx + s * 0.02, by - s * 0.7); ctx.lineTo(bx + s * 0.42, by - s * 1.0); ctx.stroke();
          for (const [ux, uy, us, uc] of BLOOMS) {
            const a = ux * Math.PI * 2, r = Math.sqrt(uy) * s * 0.62, px = bx + Math.cos(a) * r * 1.25, py = by - s * 1.12 + Math.sin(a) * r * 0.7;
            ctx.fillStyle = css(uc < 0.5 ? [255, 196, 216] : uc < 0.85 ? [248, 160, 192] : [255, 236, 242], 0.92);
            ctx.beginPath(); ctx.arc(px, py, s * (0.07 + us * 0.07), 0, Math.PI * 2); ctx.fill();
          }
          for (const [px0, py0, ps] of PETALS) {
            const k = ((t * (0.06 + ps * 0.05) + px0) % 1), px = bx + (k * 0.22 + Math.sin(t * 2 + px0 * 9) * 0.01) * w, py = by - s * 1.1 + k * s * 1.6 + py0 * s * 0.3;
            ctx.fillStyle = css([255, 200, 220], 0.85 * (1 - k)); ctx.beginPath(); ctx.ellipse(px, py, 2, 1.2, k * 6, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        }
        if (layer === 2 && pal.fire > 0.01) {
          const ignite = appear(1.2, 1.0) * pal.fire, bx = w * 0.3, by = hill(2, 0.3) * h + h * 0.004 + dy, s = h * 0.05;
          ctx.save(); ctx.globalAlpha = base * shown * Math.min(pal.fire * 1.5, 1);
          ctx.fillStyle = css([34, 20, 16]);
          [-16, 14].forEach((deg) => { ctx.save(); ctx.translate(bx, by - s * 0.06); ctx.rotate(deg * Math.PI / 180); roundRect(ctx, -s * 0.55, -s * 0.07, s * 1.1, s * 0.14, s * 0.07); ctx.fill(); ctx.restore(); });
          if (ignite > 0) {
            ctx.globalCompositeOperation = "lighter";
            const fl = (0.85 + 0.15 * Math.sin(t * 13.1) * Math.sin(t * 7.7 + 1.2)) * ignite;
            const gl = ctx.createRadialGradient(bx, by - s * 0.2, 0, bx, by - s * 0.2, s * 3.6);
            gl.addColorStop(0, css([255, 150, 70], 0.32 * fl * pal.glow)); gl.addColorStop(0.4, css([255, 110, 50], 0.1 * fl * pal.glow)); gl.addColorStop(1, css([255, 110, 50], 0));
            ctx.fillStyle = gl; ctx.fillRect(bx - s * 3.6, by - s * 3.6, s * 7.2, s * 7.2);
            // Additive light only for the glow: flames over bright snow would wash out to white.
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = base * shown * Math.min(ignite * 1.6, 1) * pal.fire;
            const tongue = (i, off, height, width, cols) => {
              const n = 0.5 + 0.5 * Math.sin(t * (9 + i) + i * 2.1) * Math.sin(t * 4.3 + i);
              const tall = height * (0.78 + 0.32 * n) * (0.15 + 0.85 * ignite);
              const sway = Math.sin(t * 3.1 + i * 1.7) * s * 0.09 + Math.sin(t * 7.3 + i) * s * 0.03;
              const fx = bx + off, fy = by - s * 0.08, tx = fx + sway * 1.6, ty = fy - tall;
              ctx.beginPath(); ctx.moveTo(fx - width / 2, fy);
              ctx.bezierCurveTo(fx - width * 0.75, fy - tall * 0.45, fx + sway - width * 0.15, fy - tall * 0.75, tx, ty);
              ctx.bezierCurveTo(fx + sway + width * 0.2, fy - tall * 0.7, fx + width * 0.75, fy - tall * 0.4, fx + width / 2, fy); ctx.closePath();
              const tg = ctx.createLinearGradient(fx, fy, tx, ty); cols.forEach((c, k) => tg.addColorStop(k / (cols.length - 1), c)); ctx.fillStyle = tg; ctx.fill();
            };
            const outer = [css([255, 200, 110], 0.9), css([250, 110, 40], 0.75), css([200, 40, 20], 0)];
            const core = [css([255, 246, 210], 0.95), css([255, 190, 90], 0.7), css([255, 120, 40], 0)];
            [[-0.2, 0.62], [-0.08, 0.95], [0.05, 1], [0.17, 0.78], [0.27, 0.5]].forEach(([o, hh], i) => tongue(i, s * o, s * hh * 1.25, s * 0.34, outer));
            [[-0.06, 0.55], [0.06, 0.62]].forEach(([o, hh], i) => tongue(i + 7, s * o, s * hh, s * 0.2, core));
            for (let i = 0; i < 12; i++) {
              const period = 1.3 + (i % 5) * 0.21, phase = ((t / period + i * 0.37) % 1 + 1) % 1;
              const px = bx + Math.sin(phase * 6 + i) * s * 0.22 + (i - 6) * s * 0.025, py = by - s * (0.4 + 2.4 * phase), r = s * 0.028 * (1 - phase * 0.6);
              ctx.fillStyle = css([255, 180, 90], 0.85 * (1 - phase) * ignite * ignite); ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
            }
          }
          ctx.restore();
        }
        if (layer < 2) {
          const my = h * (crests[layer] + 0.07) + dy;
          const mg = ctx.createLinearGradient(0, my - h * 0.05, 0, my + h * 0.05);
          mg.addColorStop(0, css(pal.mist, 0)); mg.addColorStop(0.5, css(pal.mist, 0.16 + 0.06 * dawn)); mg.addColorStop(1, css(pal.mist, 0));
          ctx.fillStyle = mg; ctx.fillRect(0, my - h * 0.05, w, h * 0.1);
        }
        ctx.globalAlpha = base;
      }

      // Autumn leaves and winter snow drift across the whole scene.
      if (pal.leaves > 0.01) for (const [lx, ly, ls, lc, lr] of LEAVES) {
        const y = (((t * (0.035 + ls * 0.04) + ly) % 1.15) - 0.08) * h, x = ((lx + t * 0.012 + Math.sin(t * (0.8 + lr) + lx * 9) * 0.03) % 1) * w;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * (1 + lr * 2) + lx * 6); ctx.scale(1, 0.55 + 0.45 * Math.sin(t * 3 + lr * 5));
        ctx.fillStyle = css(lc < 0.33 ? [236, 124, 52] : lc < 0.66 ? [204, 74, 40] : [240, 182, 70], 0.9 * pal.leaves);
        ctx.beginPath(); ctx.ellipse(0, 0, 3.2 + ls * 2, 1.8 + ls, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      if (pal.snow > 0.01) {
        ctx.fillStyle = css([255, 255, 255], 0.85 * pal.snow);
        for (const [fx, fy, fs, , fr] of FLAKES) {
          const y = (((t * (0.03 + fs * 0.05) + fy) % 1.1) - 0.05) * h, x = ((fx + Math.sin(t * (0.6 + fr) + fx * 11) * 0.02) % 1) * w;
          ctx.beginPath(); ctx.arc(x, y, 0.8 + fs * 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }

      ctx.fillStyle = css(ink, 0.62 * easeInOut(forming) * (1 - pal.lift)); ctx.fillRect(0, 0, w, h);
      if (pal.heat > 0.01 && forming > 0) {
        // Summer: the sun runs hot, a wide glare and slow rays around it.
        const gr = icon.side * 2.6;
        const hg = ctx.createRadialGradient(icon.x, icon.y, icon.side * 0.3, icon.x, icon.y, gr);
        hg.addColorStop(0, css([255, 236, 180], 0.55 * pal.heat)); hg.addColorStop(0.35, css([255, 196, 110], 0.22 * pal.heat)); hg.addColorStop(1, css([255, 170, 90], 0));
        ctx.fillStyle = hg; ctx.fillRect(icon.x - gr, icon.y - gr, gr * 2, gr * 2);
        ctx.save(); ctx.translate(icon.x, icon.y); ctx.rotate(t * 0.05);
        for (let i = 0; i < 14; i++) {
          ctx.rotate(Math.PI * 2 / 14);
          ctx.fillStyle = css([255, 226, 160], (0.07 + 0.04 * Math.sin(t * 1.3 + i)) * pal.heat);
          ctx.beginPath(); ctx.moveTo(-icon.side * 0.06, 0); ctx.lineTo(icon.side * 0.06, 0); ctx.lineTo(0, gr * 0.95); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      if (forming > 0) drawSun();
      ctx.globalAlpha = 1;

      if (!formedSent && story >= 3.45) { formedSent = true; onFormed(); }
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  return { start };
})();
