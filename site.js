// The site: appearance, nav, reveals, the hero, the how-it-works film and the feature demos.
"use strict";

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const icon = (n) => `<svg><use href="#i-${n}"/></svg>`;
  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const springEase = (k) => 1 - Math.exp(-6 * k) * Math.cos(4.2 * k * (1 - 0.15 * k));

  // ---------- Appearance: Light or Dark; the system's until a choice is made (remembered) ----------
  const themeBtn = $("#theme"), systemDark = matchMedia("(prefers-color-scheme: dark)");
  const effective = () => document.documentElement.dataset.theme || (systemDark.matches ? "dark" : "light");
  const showTheme = () => { const dark = effective() === "dark"; themeBtn.innerHTML = icon(dark ? "moon" : "sun"); themeBtn.title = dark ? "Switch to Light" : "Switch to Dark"; };
  themeBtn.addEventListener("click", () => {
    const next = effective() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    showTheme();
  });
  systemDark.addEventListener("change", showTheme);
  showTheme();

  // ---------- Nav, reveals, hero ----------
  const nav = $("#nav"), heroEl = $(".hero");
  const onScroll = () => nav.classList.toggle("solid", scrollY > heroEl.offsetHeight - 70);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const revealer = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealer.unobserve(e.target); } }), { threshold: 0.1 });
  $$(".reveal").forEach((n) => revealer.observe(n));

  // ---------- Where you are: the ring turns with the page; the nav marks the section in view ----------
  // The page position becomes a fractional section index (2.5 = halfway from the third section to the
  // fourth). The ring follows it at a limited speed, so a sudden scroll, a click in the nav or the End key
  // still reads as a turn through the sections in between, and comes to rest softly.
  const rail = $("#rail"), ring = $("#rail .ring"), dialLinks = $$("#rail .dial a");
  const navLinks = $$(".nav-links a[href^='#']");
  const chapters = dialLinks.map((a) => $(a.getAttribute("href")));
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let shown = 0, target = 0, last = 0, turning = false;
  const pagePosition = () => {
    const line = innerHeight / 3, tops = chapters.map((c) => c.getBoundingClientRect().top);
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) return chapters.length - 1;
    if (line < tops[0]) return Math.max(-1, (line - tops[0]) / innerHeight);
    for (let i = 0; i < tops.length; i++) {
      const next = i + 1 < tops.length ? tops[i + 1] : tops[i] + chapters[i].offsetHeight;
      if (line < next) return i + Math.min(1, (line - tops[i]) / Math.max(1, next - tops[i])) - 0.5;
    }
    return chapters.length - 1;
  };
  const drawRing = () => {
    const current = Math.round(shown);
    dialLinks.forEach((a, i) => {
      const d = i - shown, angle = d * 0.46;  // ~26° of ring between sections
      const fade = Math.max(0, 1 - Math.abs(d) * 0.62);
      a.style.transform = Math.abs(angle) < 1.5 ? `translateY(${(70 * Math.sin(angle)).toFixed(2)}px) scaleY(${Math.cos(angle).toFixed(3)})` : "translateY(0) scaleY(0)";
      a.style.opacity = fade.toFixed(3);
      a.style.pointerEvents = fade > 0.25 ? "auto" : "none";
      a.classList.toggle("on", i === current);
    });
    ring.style.backgroundPosition = `0 ${(-shown * 21).toFixed(2)}px`;
  };
  const turn = (t) => {
    const dt = Math.min(0.05, Math.max(0.001, (t - last) / 1000)); last = t;
    const gap = target - shown;
    // Eased approach, at most 9 sections a second.
    const step = Math.sign(gap) * Math.min(Math.abs(gap) * (1 - Math.exp(-dt / 0.12)), 9 * dt);
    shown = Math.abs(gap) < 0.002 ? target : shown + step;
    drawRing();
    turning = shown !== target;
    if (turning) requestAnimationFrame(turn);
  };
  const follow = () => {
    target = Math.max(0, Math.min(chapters.length - 1, pagePosition()));
    rail.classList.toggle("show", scrollY > heroEl.offsetHeight * 0.6);
    const id = pagePosition() > -0.5 ? "#" + chapters[Math.round(target)].id : "";
    navLinks.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === id));
    if (still.matches) { shown = target; drawRing(); return; }
    if (!turning) { turning = true; last = performance.now(); requestAnimationFrame(turn); }
  };
  addEventListener("scroll", follow, { passive: true });
  addEventListener("resize", follow);
  shown = target = Math.max(0, Math.min(chapters.length - 1, pagePosition()));
  drawRing(); follow();

  // ---------- What's next: the latest releases, from the app's own update feed ----------
  fetch("appcast.xml", { cache: "no-cache" }).then((r) => r.ok ? r.text() : Promise.reject()).then((xml) => {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const items = [...doc.querySelectorAll("item")].slice(0, 4);
    if (!items.length) return;
    const list = $("#releases ol");
    for (const item of items) {
      const version = item.getElementsByTagNameNS("*", "shortVersionString")[0]?.textContent || "";
      const date = new Date(item.querySelector("pubDate")?.textContent || "");
      const notes = new DOMParser().parseFromString(item.querySelector("description")?.textContent || "", "text/html");
      const li = el("li", "");
      const head = el("div", "rel-head");
      head.append(el("b", ""), el("span", ""));
      head.firstChild.textContent = "Version " + version;
      head.lastChild.textContent = isNaN(date) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const ul = el("ul", "");
      notes.querySelectorAll("li").forEach((n) => { const x = el("li", ""); x.textContent = n.textContent; ul.append(x); });
      li.append(head, ul);
      list.append(li);
    }
    $("#releases").hidden = false;
  }).catch(() => {});
  Hero.start($("#hero-canvas"), () => heroEl.classList.add("ready"));

  /** Runs `fn(ctl)` while `node` is on screen; stops (rejecting its waits) when it leaves. */
  function whileVisible(node, fn, threshold = 0.25) {
    let token = 0;
    const run = () => {
      const my = ++token;
      const ctl = {
        alive: () => my === token,
        wait: (ms) => new Promise((res, rej) => setTimeout(() => (my === token ? res() : rej(new Error("stop"))), reduce ? Math.min(ms, 60) : ms)),
      };
      fn(ctl).catch(() => {});
    };
    new IntersectionObserver(([e]) => { if (e.isIntersecting) run(); else token++; }, { threshold }).observe(node);
    return { restart: () => { token++; run(); } };
  }

  // ---------- The library (painted photos, made-up names, real-looking metadata) ----------
  const GR = ["Ricoh GR III", "GR Lens 18.3mm F2.8", 18.3], PZ = ["Sony ZV-E10", "E PZ 16-50mm F3.5-5.6", null],
    SIG = ["Sony ZV-E10", "Sigma 30mm F1.4 DC DN", 30], IPH = ["iPhone 15 Pro", "iPhone 15 Pro back camera", 24];
  const LIB = [
    ["coast-tilt", "R0001263.DNG", 12, GR], ["hills", "DSC02044.ARW", 15, PZ, 16], ["lake", "R0001270.DNG", 3, GR], ["field", "IMG_4417.HEIC", 21, IPH],
    ["dunes", "DSC02050.ARW", 18, PZ, 24], ["forest", "DSC02058.ARW", 6, SIG], ["city", "R0001288.DNG", 24, GR], ["snow", "IMG_4425.HEIC", 1, IPH],
    ["canyon", "R0001301.DNG", 9, GR], ["lake", "DSC02066.ARW", 4, PZ, 35], ["coast", "DSC02071.ARW", 13, PZ, 16], ["forest", "R0001312.DNG", 7, GR],
    ["hills", "DSC02080.ARW", 16, SIG], ["dunes", "IMG_4440.HEIC", 19, IPH], ["field", "DSC02087.ARW", 22, SIG], ["snow", "R0001330.DNG", 2, GR],
    ["city", "IMG_4448.HEIC", 25, IPH], ["canyon", "DSC02093.ARW", 10, PZ, 50],
  ].map(([kind, name, day, cam, focal]) => ({ kind, name, day, cap: `Oct ${day}, 2026`, camera: cam[0], lens: cam[1], focal: focal ?? cam[2] }));
  const byName = LIB.map((_, i) => i).sort((a, b) => LIB[a].name.localeCompare(LIB[b].name));
  const byDate = LIB.map((_, i) => i).sort((a, b) => LIB[b].day - LIB[a].day);

  const TILT = 3;  // degrees the edited photo's horizon leans; the crop straightens it
  let crooked = null;
  function source(kind) {
    if (kind !== "coast-tilt") return Photos.paint(kind, 600, 400);
    if (!crooked) {
      crooked = document.createElement("canvas"); crooked.width = 600; crooked.height = 400;
      const ctx = crooked.getContext("2d", { willReadFrequently: true });
      ctx.translate(300, 200); ctx.rotate(TILT * Math.PI / 180); ctx.scale(1.12, 1.12);
      ctx.drawImage(Photos.paint("coast", 600, 400), -300, -200);
    }
    return crooked;
  }
  const thumb = (kind, w = 240, h = 160) => Photos.copy(source(kind), w, h);
  function developed(kind, a, w = 240, h = 160) {
    const c = thumb(kind, w, h), ctx = c.getContext("2d", { willReadFrequently: true });
    const src = ctx.getImageData(0, 0, w, h), dst = ctx.createImageData(w, h);
    Photos.develop(src, dst, a); ctx.putImageData(dst, 0, 0);
    return c;
  }
  function makeCell(item, { labels = true, edited = null } = {}) {
    const c = el("div", "cell"), f = el("div", "frame");
    f.appendChild(thumb(item.kind));
    if (edited) { const o = developed(item.kind, edited); o.className = "over"; f.appendChild(o); f.insertAdjacentHTML("beforeend", `<span class="paste-check">${icon("check")}</span>`); }
    f.insertAdjacentHTML("beforeend", `<svg class="heart"><use href="#i-heart-fill"/></svg>`);
    c.appendChild(f);
    if (labels) c.insertAdjacentHTML("beforeend", `<div class="name"><span>${item.name}</span></div><div class="cap">${item.cap}</div>`);
    return c;
  }
  /** Places `cells` in `order` on a grid filling `area`'s width; others fade out where they are. */
  function layoutGrid(area, cells, order, { gap = 12, minW = 140, labels = true, ratio = 2 / 3 } = {}) {
    const W = area.clientWidth;
    if (!W) return;
    const cols = Math.max(2, Math.floor((W + gap) / (minW + gap)));
    const cw = (W - gap * (cols - 1)) / cols, ch = cw * ratio, rowH = ch + (labels ? 36 : gap);
    const shown = new Set(order);
    cells.forEach((c, i) => { c.style.width = cw + "px"; c.firstChild.style.height = ch + "px"; c.classList.toggle("hidden", !shown.has(i)); });
    order.forEach((idx, i) => { cells[idx].style.transform = `translate(${(i % cols) * (cw + gap)}px, ${Math.floor(i / cols) * rowH}px)`; });
  }

  // ---------- The app's slider ----------
  const kelvin = (v) => `${Math.round(1e6 / (1e6 / 5200 - v) / 50) * 50} K`;
  const signed = (v) => { const r = Math.round(v); return (r > 0 ? "+" : "") + r; };
  const ev = (v) => (v >= 0.005 ? "+" : v <= -0.005 ? "−" : "") + Math.abs(v).toFixed(2);
  const SPECS = {
    temperature: { title: "Temperature", min: -100, max: 100, track: "temp", fmt: kelvin },
    tint: { title: "Tint", min: -100, max: 100, track: "tint", fmt: signed },
    exposure: { title: "Exposure", min: -4, max: 4, fmt: ev },
    contrast: { title: "Contrast", min: -100, max: 100, fmt: signed },
    highlights: { title: "Highlights", min: -100, max: 100, fmt: signed },
    shadows: { title: "Shadows", min: -100, max: 150, fmt: signed },
    white: { title: "White", min: -100, max: 100, fmt: signed },
    black: { title: "Black", min: -100, max: 100, fmt: signed },
    hue: { title: "Hue", min: -100, max: 100, track: "hue", fmt: signed },
    saturation: { title: "Saturation", min: -100, max: 100, track: "sat", fmt: signed },
    vibrance: { title: "Vibrance", min: -100, max: 100, track: "vib", fmt: signed },
    sharpness: { title: "Sharpness", min: -100, max: 100, fmt: signed },
    clarity: { title: "Clarity", min: -100, max: 100, fmt: signed },
    dehaze: { title: "Dehaze", min: -100, max: 100, fmt: signed },
    vignette: { title: "Vignette", min: -100, max: 100, fmt: signed },
    grain: { title: "Grain", min: 0, max: 100, fmt: signed },
    grainSize: { title: "Grain Size", min: -100, max: 100, fmt: signed },
  };
  const GROUPS = [["White Balance", ["temperature", "tint"]], ["Basic", ["exposure", "contrast", "highlights", "shadows", "white", "black"]],
    ["Hue & Saturation", ["hue", "saturation", "vibrance"]], ["Detail", ["sharpness"]], ["Effects", ["clarity", "dehaze", "vignette", "grain", "grainSize"]]];

  function makeSlider(spec, onChange) {
    const s = el("div", "slider " + (spec.track || ""));
    s.innerHTML = `<div class="lab"><span>${spec.title}</span><span class="v"></span></div>
      <div class="zone"><div class="track"></div><div class="fill"></div><div class="tick"></div><div class="knob"><i></i></div></div>`;
    const zone = $(".zone", s), fill = $(".fill", s), tick = $(".tick", s), knob = $(".knob", s), vEl = $(".v", s);
    const span = spec.max - spec.min, neutral = spec.neutral ?? 0, pos = (v) => (v - spec.min) / span;
    let value = neutral, anim = 0, press = null;
    const usable = () => Math.max(zone.offsetWidth - 16, 1);
    function layout() {
      const u = usable(), f = pos(value), z = pos(neutral);
      knob.style.left = f * u + "px";
      fill.style.left = 8 + Math.min(f, z) * u + "px"; fill.style.width = Math.abs(f - z) * u + "px";
      tick.style.left = 8 + z * u - 0.5 + "px";
      vEl.textContent = spec.fmt(value); vEl.classList.toggle("mod", Math.abs(value - neutral) > 1e-3);
    }
    function set(v, emit = true) { value = clamp(v, spec.min, spec.max); layout(); if (emit) onChange(value); }
    function glide(to, ms = 560) {
      cancelAnimationFrame(anim);
      const from = value, t0 = performance.now();
      return new Promise((done) => {
        const step = (now) => {
          const k = Math.min((now - t0) / ms, 1);
          set(from + (to - from) * (reduce ? 1 : springEase(k)));
          if (k < 1) anim = requestAnimationFrame(step); else { set(to); done(); }
        };
        anim = requestAnimationFrame(step);
      });
    }
    s.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      cancelAnimationFrame(anim); s.setPointerCapture(e.pointerId);
      press = { x: e.clientX, start: value, moved: false };
      s.classList.add("held");
    });
    s.addEventListener("pointermove", (e) => {
      if (!press) return;
      const dx = e.clientX - press.x;
      if (Math.abs(dx) > 2) press.moved = true;
      if (!press.moved) return;
      const k = s.getBoundingClientRect().width / s.offsetWidth || 1;
      let v = press.start + (dx / k / usable()) * span * (e.altKey ? 0.25 : 1);
      if (Math.abs(pos(v) - pos(neutral)) * usable() < 4 && press.start !== neutral) v = neutral;
      set(v);
    });
    const release = () => { press = null; s.classList.remove("held"); };
    s.addEventListener("pointerup", release); s.addEventListener("pointercancel", release);
    s.addEventListener("dblclick", () => glide(neutral));
    new ResizeObserver(layout).observe(zone);
    layout();
    return { el: s, get: () => value, set, glide, knob, zone, pos, usable };
  }

  function segHTML(name, items, on = 0) {
    return `<div class="seg" data-k="${name}"><span class="pill"></span>${items.map((t, i) => `<b class="${i === on ? "on" : ""}">${t}</b>`).join("")}</div>`;
  }
  function setSeg(seg, i) {
    const bs = $$("b", seg), pill = $(".pill", seg);
    bs.forEach((b, k) => b.classList.toggle("on", k === i));
    pill.style.left = bs[i].offsetLeft + "px"; pill.style.width = bs[i].offsetWidth + "px";
  }

  // ---------- Filming: a fixed-size window, a camera that glides and zooms, a cursor ----------
  /** `cam` holds `win` (W0 × H0 design pixels) inside `film`; everything is measured in design pixels. */
  function rig(film, cam, win, W0, H0, onResize = () => {}) {
    const cursor = el("div", "cursor", `<svg><use href="#i-cursor"/></svg><span class="ripple"></span>`); win.appendChild(cursor);
    let base = 1, view = { x: W0 / 2, y: H0 / 2, z: 1 };
    const at = { x: W0 / 2, y: H0 / 2 };
    function aim(ms) {
      const k = base * view.z, sw = film.clientWidth, sh = film.clientHeight;
      const tx = clamp(sw / 2 - view.x * k, sw - W0 * k, 0), ty = clamp(sh / 2 - view.y * k, sh - H0 * k, 0);
      cam.style.transitionDuration = (reduce ? 0 : ms) + "ms";
      cam.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    }
    new ResizeObserver(() => { base = film.clientWidth / W0; aim(0); onResize(); }).observe(film);
    /** An element's box in window (design) coordinates, whatever the camera is doing. */
    function box(node) {
      const wr = win.getBoundingClientRect(), k = wr.width / W0, r = node.getBoundingClientRect();
      return { x: (r.left - wr.left) / k, y: (r.top - wr.top) / k, w: r.width / k, h: r.height / k };
    }
    const shoot = (x, y, z, ms = 900) => { view = { x, y, z }; aim(ms); };
    const shootAt = (node, z, ms = 900) => { const b = box(node); shoot(b.x + b.w / 2, b.y + b.h / 2, z, ms); };
    const wide = (ms = 900) => shoot(W0 / 2, H0 / 2, 1, ms);
    function pointer(ctl, x, y, ms) {
      at.x = x; at.y = y;
      cursor.style.transitionDuration = (reduce ? 0 : ms) + "ms";
      cursor.style.transform = `translate(${x - 4}px, ${y - 3}px)`;
      return ctl.wait(ms);
    }
    const cursorTo = (ctl, node, ms = 600, fx = 0.5, fy = 0.55) => { const b = box(node); return pointer(ctl, b.x + b.w * fx, b.y + b.h * fy, ms); };
    async function click(ctl) {
      cursor.classList.remove("rip"); void cursor.offsetWidth; cursor.classList.add("press", "rip");
      await ctl.wait(120); cursor.classList.remove("press"); await ctl.wait(80);
    }
    /** Drags slider `s` to `v` with the pointer on its knob, the way a person does. */
    async function drag(ctl, s, v, ms = 520) {
      const b = box(s.knob);
      if (Math.hypot(b.x + b.w / 2 - at.x, b.y + b.h / 2 - at.y) > 6) await pointer(ctl, b.x + b.w / 2, b.y + b.h / 2, 380);
      const zb = box(s.zone), k = zb.w / s.zone.offsetWidth;
      s.el.classList.add("held");
      pointer(ctl, zb.x + (8 + s.pos(v) * s.usable()) * k, zb.y + 11 * k, ms).catch(() => {});
      await s.glide(v, ms);
      s.el.classList.remove("held");
      if (!ctl.alive()) throw new Error("stop");
    }
    /** Camera wide, cursor at (x, y), at once. */
    function home(x, y) { view = { x: W0 / 2, y: H0 / 2, z: 1 }; aim(0); pointer({ wait: () => Promise.resolve() }, x, y, 0); }
    return { shoot, shootAt, wide, box, pointer, cursorTo, click, drag, home, at, cursor };
  }

  // ---------- How it works: one take, filmed by a moving camera ----------
  function buildFilm() {
    const W0 = 1200, H0 = 750;
    const film = $("#film"), caption = $("#caption"), chapterBar = $("#chapters");
    const cam = el("div", "cam"); film.appendChild(cam);
    const win = el("div", "window");
    win.innerHTML = `
      <div class="titlebar"><div class="lights"><i></i><i></i><i></i></div><div class="tb-title">Pictures</div>
        <div class="tb-tools lib-tools">
          <button class="tb-btn sort">${icon("sort")}</button><button class="tb-btn filter">${icon("filter")}</button>
          <div class="tb-search">${icon("search")}Search</div><button class="tb-btn bolt">${icon("bolt")}</button>
        </div>
        <div class="tb-tools ed-tools">
          <span class="done">Done</span>
          <button class="tb-btn">${icon("compare")}</button><button class="tb-btn">${icon("info")}</button><button class="tb-btn">${icon("heart")}</button>
          <button class="tb-btn copy">${icon("copy")}</button><button class="tb-btn paste">${icon("paste")}</button>
          <button class="tb-btn crop">${icon("crop")}</button><button class="tb-btn mask">${icon("mask")}</button>
          <button class="tb-btn bolt">${icon("bolt")}</button>
        </div>
      </div>
      <div class="win-body">
        <div class="sidebar">
          <div class="sb-head">Library</div>
          <div class="sb-row">${icon("photos")}All Files<span class="count">312</span></div>
          <div class="sb-row">${icon("edited")}Edited<span class="count">41</span></div>
          <div class="sb-row">${icon("heart")}Favorites<span class="count">27</span></div>
          <div class="sb-head">Folders</div>
          <div class="sb-row sel pictures">${icon("box")}Pictures<span class="count">312</span></div>
        </div>
        <div class="grid-area"><div class="empty">No photos yet</div><div class="grid"></div></div>
      </div>
      <div class="pop sortpop" style="top:46px;right:232px;width:190px">
        ${["Date Taken", "Date Modified", "Date Created", "Name", "Size"].map((t) => `<div class="item" data-s="${t}"><svg class="ck"><use href="#i-check"/></svg>${t}</div>`).join("")}
        <div class="foot"><span>Ascending</span><span>Descending</span></div>
      </div>
      <div class="pop filterpop" style="top:46px;right:200px;width:290px"></div>
      <div class="editor">
        <div class="stage">
          <div class="photo-wrap">
            <div class="photo-box"><canvas class="photo"></canvas><div class="crop-box"><i></i><i></i><i></i><i></i></div></div>
            <div class="mask-tint"></div><div class="mask-ring"></div>
            <div class="crop-bar">${segHTML("aspect", ["Original", "Free", "1 : 1", "4 : 5", "16 : 9"])}<span class="cdone">Done</span></div>
            <div class="notice">${icon("check")}<span></span></div>
          </div>
          <div class="strip"></div>
        </div>
        <div class="inspector">
          <div class="pane adjust"><div class="scroller"><div class="histo"><canvas></canvas></div></div></div>
          <div class="pane masks">
            <div class="group-h" style="border-top:0;margin-top:0">Masks</div>
            <div class="tiles"><b class="t-brush">${icon("brush")}Brush</b><b class="t-linear">${icon("linear")}Linear</b><b class="t-radial">${icon("radial")}Radial</b></div>
            <div class="mrow">${icon("radial")}Radial 1</div>
            <div class="mask-sliders"></div>
          </div>
        </div>
      </div>
      <div class="dim"></div>
      <div class="export">
        <div class="ex-title">${icon("bolt")}Export 4 photos</div>
        <div class="ex-row"><span>Format</span>${segHTML("fmt", ["JPEG", "HEIC", "TIFF", "PNG"])}</div>
        <div class="ex-row"><span>Colours</span>${segHTML("space", ["sRGB", "Display P3"])}</div>
        <div class="ex-row quality"><span>Quality</span></div>
        <div class="ex-size"></div>
        <div class="ex-row"><span>Border</span>${segHTML("border", ["None", "White"])}</div>
        <div class="ex-row"><span>Timestamp</span>${segHTML("date", ["None", "DD.MM.YY", "MM.DD.YY"])}</div>
        <div class="ex-go"><span class="cancel">Cancel</span><span class="go">${icon("bolt")}Export</span></div>
      </div>
      <div class="progress"><i></i></div>`;
    cam.appendChild(win);
    const sd = el("div", "sdcard", `<svg viewBox="0 0 132 166"><path d="M22 3h86l21 21v134a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V22z" fill="#232326" stroke="#4a4a50" stroke-width="2"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${24 + i * 14}" y="12" width="9" height="24" rx="2" fill="#c9a24a"/>`).join("")}
      <rect x="20" y="78" width="92" height="58" rx="6" fill="#f58c4a"/><text x="66" y="114" text-anchor="middle" font-size="22" font-weight="700" fill="#1a1a1a" font-family="-apple-system,sans-serif">SD</text>
      <text x="66" y="154" text-anchor="middle" font-size="10" fill="#8d8d92" font-family="-apple-system,sans-serif">128 GB</text></svg>`);
    win.appendChild(sd);
    const keyChip = el("div", "key", "⌘"); win.appendChild(keyChip);

    const q = (s) => $(s, win);
    const grid = q(".grid"), empty = q(".empty"), title = q(".tb-title"), sidebar = q(".sidebar");
    const sortPop = q(".sortpop"), filterPop = q(".filterpop");
    const canvas = q(".photo"), photoBox = q(".photo-box"), cropBox = q(".crop-box"), photoWrap = q(".photo-wrap");
    const ring = q(".mask-ring"), tint = q(".mask-tint"), notice = q(".notice"), strip = q(".strip");
    const scroller = q(".scroller"), histo = q(".histo canvas"), progress = q(".progress i");
    const cells = LIB.map((it) => { const c = makeCell(it); grid.appendChild(c); return c; });

    // Filters: a section per facet; a photo shows when it matches every facet that has a choice.
    const FACETS = [
      ["Camera", "camera", ["iPhone 15 Pro", "Ricoh GR III", "Sony ZV-E10"]],
      ["Lens", "lens", ["E PZ 16-50mm F3.5-5.6", "GR Lens 18.3mm F2.8", "Sigma 30mm F1.4 DC DN"]],
      ["Focal Length", "focal", [16, 18.3, 24, 30, 35, 50]],
    ];
    filterPop.innerHTML = FACETS.map(([head, key, vals]) => `<div class="head">${head}</div>` + vals.map((v) =>
      `<div class="item tick" data-k="${key}" data-v="${v}"><span class="box">${icon("check")}</span>${key === "focal" ? v + " mm" : v}<span class="n">${LIB.filter((p) => p[key] === v).length}</span></div>`).join("")).join("")
      + `<div class="foot"><span class="count"></span><span>Clear</span></div>`;
    const TICKS = [["camera", "Ricoh GR III"], ["camera", "Sony ZV-E10"], ["lens", "E PZ 16-50mm F3.5-5.6"], ["lens", "GR Lens 18.3mm F2.8"], ["focal", "18.3"], ["focal", "16"]];
    const chosen = { camera: new Set(), lens: new Set(), focal: new Set() };
    const matches = (p) => Object.entries(chosen).every(([k, set]) => set.size === 0 || set.has(String(p[k])));

    let sorted = byName;
    const visibleOrder = () => sorted.filter((i) => matches(LIB[i]));
    const relayout = () => layoutGrid(grid, cells, visibleOrder());
    function setFilters(n) {
      Object.values(chosen).forEach((s) => s.clear());
      TICKS.slice(0, n).forEach(([k, v]) => chosen[k].add(v));
      $$(".item", filterPop).forEach((it) => it.classList.toggle("on", chosen[it.dataset.k].has(it.dataset.v)));
      $(".foot .count", filterPop).textContent = `${visibleOrder().length} of ${LIB.length} photos`;
    }
    const setSort = (name) => { $$(".item", sortPop).forEach((it) => it.classList.toggle("on", it.dataset.s === name)); sorted = name === "Date Taken" ? byDate : byName; };

    // The edit: one photo, its develop, the full inspector, a mask and a crop.
    const K = 0;  // R0001263.DNG, the GR III coast
    const LOOK = { exposure: 0.35, contrast: 18, highlights: -45, shadows: 40, temperature: 10, vibrance: 25, vignette: -30 };
    const MASK = { x: 0.37, y: 0.55, r: 0.28 };
    const dev = Photos.developer(source(LIB[K].kind), canvas);
    const S = { adj: {}, mask: null };
    let hTimer = 0;
    const render = (now = false) => {
      dev.render(S.adj, S.mask, now);
      if (!hTimer) hTimer = setTimeout(() => { hTimer = 0; Photos.histogram(canvas, histo); }, 140);
    };
    const sliders = {};
    GROUPS.forEach(([name, ids]) => {
      scroller.appendChild(el("div", "group-h", `<span>${name}</span>${icon("reset")}`));
      ids.forEach((id) => { const s = makeSlider(SPECS[id], (v) => { S.adj[id] = v; render(); }); sliders[id] = s; scroller.appendChild(s.el); });
    });
    const maskSliders = {};
    [["exposure", { title: "Exposure", min: -4, max: 4, fmt: ev }], ["contrast", SPECS.contrast], ["shadows", SPECS.shadows], ["saturation", SPECS.saturation]].forEach(([id, spec]) => {
      const s = makeSlider(spec, (v) => { if (id === "exposure") { S.mask = { ...MASK, exposure: v }; render(); } });
      maskSliders[id] = s; q(".mask-sliders").appendChild(s.el);
    });
    const quality = makeSlider({ title: "", min: 0, max: 100, neutral: 85, fmt: (v) => String(Math.round(v)) }, (v) => {
      q(".ex-size").textContent = `About ${(0.9 + Math.pow(v / 100, 3) * 9.5).toFixed(1)} MB per photo`;
    });
    q(".ex-row.quality").appendChild(quality.el); quality.set(85);
    const straighten = makeSlider({ title: "Straighten", min: -45, max: 45, fmt: (v) => `${v.toFixed(1)}°` },
      (v) => { canvas.style.transform = `translate(-50%, -50%) rotate(${v}deg) scale(${1 + Math.abs(v) * 0.03})`; });
    q(".crop-bar").insertBefore(straighten.el, q(".cdone"));

    // Photo bar: the photos the filter left, the open one framed.
    let strips = [];
    function buildStrip() {
      strip.innerHTML = ""; strips = [];
      visibleOrder().forEach((i) => {
        const st = el("div", "st" + (i === K ? " cur" : ""));
        st.appendChild(thumb(LIB[i].kind, 120, 80));
        const over = developed(LIB[i].kind, LOOK, 120, 80); over.className = "over"; st.appendChild(over);
        st.insertAdjacentHTML("beforeend", `<span class="paste-check">${icon("check")}</span>`);
        st.dataset.i = i; strip.appendChild(st); strips.push(st);
      });
    }
    const others = () => strips.filter((st) => +st.dataset.i !== K).slice(0, 3);

    const R = rig(film, cam, win, W0, H0, relayout);
    const { shoot, shootAt, wide, box, pointer, cursorTo, click, drag } = R;
    function mark(ch) {
      tabs.forEach((t, k) => {
        t.classList.toggle("on", k === ch);
        const bar = $(".bar i", t); bar.style.transition = "none"; bar.style.width = k < ch ? "100%" : "0"; void bar.offsetWidth;
        if (k === ch) { bar.style.transition = `width ${CHAPTERS[ch][1]}ms linear`; bar.style.width = "100%"; }
      });
      caption.style.opacity = 0;
      setTimeout(() => { caption.textContent = CHAPTERS[ch][2]; caption.style.opacity = 1; }, 220);
    }
    const veil = el("div", "veil"); film.appendChild(veil);
    async function dissolveTo(ctl, ch) {
      veil.classList.add("show"); await ctl.wait(380);
      prepare(ch); await ctl.wait(120);
      veil.classList.remove("show");
    }
    function toast(text, ms) { $("span", notice).textContent = text; notice.classList.add("show"); setTimeout(() => notice.classList.remove("show"), ms); }
    function placeMask(show) {
      const wb = box(photoWrap), cb = box(canvas), r = MASK.r * cb.w;
      [ring, tint].forEach((n) => { n.style.left = cb.x - wb.x + MASK.x * cb.w - r + "px"; n.style.top = cb.y - wb.y + MASK.y * cb.h - r + "px"; n.style.width = n.style.height = 2 * r + "px"; });
      ring.classList.toggle("on", show);
    }
    function cropTo(ar, inset = 0) {
      const W = 760, H = 507; let w = W, h = W / ar;
      if (h > H) { h = H; w = H * ar; }
      w *= 1 - inset; h *= 1 - inset;
      Object.assign(cropBox.style, { left: (W - w) / 2 + "px", top: (H - h) / 2 + "px", width: w + "px", height: h + "px" });
    }
    const setCropped = (on) => { photoBox.style.height = on ? "428px" : "507px"; straighten.set(on ? -TILT : 0); };

    // ---------- Chapters ----------
    const CHAPTERS = [
      ["Import", 4200, "Plug in the card. The photos are just there: nothing to import."],
      ["Sort & filter", 8200, "Sort by date taken. Filter by camera, lens and focal length."],
      ["Edit", 10200, "Open one. Basic first, then the rest of the panel."],
      ["Crop & masks", 10400, "Crop to 16 : 9, level the horizon, brighten the sun with a radial mask."],
      ["Copy & paste", 6800, "Copy the edit, pick the others in the photo bar, paste."],
      ["Export", 7400, "Export as JPEG and pick the quality. Border and date are optional."],
    ];
    let current = 0, reel = null;
    const tabs = CHAPTERS.map(([name], i) => {
      const b = el("button", "chapter", `${name}<span class="bar"><i></i></span>`);
      b.addEventListener("click", () => { current = i; reel.restart(); });
      chapterBar.appendChild(b); return b;
    });

    let sdRow = null;
    function setImported(on, animate) {
      if (on && !sdRow) { sdRow = el("div", "sb-row" + (animate ? " new" : ""), `${icon("card")}EOS_DIGITAL<span class="count">18</span>`); sidebar.appendChild(sdRow); }
      if (!on && sdRow) { sdRow.remove(); sdRow = null; }
      $$(".sb-row", sidebar).forEach((r) => r.classList.toggle("sel", on ? r === sdRow : r.classList.contains("pictures")));
      empty.style.opacity = on ? 0 : 1;
      cells.forEach((c) => c.classList.toggle("gone", !on));
    }

    /** Each chapter starts from a known state, so the tabs can jump anywhere. */
    function prepare(ch) {
      film.classList.add("instant");
      win.className = "window";
      [sortPop, filterPop].forEach((p) => p.classList.remove("show"));
      sd.className = "sdcard"; notice.classList.remove("show"); keyChip.classList.remove("show");
      progress.style.width = "0";
      const copyBtn = q(".ed-tools .copy"), pasteBtn = q(".ed-tools .paste");
      copyBtn.className = "tb-btn copy"; copyBtn.innerHTML = icon("copy"); pasteBtn.className = "tb-btn paste"; pasteBtn.innerHTML = icon("paste");
      setImported(ch >= 1, false);
      setSort(ch >= 2 ? "Date Taken" : "Name"); setFilters(ch >= 2 ? TICKS.length : 0); relayout();
      cells.forEach((c) => c.classList.remove("sel"));
      title.textContent = ch >= 1 ? "EOS_DIGITAL" : "Pictures";
      if (ch >= 3) { win.classList.add("editing"); title.textContent = LIB[K].name; buildStrip(); }
      Object.keys(sliders).forEach((id) => sliders[id].set(ch >= 3 ? LOOK[id] || 0 : 0, false));
      S.adj = ch >= 3 ? { ...LOOK } : {};
      maskSliders.exposure.set(ch >= 4 ? 0.9 : 0, false);
      S.mask = ch >= 4 ? { ...MASK, exposure: 0.9 } : null;
      $$(".tiles b", win).forEach((b) => b.classList.remove("on")); q(".mrow").classList.toggle("show", ch >= 4);
      ring.classList.remove("on"); tint.style.opacity = 0;
      setCropped(ch >= 4); setSeg(q('.seg[data-k="aspect"]'), ch >= 4 ? 4 : 0); cropTo(ch >= 4 ? 16 / 9 : 1.5, ch >= 4 ? 0.08 : 0);
      strips.forEach((st) => { st.classList.remove("pick", "pasted"); st.classList.toggle("edited", ch >= 4 && +st.dataset.i === K); });
      if (ch >= 5) others().forEach((st) => st.classList.add("edited", "pasted"));
      quality.set(85); $$(".export .seg", win).forEach((sg) => setSeg(sg, 0));
      scroller.style.transform = "";
      render(true); Photos.histogram(canvas, histo);
      R.home(760, 560);
      void film.offsetWidth;
      requestAnimationFrame(() => requestAnimationFrame(() => film.classList.remove("instant")));
    }

    const scenes = [
      async (ctl) => {  // Import
        await ctl.wait(500);
        sd.classList.add("show"); await ctl.wait(1100);
        sd.classList.add("into"); await ctl.wait(650);
        setImported(true, true); title.textContent = "EOS_DIGITAL";
        cells.forEach((c) => c.classList.add("gone"));
        for (const i of byName) { cells[i].classList.remove("gone"); await ctl.wait(40); }
        await ctl.wait(900);
      },
      async (ctl) => {  // Sort & filter
        const sortBtn = q(".lib-tools .sort"), filterBtn = q(".lib-tools .filter");
        shoot(860, 230, 1.45, 800);
        await cursorTo(ctl, sortBtn, 700); await click(ctl);
        sortPop.classList.add("show"); await ctl.wait(450);
        await cursorTo(ctl, $('[data-s="Date Taken"]', sortPop), 420); await click(ctl);
        setSort("Date Taken"); relayout(); await ctl.wait(380);
        sortPop.classList.remove("show"); shoot(640, 300, 1.12, 800); await ctl.wait(900);
        await cursorTo(ctl, filterBtn, 500); await click(ctl);
        filterPop.classList.add("show"); shoot(760, 330, 1.22, 700); await ctl.wait(600);
        for (let n = 1; n <= TICKS.length; n++) {
          const [k, v] = TICKS[n - 1];
          await cursorTo(ctl, $(`.item[data-k="${k}"][data-v="${v}"] .box`, filterPop), 360); await click(ctl);
          setFilters(n); relayout(); await ctl.wait(520);
        }
        await ctl.wait(400); filterPop.classList.remove("show"); wide(800); await ctl.wait(700);
      },
      async (ctl) => {  // Edit
        await cursorTo(ctl, cells[K], 600); await click(ctl); cells[K].classList.add("sel"); await click(ctl);
        buildStrip(); title.textContent = LIB[K].name; win.classList.add("editing"); await ctl.wait(650);
        const basic = $$(".group-h", scroller)[1], bb = box(basic);
        shoot(bb.x - 60, bb.y + 150, 1.75, 900); await ctl.wait(850);
        for (const [id, over] of [["exposure", 0.7], ["contrast", 32], ["highlights", -70], ["shadows", 65]]) {
          await drag(ctl, sliders[id], over, 460); await drag(ctl, sliders[id], LOOK[id], 320);
        }
        await ctl.wait(300);
        // Down the rest of the panel: colour, detail, effects.
        const travel = Math.max(0, scroller.scrollHeight - q(".pane.adjust").clientHeight + 24);
        scroller.style.transform = `translateY(${-travel}px)`;
        shoot(bb.x - 40, 520, 1.5, 1600); await ctl.wait(1700);
        await drag(ctl, sliders.vibrance, LOOK.vibrance, 520);
        await drag(ctl, sliders.vignette, LOOK.vignette, 520);
        await ctl.wait(400);
        scroller.style.transform = ""; wide(1000); await ctl.wait(1100);
        await drag(ctl, sliders.temperature, LOOK.temperature, 420);
        await ctl.wait(500);
      },
      async (ctl) => {  // Crop & masks
        await cursorTo(ctl, q(".ed-tools .crop"), 600); await click(ctl);
        cropTo(1.5); win.classList.add("cropping"); shoot(470, 370, 1.15, 900); await ctl.wait(800);
        await cursorTo(ctl, $$('.seg[data-k="aspect"] b', win)[4], 500); await click(ctl);
        setSeg(q('.seg[data-k="aspect"]'), 4); cropTo(16 / 9); await ctl.wait(800);
        await drag(ctl, straighten, -TILT, 900); cropTo(16 / 9, 0.08); await ctl.wait(700);
        await cursorTo(ctl, q(".cdone"), 600); await click(ctl);
        win.classList.remove("cropping"); setCropped(true); await ctl.wait(700);
        await cursorTo(ctl, q(".ed-tools .mask"), 500); await click(ctl);
        win.classList.add("masking", "tool"); shoot(760, 330, 1.25, 800); await ctl.wait(650);
        await cursorTo(ctl, q(".t-radial"), 450); await click(ctl);
        q(".t-radial").classList.add("on"); q(".mrow").classList.add("show"); placeMask(true);
        tint.style.opacity = 1; await ctl.wait(900); tint.style.opacity = 0; await ctl.wait(250);
        await drag(ctl, maskSliders.exposure, 0.9, 900); await ctl.wait(500);
        await cursorTo(ctl, q(".done"), 600); await click(ctl);
        win.classList.remove("masking", "tool"); ring.classList.remove("on"); wide(800);
        strips.forEach((st) => { if (+st.dataset.i === K) st.classList.add("edited"); }); await ctl.wait(700);
      },
      async (ctl) => {  // Copy & paste
        const copyBtn = q(".ed-tools .copy"), pasteBtn = q(".ed-tools .paste");
        shoot(860, 200, 1.4, 700);
        await cursorTo(ctl, copyBtn, 600); await click(ctl);
        copyBtn.classList.add("ok"); copyBtn.innerHTML = icon("check"); await ctl.wait(650);
        copyBtn.classList.remove("ok"); copyBtn.innerHTML = icon("copy");
        shoot(420, 640, 1.5, 800); await ctl.wait(500);
        keyChip.classList.add("show");
        for (const st of others()) {
          await cursorTo(ctl, st, 380); keyChip.style.transform = `translate(${R.at.x + 14}px, ${R.at.y + 10}px)`;
          await click(ctl); st.classList.add("pick");
        }
        keyChip.classList.remove("show");
        shoot(700, 380, 1.05, 800);
        await cursorTo(ctl, pasteBtn, 700); await click(ctl);
        pasteBtn.classList.add("ok"); pasteBtn.innerHTML = icon("check");
        for (const st of others()) { st.classList.add("edited", "pasted"); await ctl.wait(160); }
        toast("Adjustments pasted to 3 photos", 1600); await ctl.wait(900);
        pasteBtn.classList.remove("ok"); pasteBtn.innerHTML = icon("paste");
        strips.forEach((st) => st.classList.remove("pick")); wide(900); await ctl.wait(900);
      },
      async (ctl) => {  // Export
        await cursorTo(ctl, q(".ed-tools .bolt"), 700); await click(ctl);
        win.classList.add("exporting"); await ctl.wait(500);
        shootAt(q(".ex-row.quality"), 2.0, 900); await ctl.wait(800);
        for (const v of [96, 70, 90]) await drag(ctl, quality, v, 520);
        await ctl.wait(300); wide(800); await ctl.wait(500);
        await cursorTo(ctl, q(".ex-go .go"), 600); await click(ctl);
        win.classList.remove("exporting"); progress.style.width = "100%"; await ctl.wait(1200);
        progress.style.width = "0"; toast("Exported 4 photos", 1500); await ctl.wait(1800);
      },
    ];

    reel = whileVisible(film, async (ctl) => {
      await dissolveTo(ctl, current);
      for (;;) {
        mark(current);
        await scenes[current](ctl);
        current = (current + 1) % scenes.length;
        if (current === 0) await dissolveTo(ctl, 0);
      }
    }, 0.3);
  }

  // ---------- Feel: the app's own controls, live ----------
  /** Replays a one-shot CSS animation class, and drops it once played. */
  const restart = (node, cls, ms = 600) => {
    node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls);
    clearTimeout(node[`_${cls}`]); node[`_${cls}`] = setTimeout(() => node.classList.remove(cls), ms);
  };
  // Not "pop": that class is the film's popovers (hidden until shown).
  const pop = (b) => restart(b, "popping");
  function buildFeel() {
    // One take of the editor, filmed close: each control's own animation, one after another.
    const W0 = 1200, H0 = 675, film = $("#feel-film");
    const cam = el("div", "cam"); film.appendChild(cam);
    const win = el("div", "window editing"); cam.appendChild(win);
    const glyph = (inner) => `<span class="g">${inner}</span><span class="ring"></span><span class="badge">${icon("check")}</span>`;
    win.innerHTML = `
      <div class="titlebar"><div class="lights"><i></i><i></i><i></i></div><div class="tb-title">DSC02044.ARW</div>
        <div class="tb-tools" style="display:flex">
          <div class="ib back">${glyph(icon("back"))}</div>
          <div class="ib compare">${glyph(icon("compare"))}</div><div class="ib info">${glyph(icon("info"))}</div>
          <div class="ib heart">${glyph(`<svg class="main"><use href="#i-heart"/></svg><svg class="fillh"><use href="#i-heart-fill"/></svg>`)}</div>
          <div class="ib copy">${glyph(`<svg viewBox="0 0 24 24"><rect x="4.5" y="3.5" width="11" height="12.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><rect class="front" x="8.5" y="8" width="11" height="12.5" rx="2" style="fill:var(--w-panel)" stroke="currentColor" stroke-width="1.7"/></svg>`)}</div>
          <div class="ib paste">${glyph(`<svg viewBox="0 0 24 24"><g class="board2"><rect x="5" y="5" width="14" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="9" y="3" width="6" height="4" rx="1.2" fill="currentColor"/></g><rect class="page" x="8.5" y="9.5" width="7" height="8" rx="1" fill="currentColor"/></svg>`)}</div>
          <div class="ib crop">${glyph(icon("crop"))}</div>
          <div class="ib masks">${glyph(`<svg class="main"><use href="#i-mask"/></svg><svg class="alt"><use href="#i-mask-fill"/></svg>`)}</div>
          <div class="ib bolt">${glyph(icon("bolt"))}</div>
        </div>
      </div>
      <div class="editor">
        <div class="stage"><div class="photo-wrap">
          <div class="photo-box"><div class="reel"></div><div class="crop-box"><i></i><i></i><i></i><i></i></div></div>
        </div></div>
        <div class="inspector">
          <div class="pane adjust"><div class="group-h" style="border-top:0;margin-top:0"><span>Basic</span>${icon("reset")}</div><div class="sl"></div></div>
          <div class="pane masks">
            <div class="group-h" style="border-top:0;margin-top:0">Masks</div>
            <div class="tiles"><b class="t-brush">${icon("brush")}Brush</b><b class="t-linear">${icon("linear")}Linear</b><b class="t-radial">${icon("radial")}Radial</b></div>
            <div class="mrows"></div>
          </div>
        </div>
      </div>
      <div class="dim"></div>
      <div class="export">
        <div class="ex-title">${icon("bolt")}Export 4 photos</div>
        <div class="ex-row"><span>Format</span>${segHTML("fmt", ["JPEG", "HEIC", "TIFF", "PNG"])}</div>
        <div style="text-align:center"><span class="ex-cap">${icon("bolt")}Export</span></div>
        <div class="charge"><i></i></div>
        <div class="exdone"><span class="disc">${icon("check")}</span>Exported 4 photos</div>
      </div>
      <div class="key">→</div>`;
    const q = (sel) => $(sel, win), b = (cls) => q(`.ib.${cls}`);
    const R = rig(film, cam, win, W0, H0);
    const { shoot, shootAt, wide, cursorTo, click, drag, box } = R;
    const kinds = ["hills", "coast", "lake", "field", "dunes", "forest", "snow", "city"];
    const reel = q(".reel"); kinds.forEach((k) => reel.appendChild(thumb(k, 760, 507)));
    let at = 0;
    const slide = (d) => { at = (at + d + kinds.length) % kinds.length; reel.style.transform = `translateX(${-at * 760}px)`; };
    // Sliders drive a quick look on the photo itself.
    const look = {};
    const applyLook = () => {
      const ev = look.exposure || 0, c = (look.contrast || 0) / 100, sh = (look.shadows || 0) / 100, v = (look.vibrance || 0) / 100;
      reel.style.filter = `brightness(${Math.pow(2, ev * 0.55) * (1 + sh * 0.12)}) contrast(${1 + c * 0.45}) saturate(${1 + v * 0.8})`;
    };
    const sliders = {};
    ["exposure", "contrast", "highlights", "shadows", "vibrance"].forEach((id) => {
      sliders[id] = makeSlider(SPECS[id], (v) => { look[id] = v; applyLook(); }); q(".sl").appendChild(sliders[id].el);
    });
    const rv = el("div", "revert", `${icon("reset")}<span>Revert to Original</span>`); q(".pane.adjust").appendChild(rv);
    let turns = 0;
    const rows = q(".mrows");
    const addRow = (kind, name, fresh) => {
      const r = el("div", "mr" + (fresh ? " new" : ""), `<svg class="kind"><use href="#i-${kind}"/></svg><span class="nm">${name}</span>
        <div class="ib inv">${glyph(icon("invert"))}</div><div class="ib eye">${glyph(icon("eye"))}</div>`);
      rows.appendChild(r); return r;
    };
    const cap = q(".ex-cap"), bar = q(".charge i"), done = q(".exdone"), key = q(".key");

    const tap = async (ctl, node, z = 2.6, ms = 520) => { shootAt(node, z, ms); await cursorTo(ctl, node, ms); await click(ctl); };
    function prepare() {
      film.classList.add("instant");
      win.className = "window editing";
      ["heart", "copy", "paste", "crop", "masks", "compare"].forEach((k) => b(k).classList.remove("on", "ok", "drop"));
      Object.values(sliders).forEach((s2) => s2.set(0)); sliders.shadows.set(45);
      at = 0; slide(0);
      rows.innerHTML = ""; addRow("brush", "Brush 1"); addRow("linear", "Sky");
      $$(".tiles b", win).forEach((t2) => t2.classList.remove("on"));
      Object.assign(q(".crop-box").style, { left: "0px", top: "0px", width: "760px", height: "507px" });
      bar.style.transition = "none"; bar.style.width = "0"; done.classList.remove("show");
      setSeg(q('.seg[data-k="fmt"]'), 0);
      R.home(640, 420);
      void film.offsetWidth;
      requestAnimationFrame(() => requestAnimationFrame(() => film.classList.remove("instant")));
    }
    const veil = el("div", "veil"); film.appendChild(veil);

    const take = async (ctl) => {
      // The heart fills from the bottom, with a pop and a ring.
      await tap(ctl, b("heart"), 2.8, 700); b("heart").classList.add("on"); pop(b("heart")); restart(b("heart"), "burst"); await ctl.wait(650);
      // Copy: the front page lifts off and settles, then it flashes green with a check.
      await tap(ctl, b("copy"), 2.8, 380); restart(b("copy"), "lift", 260);
      await ctl.wait(200); b("copy").classList.add("ok"); pop(b("copy")); await ctl.wait(700); b("copy").classList.remove("ok");
      // Paste: a page drops onto the clipboard, which gives a little.
      await tap(ctl, b("paste"), 2.8, 360); b("paste").classList.add("drop"); await ctl.wait(400);
      restart(b("paste"), "give", 160); await ctl.wait(130); b("paste").classList.add("ok"); pop(b("paste")); await ctl.wait(700);
      b("paste").classList.remove("ok", "drop");
      // Rapid fire through the photos: the editor's slide, key held down.
      shoot(470, 360, 1.25, 650); await ctl.wait(500);
      Object.assign(key.style, { left: "455px", top: "640px" }); key.classList.add("show");
      for (let k = 0; k < 6; k++) { slide(1); await ctl.wait(170); }
      key.classList.remove("show"); await ctl.wait(380); slide(-1); await ctl.wait(500);
      // Sliders: drag, overshoot, settle; a double-click springs one home.
      shootAt(q(".sl"), 2.0, 650); await ctl.wait(450);
      await drag(ctl, sliders.exposure, 1.2, 420); await drag(ctl, sliders.exposure, 0.55, 260);
      await drag(ctl, sliders.contrast, 45, 380); await drag(ctl, sliders.highlights, -60, 380); await drag(ctl, sliders.vibrance, 40, 380);
      await cursorTo(ctl, sliders.shadows.knob, 300, 0.5, 0.5); await click(ctl); await click(ctl); sliders.shadows.glide(0, 700); await ctl.wait(800);
      // Revert to Original: the arrow turns and every slider glides home on a spring.
      await tap(ctl, rv, 2.2, 450); turns++; $("svg", rv).style.transform = `rotate(${-360 * turns}deg)`;
      Object.values(sliders).forEach((s2) => s2.glide(0, 800)); await ctl.wait(950);
      // Crop: the icon turns over in teal, the frame comes up and snaps to 16 : 9.
      await tap(ctl, b("crop"), 2.8, 520); b("crop").classList.add("on"); pop(b("crop")); win.classList.add("cropping"); await ctl.wait(450);
      shoot(470, 360, 1.3, 650); await ctl.wait(450);
      Object.assign(q(".crop-box").style, { left: "0px", top: "40px", width: "760px", height: "427px" }); await ctl.wait(700);
      Object.assign(q(".crop-box").style, { left: "60px", top: "74px", width: "640px", height: "360px" }); await ctl.wait(800);
      await tap(ctl, b("crop"), 2.8, 520); b("crop").classList.remove("on"); pop(b("crop")); win.classList.remove("cropping"); await ctl.wait(350);
      // Masks: the masquerade fills orange, a radial mask grows into the list, invert turns over.
      await tap(ctl, b("masks"), 2.8, 360); b("masks").classList.add("on"); pop(b("masks")); win.classList.add("masking"); await ctl.wait(400);
      shootAt(q(".pane.masks"), 2.0, 600); await ctl.wait(450);
      await cursorTo(ctl, q(".t-radial"), 360); await click(ctl); q(".t-radial").classList.add("on");
      const row = addRow("radial", "Radial 1", true); await ctl.wait(550);
      const inv = $(".inv", row); await cursorTo(ctl, inv, 360); await click(ctl); inv.classList.add("on"); pop(inv); restart(inv, "burst"); await ctl.wait(650);
      const eye = $(".eye", rows.children[0]); await cursorTo(ctl, eye, 360); await click(ctl); eye.classList.add("off"); rows.children[0].classList.add("off"); pop(eye); await ctl.wait(500);
      await click(ctl); eye.classList.remove("off"); rows.children[0].classList.remove("off"); pop(eye); await ctl.wait(400);
      await tap(ctl, b("masks"), 2.8, 520); b("masks").classList.remove("on"); pop(b("masks")); win.classList.remove("masking"); await ctl.wait(350);
      // Export: the bolt strikes, the panel opens, the bar charges and a small orange disc lands.
      await tap(ctl, b("bolt"), 2.8, 360); restart(b("bolt"), "strike", 500); restart(b("bolt"), "burst"); await ctl.wait(300);
      win.classList.add("exporting"); shootAt(q(".export"), 1.9, 600); await ctl.wait(500);
      await cursorTo(ctl, $$('.seg[data-k="fmt"] b', win)[1], 300); await click(ctl); setSeg(q('.seg[data-k="fmt"]'), 1); await ctl.wait(250);
      await cursorTo(ctl, $$('.seg[data-k="fmt"] b', win)[0], 280); await click(ctl); setSeg(q('.seg[data-k="fmt"]'), 0); await ctl.wait(250);
      await cursorTo(ctl, cap, 320); await click(ctl); restart(cap, "strike", 500);
      bar.style.transition = "width 1.3s cubic-bezier(0.4, 0, 0.2, 1)"; bar.style.width = "100%"; await ctl.wait(1350);
      done.classList.add("show"); await ctl.wait(1300);
      win.classList.remove("exporting"); wide(800); await ctl.wait(900);
    };
    whileVisible(film, async (ctl) => {
      for (;;) {
        veil.classList.add("show"); await ctl.wait(350); prepare(); await ctl.wait(120); veil.classList.remove("show");
        await take(ctl);
      }
    }, 0.3);
  }

  // ---------- Feature demos ----------
  const DEMOS = {
    sort(demo) {
      const items = [LIB[0], LIB[3], LIB[5], LIB[7], LIB[8], LIB[11]];
      const tools = el("div", "mini-tools", `<span class="chip sortc">${icon("sort")}<em>Date Taken</em></span><span class="chip filt">${icon("filter")}<em>All cameras</em></span>`);
      demo.appendChild(tools);
      const g = el("div", "mini-grid"); g.style.top = "42px"; demo.appendChild(g);
      const cells = items.map((it) => { const c = makeCell(it, { labels: false }); g.appendChild(c); return c; });
      const dateOrder = [3, 1, 5, 0, 4, 2], nameOrder = [0, 1, 2, 3, 4, 5], ricoh = [0, 4, 5];
      let order = dateOrder;
      const lay = () => layoutGrid(g, cells, order, { labels: false, minW: 80, gap: 8 });
      new ResizeObserver(lay).observe(g);
      const sortc = $(".sortc", tools), filt = $(".filt", tools);
      return async (ctl) => {
        for (;;) {
          order = dateOrder; lay(); sortc.classList.remove("on"); filt.classList.remove("on"); $("em", sortc).textContent = "Date Taken"; $("em", filt).textContent = "All cameras";
          await ctl.wait(1300);
          sortc.classList.add("on"); $("em", sortc).textContent = "Name"; order = nameOrder; lay(); await ctl.wait(1500); sortc.classList.remove("on");
          filt.classList.add("on"); $("em", filt).textContent = "Ricoh GR III"; order = ricoh; lay(); await ctl.wait(1800);
        }
      };
    },
    fav(demo) {
      const items = [LIB[1], LIB[2], LIB[4], LIB[6], LIB[9], LIB[13]];
      const tools = el("div", "mini-tools", `<span class="chip favc">${icon("heart-fill")}<em>Favorites 0</em></span>`); demo.appendChild(tools);
      const g = el("div", "mini-grid"); g.style.top = "42px"; demo.appendChild(g);
      const cells = items.map((it) => { const c = makeCell(it, { labels: false }); g.appendChild(c); return c; });
      const lay = () => layoutGrid(g, cells, [0, 1, 2, 3, 4, 5], { labels: false, minW: 80, gap: 8 });
      new ResizeObserver(lay).observe(g);
      const big = el("div", "heart-big", `<svg viewBox="0 0 24 24" width="56" height="56"><use href="#i-heart-fill"/></svg>`); demo.appendChild(big);
      const favc = $(".favc", tools);
      return async (ctl) => {
        for (;;) {
          cells.forEach((c) => c.classList.remove("fav", "sel")); $("em", favc).textContent = "Favorites 0"; favc.classList.remove("on");
          await ctl.wait(900);
          let n = 0;
          for (const k of [1, 4, 2]) {
            cells.forEach((c) => c.classList.remove("sel")); cells[k].classList.add("sel"); await ctl.wait(450);
            const dr = demo.getBoundingClientRect(), cr = cells[k].firstChild.getBoundingClientRect();
            big.style.left = cr.left - dr.left + cr.width / 2 + "px"; big.style.top = cr.top - dr.top + cr.height / 2 + "px";
            big.classList.remove("beat"); void big.offsetWidth; big.classList.add("beat");
            await ctl.wait(380); cells[k].classList.add("fav"); n++; $("em", favc).textContent = `Favorites ${n}`; favc.classList.add("on");
            await ctl.wait(700);
          }
          cells.forEach((c) => c.classList.remove("sel")); await ctl.wait(1600);
        }
      };
    },
    paste(demo) {
      const look = { exposure: 0.15, contrast: 22, temperature: 30, highlights: -35, shadows: 30, saturation: -12, vibrance: 30, vignette: -30 };
      const items = [LIB[12], LIB[4], LIB[10], LIB[2], LIB[14], LIB[5]];
      const tools = el("div", "mini-tools", `<span class="chip copyc">${icon("copy")}<em>Copy</em></span><span class="chip pastec">${icon("paste")}<em>Paste</em></span>`); demo.appendChild(tools);
      const g = el("div", "mini-grid"); g.style.top = "42px"; demo.appendChild(g);
      const cells = items.map((it) => { const c = makeCell(it, { labels: false, edited: look }); g.appendChild(c); return c; });
      const lay = () => layoutGrid(g, cells, [0, 1, 2, 3, 4, 5], { labels: false, minW: 80, gap: 8 });
      new ResizeObserver(lay).observe(g);
      const copyc = $(".copyc", tools), pastec = $(".pastec", tools);
      return async (ctl) => {
        for (;;) {
          cells.forEach((c) => c.classList.remove("edited", "pasted", "sel")); copyc.className = "chip copyc"; pastec.className = "chip pastec";
          $("em", copyc).textContent = "Copy"; $("em", pastec).textContent = "Paste";
          cells[0].classList.add("sel"); await ctl.wait(700);
          cells[0].classList.add("edited"); await ctl.wait(1100);
          copyc.classList.add("ok"); $("em", copyc).textContent = "Copied"; await ctl.wait(800);
          cells[0].classList.remove("sel"); for (const k of [1, 2, 3, 4, 5]) { cells[k].classList.add("sel"); await ctl.wait(140); }
          await ctl.wait(400); pastec.classList.add("on"); await ctl.wait(300);
          for (const k of [1, 2, 3, 4, 5]) { cells[k].classList.add("edited", "pasted"); await ctl.wait(160); }
          pastec.classList.remove("on"); pastec.classList.add("ok"); $("em", pastec).textContent = "Pasted to 5"; await ctl.wait(2200);
        }
      };
    },
    mask(demo) {
      const wrap = el("div", "mask-demo"); demo.appendChild(wrap);
      const c = document.createElement("canvas"); wrap.appendChild(c);
      const dev = Photos.developer(Photos.paint("lake", 420, 280), c);
      const ring = el("div", "mask-ring"); wrap.appendChild(ring);
      const overlay = el("div", "mask-tint"); wrap.appendChild(overlay);
      const chip = el("span", "chip crop-label", `${icon("mask")}<em>Radial · Exposure +0.0</em>`); demo.appendChild(chip);
      const place = (m) => {
        const wr = wrap.getBoundingClientRect(), cr = c.getBoundingClientRect(), r = m.r * cr.width;
        [ring, overlay].forEach((n) => { n.style.left = cr.left - wr.left + m.x * cr.width - r + "px"; n.style.top = cr.top - wr.top + m.y * cr.height - r + "px"; n.style.width = n.style.height = 2 * r + "px"; });
      };
      const animate = (from, to, ms, ctl) => new Promise((done, fail) => {
        const t0 = performance.now();
        const step = (now) => {
          if (!ctl.alive()) return fail(new Error("stop"));
          const k = Math.min((now - t0) / ms, 1), e = 1 - Math.pow(1 - k, 3);
          const m = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, r: from.r + (to.r - from.r) * e, exposure: from.exposure + (to.exposure - from.exposure) * e };
          dev.render({}, m, true); place(m); $("em", chip).textContent = `Radial · Exposure ${m.exposure >= 0 ? "+" : "−"}${Math.abs(m.exposure).toFixed(1)}`;
          if (k < 1) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });
      const a = { x: 0.3, y: 0.62, r: 0.26, exposure: 0 }, b = { ...a, exposure: 1.1 }, c2 = { x: 0.68, y: 0.4, r: 0.2, exposure: 1.1 }, d = { ...c2, exposure: -0.9 };
      new ResizeObserver(() => place(a)).observe(wrap);
      return async (ctl) => {
        for (;;) {
          dev.render({}, a, true); place(a); await ctl.wait(700);
          overlay.style.opacity = 1; await ctl.wait(900); overlay.style.opacity = 0; await ctl.wait(400);
          await animate(a, b, 900, ctl); await ctl.wait(800);
          await animate(b, c2, 1100, ctl); await ctl.wait(400);
          await animate(c2, d, 900, ctl); await ctl.wait(1100);
          await animate(d, a, 700, ctl); await ctl.wait(500);
        }
      };
    },
    crop(demo) {
      const wrap = el("div", "crop-demo"); demo.appendChild(wrap);
      const c = Photos.copy(Photos.paint("coast", 600, 400), 420, 280); c.style.transition = "transform 1.1s var(--ease)"; wrap.appendChild(c);
      const cb = el("div", "crop-box", "<i></i><i></i><i></i><i></i>"); wrap.appendChild(cb);
      const chip = el("span", "chip crop-label", `${icon("crop")}<em>Original</em>`); demo.appendChild(chip);
      const fit = (ar, scale = 1) => {
        const wr = wrap.getBoundingClientRect(), cr = c.getBoundingClientRect();
        let w = cr.width * scale, h = w / ar;
        if (h > cr.height * scale) { h = cr.height * scale; w = h * ar; }
        Object.assign(cb.style, { left: cr.left - wr.left + (cr.width - w) / 2 + "px", top: cr.top - wr.top + (cr.height - h) / 2 + "px", width: w + "px", height: h + "px" });
      };
      const set = (label, ar, scale, deg) => { $("em", chip).textContent = label; c.style.transform = deg ? `rotate(${deg}deg) scale(${1 + Math.abs(deg) * 0.025})` : ""; fit(ar, scale); };
      new ResizeObserver(() => fit(1.5)).observe(wrap);
      return async (ctl) => {
        for (;;) {
          set("Original", 1.5, 1, 0); await ctl.wait(1200);
          set("4 : 5", 0.8, 1, 0); await ctl.wait(1500);
          set("4 : 5 · Straighten 2.5°", 0.8, 0.94, 2.5); await ctl.wait(1700);
          set("16 : 9", 16 / 9, 0.96, 2.5); await ctl.wait(1500);
        }
      };
    },
    print(demo) {
      const wrap = el("div", "print-demo"); demo.appendChild(wrap);
      const stack = el("div", "print-stack"); wrap.appendChild(stack);
      const prints = [["hills", "03.10.26"], ["field", "21.09.26"], ["coast", "12.10.26"], ["snow", "28.12.25"]].map(([k, d]) => {
        const p = Photos.print(Photos.paint(k, 600, 400), { border: 0.05, date: d, width: 300, dateSize: 0.075 }); stack.appendChild(p); return p;
      });
      const chips = el("div", "mini-tools", `<span class="chip on">Border · White</span><span class="chip">Timestamp · DD.MM.YY</span>`); demo.appendChild(chips);
      const rot = [-7, 4, -2, 1.5];
      let top = 0;
      const arrange = () => prints.forEach((p, i) => {
        const depth = (i - top + prints.length) % prints.length;
        p.style.zIndex = prints.length - depth;
        p.style.transform = `translate(-50%, -50%) rotate(${rot[(i + top) % rot.length]}deg) translateY(${depth * 3}px)`;
        p.style.opacity = 1;
      });
      arrange();
      return async (ctl) => {
        for (;;) {
          await ctl.wait(1600);
          const p = prints[top];
          p.style.transform = "translate(10%, -120%) rotate(14deg)"; p.style.opacity = 0; await ctl.wait(600);
          top = (top + 1) % prints.length; arrange();
        }
      };
    },
  };

  function buildTiles() {
    $$(".tile").forEach((tile) => {
      const lazy = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        lazy.disconnect();
        const runner = whileVisible(tile, DEMOS[tile.dataset.demo]($(".demo", tile)), 0.3);
        tile.addEventListener("click", () => runner.restart());
      }, { rootMargin: "200px" });
      lazy.observe(tile);
    });
  }

  // ---------- Why: what the renewal adds up to, a scene per step ----------
  function buildSpend() {
    const root = $("#spend");
    if (!root) return;
    const STEPS = [[1, 150, "a night under the stars"], [2, 300, "a fast 50mm prime, and a polariser"], [3, 450, "two good used lenses, or a good used camera body"],
      [5, 750, "a new camera, like a Canon EOS R50"], [10, 1500, "a week abroad with your camera"]];
    const scenes = $$(".scene", root), sum = $(".spend-sum", root), years = $(".spend-years", root), what = $(".spend-what", root);
    const steps = $$(".spend-steps button", root), fill = $(".spend-fill", root);
    let shown = 0, value = STEPS[0][1], frame = 0;
    const dollars = (v) => "$" + Math.round(v).toLocaleString("en-US");
    const show = (i) => {
      shown = i;
      const [y, to, label] = STEPS[i];
      scenes.forEach((s, k) => s.classList.toggle("on", k === i));
      steps.forEach((b, k) => { b.classList.toggle("on", k === i); b.classList.toggle("past", k < i); });
      fill.style.width = (i / (STEPS.length - 1)) * 100 + "%";
      years.textContent = `${y} year${y > 1 ? "s" : ""} of Lightroom`;
      if (what.textContent !== label) { what.classList.add("swap"); what.textContent = label; void what.offsetWidth; what.classList.remove("swap"); }
      cancelAnimationFrame(frame);
      const from = value, t0 = performance.now(), ms = reduce ? 0 : 700;
      const tick = (t) => {
        const k = ms ? clamp((t - t0) / ms, 0, 1) : 1;
        value = from + (to - from) * (1 - Math.pow(1 - k, 3));
        sum.textContent = dollars(value);
        if (k < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    show(0);
    // Steps through on its own while visible; a click picks a step and carries on from there.
    const runner = whileVisible(root, async (ctl) => {
      if (reduce) return;
      for (;;) { await ctl.wait(3600); show((shown + 1) % STEPS.length); }
    }, 0.3);
    steps.forEach((b, k) => b.addEventListener("click", () => { show(k); runner.restart(); }));
  }

  // ---------- Made around you: the profile page, playing through a photographer's periods ----------
  function buildYou() {
    const film = $("#you-film"), caption = $("#you-caption");
    if (!film) return;
    const cam = el("div", "cam"); film.appendChild(cam);
    const fit = () => { cam.style.transform = `scale(${film.clientWidth / 1200})`; };
    // A tall stage, so the finished page fits in one frame.
    const STAGE_H = 1350;
    new ResizeObserver(fit).observe(film); fit();
    const svg = (d, fill) => `<svg viewBox="0 0 24 24"><path d="${d}" fill="${fill ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const G = {
      sunset: svg("M3 17h18M6 13.5a6 6 0 0 1 12 0M12 3v4M4.6 7.6l2 2M19.4 7.6l-2 2M9 20h6"),
      camera: svg("M4 8h3l1.5-2h7L17 8h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"),
      flame: svg("M12 21c-3.5 0-6-2.4-6-5.6 0-3.3 3-5 3.5-8.4 2.3 1.4 3 3.3 3 4.6 1-.6 1.6-1.8 1.6-3 2.4 1.7 3.9 4 3.9 6.8 0 3.2-2.5 5.6-6 5.6z", true),
      trophy: svg("M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"),
      spark: svg("M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", true),
      glass: svg("M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"),
    };
    const win = el("div", "window"); cam.appendChild(win);
    win.innerHTML = `
      <div class="titlebar"><div class="lights"><i></i><i></i><i></i></div><div class="tb-title">Your Profile</div></div>
      <div class="pf-scroll">
        <div class="pf-head"><div class="pf-avatar">${G.sunset}</div>
          <div><div class="pf-greet"></div><div class="pf-date"></div></div>
          </div>
        <div class="pf-tabs"><i></i>${["Today", "This week", "Last week", "This month", "This year", "All time"].map((t) => `<b>${t}</b>`).join("")}</div>
        <div class="pf-sum"></div>
        <div class="pf-tiles">
          <div class="pf-tile"><div class="lbl">${G.camera}Taken</div><div class="num" data-k="taken">0</div><div class="delta"></div></div>
          <div class="pf-tile"><div class="lbl">${icon("edited")}Edited</div><div class="num" data-k="edited">0</div><div class="delta"></div></div>
          <div class="pf-tile"><div class="lbl">${icon("bolt")}Exported</div><div class="num" data-k="exported">0</div><div class="delta"></div></div>
          <div class="pf-tile fav"><div class="lbl">${icon("heart-fill")}Favourites</div><div class="num" data-k="favs">0</div><div class="delta"></div><div class="pf-burst"></div></div>
        </div>
        <div class="pf-row">
          <div class="pf-panel"><h4>Cameras</h4><div class="insight" data-i="cam"></div><div class="pf-rank" data-r="cams"></div></div>
          <div class="pf-panel"><h4>Lenses</h4><div class="insight" data-i="lens"></div><div class="pf-rank" data-r="lenses"></div></div>
        </div>
        <div class="pf-row">
          <div class="pf-panel"><h4>Focal lengths</h4><div class="insight" data-i="focal"></div><div class="pf-fav"></div>
            <div class="pf-bands">${["Ultra-wide", "Wide", "Standard", "Portrait", "Telephoto"].map((b) => `<div><i></i><span>${b}</span></div>`).join("")}</div></div>
          <div class="pf-panel"><h4>Your signature settings</h4><div class="insight" data-i="sig"></div>
            <div class="pf-settings"><div><b data-s="f"></b><span>aperture</span></div><div><b data-s="t"></b><span>shutter</span></div><div><b data-s="iso"></b><span>typical ISO</span></div></div>
            <div class="pf-tags"></div></div>
        </div>
        <div class="pf-row" style="grid-template-columns: 1fr">
          <div class="pf-panel"><h4>When you shoot</h4><div class="insight" data-i="hours"></div>
            <div class="pf-hours">${"<i></i>".repeat(24)}</div><div class="pf-axis"><span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div></div>
        </div>
        <div class="pf-row" style="grid-template-columns: 1fr">
          <div class="pf-panel"><h4>Milestones</h4><div class="pf-miles">
            <div>${G.flame}<p style="margin:0"><b data-m="streak"></b><span>days in a row with an edit</span></p></div>
            <div>${G.spark}<p style="margin:0"><b data-m="big"></b><span>biggest day of shooting</span></p></div>
            <div>${G.glass}<p style="margin:0"><b data-m="since"></b><span>oldest photo in your library</span></p></div>
          </div></div>
        </div>
      </div>`;

    // Three chapters of one photographer's year; each changes the period, the greeting and the race.
    const hours = (peaks) => Array.from({ length: 24 }, (_, h) => peaks.reduce((v, [c, w, a]) => v + a * Math.exp(-((h - c) ** 2) / (2 * w * w)), 0));
    const CH = [
      { tab: 1, greet: "Good evening, Sam", date: "Thursday 22 October", sum: "42 photos taken this week, 18 edited, 12 exported.",
        n: { taken: 42, edited: 18, exported: 12, favs: 6 }, d: ["▲ 11 more than this point last week", "▲ 7 more than this point last week", "", "14% keepers"],
        cams: [["Sony ZV-E10", 24], ["RICOH GR III", 15], ["iPhone 15 Pro", 3]], camLine: "Your Sony ZV-E10 took 6 of every 10 photos.",
        lenses: [["Sigma 30mm F1.4 DC DN", 18], ["GR Lens 18.3mm F2.8", 15], ["E PZ 16-50mm", 6], ["iPhone 15 Pro", 3]], lensLine: "Your Sigma 30mm stays on the camera most.",
        bands: [0, 9, 22, 3, 0], fav: "45 mm", focalLine: "Around 50 mm: the honest normal lens.",
        set: ["ƒ/2", "1/250 s", "ISO 400"], sigLine: "Shallow focus, everyday shutter speeds and moderate ISO.",
        tags: ["Golden-hour chaser", "Prime lover", "Bokeh fan"], hours: hours([[18, 1.3, 9], [12, 1, 2]]), hourLine: "Golden hour: busiest around 18:00",
        miles: ["5 days", "17 photos on 19 October", "Shooting since 2019"] },
      { tab: 3, greet: "Good morning, Sam. Fresh light today?", date: "Saturday 31 October", sum: "186 photos taken this month, 74 edited, 51 exported. Your RICOH GR III did most of the work.",
        n: { taken: 186, edited: 74, exported: 51, favs: 19 }, d: ["▲ 52 more than this point last month", "▲ 31 more than this point last month", "▲ 20 more than this point last month", "10% keepers"],
        cams: [["RICOH GR III", 92], ["Sony ZV-E10", 81], ["iPhone 15 Pro", 13]], camLine: "Your RICOH GR III and Sony ZV-E10 share the work almost equally.",
        lenses: [["GR Lens 18.3mm F2.8", 92], ["Sigma 30mm F1.4 DC DN", 60], ["E PZ 16-50mm", 21], ["iPhone 15 Pro", 13]], lensLine: "Your GR lens stays on the camera most: 5 of every 10 photos.",
        bands: [2, 105, 62, 17, 0], fav: "28 mm", focalLine: "Around 28 mm: the classic street and travel view.",
        set: ["ƒ/2.8", "1/500 s", "ISO 200"], sigLine: "Shallow focus, a fast shutter that freezes the moment and low ISO in good light.",
        tags: ["Street & travel eye", "Early bird", "Prime lover", "Daylight shooter"], hours: hours([[7, 1.2, 8], [17, 1.5, 4]]), hourLine: "An early riser: busiest around 7:00",
        miles: ["11 days", "64 photos on 24 October", "Shooting since 2019"] },
      { tab: 4, greet: "Working late, Sam?", date: "Friday 27 November", sum: "1,240 photos taken this year, 520 edited, 310 exported. Your Sony ZV-E10 did most of the work.",
        n: { taken: 1240, edited: 520, exported: 310, favs: 96 }, d: ["▲ 240 more than this point last year", "▲ 180 more than this point last year", "▲ 95 more than this point last year", "8% keepers"],
        cams: [["Sony ZV-E10", 610], ["RICOH GR III", 540], ["iPhone 15 Pro", 90]], camLine: "Your Sony ZV-E10 leads, just.",
        lenses: [["GR Lens 18.3mm F2.8", 540], ["Sigma 30mm F1.4 DC DN", 410], ["E PZ 16-50mm", 200], ["iPhone 15 Pro", 90]], lensLine: "Your GR lens stays on the camera most: 4 of every 10 photos.",
        bands: [40, 610, 450, 140, 0], fav: "28 mm", focalLine: "Around 28 mm: the classic street and travel view.",
        set: ["ƒ/2.8", "1/250 s", "ISO 800"], sigLine: "Shallow focus, everyday shutter speeds and moderate ISO.",
        tags: ["RAW purist", "Street & travel eye", "Golden-hour chaser", "Prime lover", "Deliberate shooter", "Night owl"], hours: hours([[18, 1.6, 7], [8, 1.2, 3], [22, 1, 3]]), hourLine: "Golden hour: busiest around 18:00",
        miles: ["14 days", "212 photos on 14 June", "Shooting since 2019"] },
    ];

    const scroll = $(".pf-scroll", win), greet = $(".pf-greet", win), tabs = $$(".pf-tabs b", win), pill = $(".pf-tabs i", win);
    const nums = $$(".pf-tile .num", win), deltas = $$(".pf-tile .delta", win), burst = $(".pf-burst", win);
    const values = { taken: 0, edited: 0, exported: 0, favs: 0 };
    const fmt = (v) => Math.round(v).toLocaleString("en-US");
    const say = (t) => { caption.style.opacity = 0; setTimeout(() => { caption.textContent = t; caption.style.opacity = 1; }, 250); };
    const tab = (i) => { tabs.forEach((b, k) => b.classList.toggle("on", k === i)); pill.style.left = tabs[i].offsetLeft + "px"; pill.style.width = tabs[i].offsetWidth + "px"; };
    const count = (k, to, ms = 1100) => {
      const node = nums.find((n) => n.dataset.k === k), from = values[k], t0 = performance.now();
      values[k] = to;
      const step = (t) => { const p = reduce ? 1 : clamp((t - t0) / ms, 0, 1); node.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    const hearts = () => {
      burst.innerHTML = "";
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 - Math.PI / 2, r = 34 + (i % 3) * 10;
        const h = document.createElementNS("http://www.w3.org/2000/svg", "svg"); h.innerHTML = '<use href="#i-heart-fill"/>';
        h.style.setProperty("--dx", `${Math.cos(a) * r}px`); h.style.setProperty("--dy", `${Math.sin(a) * r}px`); h.style.animationDelay = `${i * 25}ms`;
        burst.appendChild(h);
      }
    };
    const rank = (box, items) => {
      // Rows keep their element per name, so a new order slides them past each other.
      const max = Math.max(...items.map((x) => x[1]), 1), total = items.reduce((a, x) => a + x[1], 0);
      const seen = new Set();
      items.forEach(([name, n], i) => {
        let row = $$(".r", box).find((r) => r.dataset.n === name);
        if (!row) {
          row = el("div", "r"); row.dataset.n = name;
          row.innerHTML = `<div class="top"><span class="star">★</span><span class="nm">${name}</span><span class="ct"></span></div><div class="track"><div class="fill"></div></div>`;
          row.style.top = `${items.length * 46}px`; box.appendChild(row);
          void row.offsetTop;  // new rows rise from below the list
        }
        seen.add(name);
        row.style.top = `${i * 46}px`;
        $(".fill", row).style.width = `${(n / max) * 100}%`;
        $(".ct", row).textContent = `${fmt(n)} · ${Math.round((n / total) * 100)}%`;
        row.classList.toggle("first", i === 0);
      });
      $$(".r", box).forEach((r) => { if (!seen.has(r.dataset.n)) r.remove(); });
      box.style.height = `${items.length * 46}px`;
    };
    const insight = (key, text) => { const n = $(`[data-i="${key}"]`, win); n.style.opacity = 0; setTimeout(() => { n.textContent = text; n.style.opacity = 1; }, 220); };
    const typeGreeting = async (ctl, text) => {
      greet.innerHTML = '<span></span><i class="caret"></i>';
      const span = greet.firstChild;
      for (let i = 1; i <= text.length; i++) { span.textContent = text.slice(0, i); await ctl.wait(reduce ? 0 : 38); }
      await ctl.wait(500); greet.querySelector(".caret")?.remove();
    };
    // The camera: the page moves and scales inside the window to frame one thing at a time.
    // Positions are the page's own (offsets ignore transforms), so framing never drifts.
    const VIEW_W = 1200, VIEW_H = STAGE_H - 40;
    const at = (node) => { let x = 0, y = 0; for (let n = node; n && n !== scroll; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return { x, y, w: node.offsetWidth, h: node.offsetHeight }; };
    const frame = (node, { pad = 26, max = 2.4, ms = 750 } = {}) => {
      const r = at(node);
      const k = Math.min(VIEW_W / (r.w + pad * 2), VIEW_H / (r.h + pad * 2), max);
      // Centred on the thing, but never past the page's own edges (no blank above the header).
      const tx = Math.min(0, Math.max(VIEW_W - scroll.offsetWidth * k, VIEW_W / 2 - (r.x + r.w / 2) * k));
      const ty = Math.min(0, Math.max(VIEW_H - scroll.offsetHeight * k, VIEW_H / 2 - (r.y + r.h / 2) * k));
      scroll.style.transition = `transform ${reduce ? 0 : ms}ms cubic-bezier(0.65, 0, 0.35, 1)`;
      scroll.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    };
    // The whole page, scaled to fit and centred: the last frame shows every section.
    const wide = (ms = 900) => {
      const k = Math.min(1, VIEW_W / scroll.offsetWidth, VIEW_H / scroll.offsetHeight);
      const tx = (VIEW_W - scroll.offsetWidth * k) / 2, ty = (VIEW_H - scroll.offsetHeight * k) / 2;
      scroll.style.transition = `transform ${reduce ? 0 : ms}ms cubic-bezier(0.65, 0, 0.35, 1)`;
      scroll.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    };
    // A race through the year: rankings by month, places swapping, then the year's order settles.
    const race = async (ctl, box, months, final) => {
      for (const standings of months) { rank(box, standings); await ctl.wait(650); }
      rank(box, final);
    };
    scroll.style.transformOrigin = "0 0";
    const q = (sel) => $(sel, win);
    const tiles = $$(".pf-tile", win), panels = $$(".pf-panel", win);

    // Before a run: an empty page, so every figure climbs from nothing.
    const reset = () => {
      Object.keys(values).forEach((k) => { values[k] = 0; });
      nums.forEach((n) => { n.textContent = "0"; }); deltas.forEach((d) => { d.textContent = ""; });
      tabs.forEach((b) => b.classList.remove("on")); pill.style.width = "0px";
      $(".pf-sum", win).textContent = ""; greet.textContent = "";
      $$(".pf-rank", win).forEach((r) => { r.innerHTML = ""; r.style.height = "0px"; });
      $$("[data-i]", win).forEach((n) => { n.textContent = ""; });
      $$(".pf-bands i", win).forEach((b) => { b.style.height = "3px"; b.classList.remove("top"); });
      $(".pf-fav", win).textContent = ""; $(".pf-tags", win).innerHTML = "";
      ["f", "t", "iso"].forEach((k) => { $(`[data-s="${k}"]`, win).textContent = ""; });
      $$(".pf-hours i", win).forEach((b) => { b.style.height = "2px"; });
      ["streak", "big", "since"].forEach((k) => { $(`[data-m="${k}"]`, win).textContent = ""; });
    };

    // One take, played once: the year so far. Then the page stays, finished, as the app shows it.
    const ch = CH[2];
    const months = {
      cams: [
        [["RICOH GR III", 40], ["iPhone 15 Pro", 14], ["Sony ZV-E10", 12]],
        [["Sony ZV-E10", 130], ["RICOH GR III", 118], ["iPhone 15 Pro", 30]],
        [["RICOH GR III", 262], ["Sony ZV-E10", 240], ["iPhone 15 Pro", 45]],
        [["Sony ZV-E10", 410], ["RICOH GR III", 380], ["iPhone 15 Pro", 62]],
        [["RICOH GR III", 505], ["Sony ZV-E10", 492], ["iPhone 15 Pro", 80]],
      ],
      lenses: [
        [["GR Lens 18.3mm F2.8", 40], ["iPhone 15 Pro", 14], ["E PZ 16-50mm", 8], ["Sigma 30mm F1.4 DC DN", 4]],
        [["GR Lens 18.3mm F2.8", 118], ["Sigma 30mm F1.4 DC DN", 96], ["E PZ 16-50mm", 34], ["iPhone 15 Pro", 30]],
        [["Sigma 30mm F1.4 DC DN", 230], ["GR Lens 18.3mm F2.8", 262], ["E PZ 16-50mm", 70], ["iPhone 15 Pro", 45]].sort((a, b) => b[1] - a[1]),
        [["Sigma 30mm F1.4 DC DN", 330], ["GR Lens 18.3mm F2.8", 380], ["E PZ 16-50mm", 140], ["iPhone 15 Pro", 62]].sort((a, b) => b[1] - a[1]),
        [["E PZ 16-50mm", 190], ["Sigma 30mm F1.4 DC DN", 395], ["GR Lens 18.3mm F2.8", 505], ["iPhone 15 Pro", 80]].sort((a, b) => b[1] - a[1]),
      ],
    };
    let played = false;
    whileVisible(film, async (ctl) => {
      if (played) return;
      reset();
      $(".pf-date", win).textContent = `${ch.date} · with RAWdemption since 2 March 2024`;
      frame(q(".pf-head"), { max: 1.7, ms: 0 });
      say("A year of photography, read back to you.");
      await ctl.wait(400);
      await typeGreeting(ctl, "Good evening, Sam");
      // Into the dates: the highlight races across them and lands on the year.
      frame(q(".pf-tabs"), { max: 2.2, ms: 600 });
      await ctl.wait(520);
      for (const i of [0, 1, 2, 3, 4]) { tab(i); await ctl.wait(i === 4 ? 0 : 150); }
      $(".pf-sum", win).textContent = ch.sum;
      await ctl.wait(300);
      // Each figure in turn, counting up as the camera arrives.
      say("Every photo you take, edit, export and love.");
      for (const [i, k] of ["taken", "edited", "exported", "favs"].entries()) {
        frame(tiles[i], { max: 2.6, pad: 18, ms: 520 });
        await ctl.wait(280);
        count(k, ch.n[k], 900);
        setTimeout(() => { deltas[i].textContent = ch.d[i]; deltas[i].style.color = i === 3 ? "var(--w-text-2)" : ""; }, 700);
        if (k === "favs") { await ctl.wait(520); hearts(); await ctl.wait(450); }
        await ctl.wait(700);
      }
      frame(q(".pf-tiles"), { max: 1.6, ms: 600 });
      await ctl.wait(650);
      // The race: spring's leader is overtaken by the year's.
      say("Your cameras and lenses, and the lead changing hands.");
      frame(panels[0], { max: 1.9, ms: 650 });
      await ctl.wait(300);
      await race(ctl, $('[data-r="cams"]', win), months.cams, ch.cams);
      insight("cam", ch.camLine);
      await ctl.wait(1500);
      frame(panels[1], { max: 1.9, ms: 600 });
      await ctl.wait(300);
      await race(ctl, $('[data-r="lenses"]', win), months.lenses, ch.lenses);
      insight("lens", ch.lensLine);
      await ctl.wait(1500);
      // What you see, and how you expose it.
      say("Your style, read from the settings you choose.");
      frame(panels[2], { max: 1.9, ms: 650 });
      const bmax = Math.max(...ch.bands, 1), btop = ch.bands.indexOf(bmax);
      $$(".pf-bands i", win).forEach((b, i) => { b.style.height = `${Math.max(3, (ch.bands[i] / bmax) * 70)}px`; b.classList.toggle("top", i === btop); });
      $(".pf-fav", win).innerHTML = `${ch.fav}<small>your favourite focal length</small>`;
      insight("focal", ch.focalLine);
      await ctl.wait(2600);
      frame(panels[3], { max: 1.9, ms: 600 });
      insight("sig", ch.sigLine);
      ["f", "t", "iso"].forEach((k, i) => { $(`[data-s="${k}"]`, win).textContent = ch.set[i]; });
      await ctl.wait(1200);
      for (const t of ch.tags) { $(".pf-tags", win).appendChild(el("span", "", t)); await ctl.wait(380); }
      await ctl.wait(1800);
      // The light you chase.
      say("When you shoot, hour by hour.");
      frame(panels[4], { max: 1.6, ms: 700 });
      insight("hours", ch.hourLine);
      const hmax = Math.max(...ch.hours);
      $$(".pf-hours i", win).forEach((b, h) => {
        b.style.height = `${Math.max(2, (ch.hours[h] / hmax) * 68)}px`;
        b.style.background = ch.hours[h] === hmax ? "var(--brand)" : h >= 5 && h < 9 ? "#f2b65a" : h >= 17 && h < 21 ? "#e8834d" : h >= 9 && h < 17 ? "var(--w-text-3)" : "#6a70c0";
      });
      await ctl.wait(2400);
      frame(panels[5], { max: 1.8, ms: 650 });
      ["streak", "big", "since"].forEach((k, i) => { $(`[data-m="${k}"]`, win).textContent = ch.miles[i]; });
      await ctl.wait(2200);
      // The whole page, finished: it stays like this.
      say("All of it from your own photos, on your Mac.");
      wide(1100);
      played = true;
    }, 0.3);
  }

  buildFilm();
  buildFeel();
  buildTiles();
  buildSpend();
  buildYou();

  // ---------- Install: one way shown at a time ----------
  const ways = $$(".ways [role=tab]");
  ways.forEach((tab) => tab.addEventListener("click", () => {
    ways.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
  }));

  // ---------- Install: copy the command ----------
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    const code = $(b.dataset.copy);
    try { await navigator.clipboard.writeText(code.textContent.trim()); }
    catch (e) { const r = document.createRange(); r.selectNodeContents(code); getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand("copy"); }
    b.textContent = "Copied"; b.classList.add("done-copy");
    setTimeout(() => { b.textContent = "Copy"; b.classList.remove("done-copy"); }, 1600);
  }));
})();
