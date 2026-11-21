// Section fades: each block rises once as it comes into view.
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Entry: a noisy sensor trace settles to a calibrated 22.4 °C / 48.2 %, then the screen wipes up
// and the hero rises. Plays once per tab (the head script decides); click or any key skips it.
{
  const html = document.documentElement, intro = document.querySelector(".intro");
  if (intro && html.classList.contains("intro-play") && !html.classList.contains("intro-done")) {
    try { sessionStorage.setItem("intro-seen", "1"); } catch {}
    const line = intro.querySelector(".intro__line");
    const temp = intro.querySelector("[data-intro-temp]"), hum = intro.querySelector("[data-intro-hum]");
    const SETTLE = 1500, N = 90, seeds = Array.from({ length: N }, () => Math.random() * 2 - 1);
    let t0 = null, over = false, hold;
    const frame = (now) => {
      if (over) return;
      t0 ??= now;
      const t = Math.min(1, (now - t0) / SETTLE), settled = 1 - (1 - t) ** 3, noise = 1 - settled;
      line.setAttribute("points", seeds.map((seed, i) =>
        `${((i / (N - 1)) * 1000).toFixed(1)},${(100 + noise * (seed * 70 + Math.sin(i * 0.45 + now / 90) * 25 * (Math.random() + 0.3))).toFixed(1)}`).join(" "));
      temp.textContent = (22.4 * settled + noise * (Math.random() * 8 - 4)).toFixed(1);
      hum.textContent = (48.2 * settled + noise * (Math.random() * 12 - 6)).toFixed(1);
      if (t < 1) requestAnimationFrame(frame); else lock();
    };
    const lock = () => {
      intro.classList.add("is-locked");
      intro.querySelector(".intro__state").textContent = "Calibrated";
      line.setAttribute("points", "0,100 1000,100");
      temp.textContent = "22.4"; hum.textContent = "48.2";
      hold = setTimeout(leave, 450);
    };
    const leave = () => {
      if (over) return;
      over = true; clearTimeout(hold); removeEventListener("keydown", leave);
      intro.classList.add("is-leaving");
      html.classList.add("intro-out");
      intro.addEventListener("animationend", () => html.classList.add("intro-done"), { once: true });
    };
    intro.addEventListener("click", leave);
    addEventListener("keydown", leave);
    requestAnimationFrame(frame);
  }
}

// Reading meter across the top, and a cyan scan line that sweeps each picture once as it arrives.
if (!still) {
  const meter = Object.assign(document.createElement("div"), { className: "scroll-meter" });
  meter.setAttribute("aria-hidden", "true");
  document.body.append(meter);
  let queued = false;
  const read = () => { queued = false; const max = document.documentElement.scrollHeight - innerHeight;
    meter.style.setProperty("--read", max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0); };
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(read); } }, { passive: true });
  addEventListener("resize", read); read();

  const hosts = document.querySelectorAll("main > section:not(.hero) :is(.app, .frame, .skills-panel)");
  const seen = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-scanned"); seen.unobserve(e.target); } }), { threshold: 0.35 });
  hosts.forEach((el) => { const l = document.createElement("i"); l.className = "scan-line"; l.setAttribute("aria-hidden", "true");
    el.classList.add("scan-host"); el.append(l); seen.observe(el); });
}

if (!still) {
  // each block rises once as it comes into view
  const items = document.querySelectorAll("main > section:not(.hero):not([data-moment]) .wrap > *, .closing__cta");
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  items.forEach((el, i) => { el.classList.add("rise"); el.style.setProperty("--i", i % 3); io.observe(el); });

}


// The glow and the dot field. Where the cursor or a finger goes the glow appears and the dots are pushed
// out of its way (like pepper on water from a soapy finger), then drift back.
// Reduced motion: the dots are drawn once, still.
{
  const root = document.documentElement;
  const cv = Object.assign(document.createElement("canvas"), { className: "bg-dots" });
  cv.setAttribute("aria-hidden", "true");
  document.body.prepend(cv);
  const ctx = cv.getContext("2d");
  // phones (small screen or touch) get a gentler version: F scales the push, the ripple and the light
  const phone = matchMedia("(max-width: 639px), (pointer: coarse)").matches, F = phone ? 0.6 : 1;
  const GAP = 44, R = phone ? 120 : 150, PUSH = 46 * F;
  let W = 0, H = 0, dots = [], colour = "#00e5ff";
  const readColour = () => { colour = getComputedStyle(root).getPropertyValue("--p-accent").trim() || colour; };
  const layout = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = [];
    for (let y = GAP / 2; y < H; y += GAP) for (let x = GAP / 2; x < W; x += GAP) dots.push({ x0: x, y0: y, x, y });
  };
  // pointer: eased glow position (in %) and the push centre (in px); off when the finger lifts
  let tx = 50, ty = 50, gx = 50, gy = 50, px = -1e4, py = -1e4, on = false;
  const point = (e) => { tx = (e.clientX / W) * 100; ty = (e.clientY / H) * 100; px = e.clientX; py = e.clientY; on = true; };
  addEventListener("pointermove", point, { passive: true });
  // each click or tap sends out a ring that spreads over ~1 s and nudges the dots as it passes
  let rings = [];
  const RING_T = 60, RING_R = 260;
  addEventListener("pointerdown", (e) => { point(e); if (!still) rings.push({ x: e.clientX, y: e.clientY, t: 0 }); }, { passive: true });
  const off = (e) => { if (e.pointerType !== "mouse") { on = false; tx = 50; ty = 50; } };
  addEventListener("pointerup", off); addEventListener("pointercancel", off);
  document.addEventListener("mouseleave", () => { on = false; });

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (const r of rings) {
      r.t++; r.rad = 12 + (r.t / RING_T) * RING_R;
      ctx.strokeStyle = colour; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 * F * (1 - r.t / RING_T);
      ctx.beginPath(); ctx.arc(r.x, r.y, r.rad, 0, Math.PI * 2); ctx.stroke();
    }
    rings = rings.filter((r) => r.t < RING_T);
    ctx.fillStyle = colour;
    for (const d of dots) {
      let txp = d.x0, typ = d.y0, near = 0;
      if (on) {
        const dx = d.x0 - px, dy = d.y0 - py, dist = Math.hypot(dx, dy) || 1;
        if (dist < R) { near = 1 - dist / R; const k = near * near * PUSH; txp += (dx / dist) * k; typ += (dy / dist) * k; }
      }
      for (const r of rings) {
        const dx = d.x0 - r.x, dy = d.y0 - r.y, dist = Math.hypot(dx, dy) || 1;
        const w = Math.max(0, 1 - Math.abs(dist - r.rad) / 24);
        if (w) { txp += (dx / dist) * w * 14 * F; typ += (dy / dist) * w * 14 * F; near = Math.max(near, w * 0.8); }
      }
      d.x += (txp - d.x) * 0.12; d.y += (typ - d.y) * 0.12;
      ctx.globalAlpha = Math.min(1, 0.13 + 0.5 * F * near);
      ctx.beginPath(); ctx.arc(d.x, d.y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  const frame = (t) => {
    gx += (tx - gx) * 0.08; gy += (ty - gy) * 0.08;
    root.style.setProperty("--mx", `${gx}%`); root.style.setProperty("--my", `${gy}%`);
    draw();
    requestAnimationFrame(frame);
  };
  readColour(); layout();
  new MutationObserver(() => { readColour(); if (still) draw(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  addEventListener("resize", () => { layout(); if (still) draw(); });
  if (still) draw(); else requestAnimationFrame(frame);
}

// Hero screen: a neural network of glowing particles. Signals fire from the inputs through two hidden
// layers to the outputs, which flare as they arrive. Pauses off screen and in a hidden tab; reduced
// motion draws one still frame.
{
  const screen = document.querySelector(".screen"), cv = screen?.querySelector(".screen__fx"), box = screen?.querySelector(".screen__net");
  if (cv && box) {
    const ctx = cv.getContext("2d");
    const small = matchMedia("(max-width: 639px), (pointer: coarse)").matches, K = small ? 0.55 : 1;
    // a soft round sprite per colour, drawn with additive blending for the glow
    const sprite = (core, edge) => {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, core); r.addColorStop(0.25, edge); r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c;
    };
    const CYAN = sprite("rgba(230,255,255,1)", "rgba(0,229,255,.55)"), ICE = sprite("rgba(255,255,255,.9)", "rgba(138,244,255,.35)");
    const rnd = (a, b) => a + Math.random() * (b - a), gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

    // the network: layer sizes, nodes (each a small swarm of particles), and weighted edges between layers
    const SIZES = small ? [3, 5, 5, 2] : [4, 6, 6, 3];
    const layers = SIZES.map((n) => Array.from({ length: n }, () => ({ x: 0, y: 0, act: 0,
      swarm: Array.from({ length: Math.round(14 * K) }, () => ({ a: rnd(0, 6.28), r: rnd(5, 15), sp: rnd(-1.2, 1.2), s: rnd(0.8, 2) })) })));
    const edges = [];
    layers.forEach((layer, l) => { if (l < layers.length - 1) layer.forEach((from) => layers[l + 1].forEach((to) => edges.push({ from, to, w: Math.random() }))); });
    const signals = [];
    // fire: a signal leaves a node along its two or three strongest outgoing edges
    const fire = (node, l) => {
      node.act = 1;
      if (l === layers.length - 1) return;
      edges.filter((e) => e.from === node).sort((a, b) => b.w - a.w + rnd(-0.4, 0.4)).slice(0, small ? 2 : 3)
        .forEach((e) => signals.push({ e, l: l + 1, t: 0, v: rnd(0.012, 0.02) }));
    };

    const dust = Array.from({ length: Math.round(34 * K) }, () => ({ x: Math.random(), y: Math.random(), s: rnd(6, 28), a: rnd(0.04, 0.16), vx: rnd(-0.004, 0.004), vy: rnd(-0.006, -0.001) }));
    let W = 0, H = 0;
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2), b = screen.getBoundingClientRect(), r = box.getBoundingClientRect();
      W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const left = r.left - b.left, top = r.top - b.top, padX = Math.min(40, r.width * 0.1);
      const gap = Math.min(52, (r.height * 0.86) / (Math.max(...SIZES) - 1));
      layers.forEach((layer, l) => layer.forEach((n, i) => {
        n.x = left + padX + (l / (layers.length - 1)) * (r.width - 2 * padX);
        n.y = top + r.height / 2 + (i - (layer.length - 1) / 2) * gap;
      }));
    };
    const dot = (img, x, y, s, a) => { ctx.globalAlpha = a; ctx.drawImage(img, x - s * 2, y - s * 2, s * 4, s * 4); };
    let last = 0, nextFire = 0;
    const draw = (time) => {
      const dt = Math.min(0.05, time - last || 0.016); last = time;
      if (!still && time > nextFire) { nextFire = time + rnd(0.35, 0.8); fire(layers[0][Math.floor(Math.random() * layers[0].length)], 0); }
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const d of dust) { d.x = (d.x + d.vx * dt + 1) % 1; d.y = (d.y + d.vy * dt + 1) % 1; dot(ICE, d.x * W, d.y * H, d.s, d.a); }
      // edges: faint lines, brighter while a signal runs along them
      ctx.globalCompositeOperation = "source-over"; ctx.lineWidth = 1;
      for (const e of edges) {
        ctx.globalAlpha = 0.05 + 0.1 * e.w + 0.35 * Math.max(e.from.act, e.to.act) * e.w;
        ctx.strokeStyle = "#00e5ff"; ctx.beginPath(); ctx.moveTo(e.from.x, e.from.y); ctx.lineTo(e.to.x, e.to.y); ctx.stroke();
      }
      ctx.globalCompositeOperation = "lighter";
      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i]; s.t += s.v * dt * 60;
        if (s.t >= 1) { signals.splice(i, 1); if (s.e.to.act < 0.6) fire(s.e.to, s.l); else s.e.to.act = 1; continue; }
        for (let k = 0; k < 4; k++) {   // a bright head with a short fading tail
          const t = Math.max(0, s.t - k * 0.035);
          dot(k ? ICE : CYAN, s.e.from.x + (s.e.to.x - s.e.from.x) * t, s.e.from.y + (s.e.to.y - s.e.from.y) * t, 3.4 - k * 0.7, 0.9 - k * 0.2);
        }
      }
      // nodes: a core that flares when it fires, inside a slowly orbiting swarm of particles
      for (const layer of layers) for (const n of layer) {
        n.act *= Math.pow(0.12, dt);
        dot(CYAN, n.x, n.y, 4 + n.act * 9, 0.35 + 0.6 * n.act);
        for (const p of n.swarm) {
          const a = p.a + time * p.sp, r = p.r * (1 + n.act * 0.5);
          dot(ICE, n.x + Math.cos(a) * r, n.y + Math.sin(a) * r * 0.85, p.s, 0.25 + 0.5 * n.act);
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    };
    let on = true, raf = 0;
    const loop = (ms) => { draw(ms / 1000); raf = on ? requestAnimationFrame(loop) : 0; };
    const run = (go) => { on = go; if (go && !raf) raf = requestAnimationFrame(loop); };
    size();
    new ResizeObserver(() => { size(); if (still) draw(2); }).observe(screen);
    if (still) { layers.forEach((l) => l.forEach((n) => (n.act = Math.random() * 0.6))); draw(2); }
    else {
      let seen = true;
      new IntersectionObserver(([e]) => { seen = e.isIntersecting; run(seen && !document.hidden); }).observe(screen);
      document.addEventListener("visibilitychange", () => run(seen && !document.hidden));
    }
  }
}

// Projects wheel, like a phone's alarm picker: native scroll with snapping does the moving; each row is
// tilted by its distance from the centre so the list reads as a drum, and the list loops (a copy of the
// rows sits above and below; when the wheel settles in a copy it jumps silently to the same row in the
// middle set). Tapping a row rolls it to the centre; tapping the centred row opens it. Up/down arrows
// move one row. It spins in once on load, like alarm digits rolling into place.
{
  const list = document.querySelector(".picker__list");
  if (list) {
    const originals = [...list.children], N = originals.length;
    const copy = () => originals.map((li) => { const c = li.cloneNode(true); c.setAttribute("aria-hidden", "true"); c.querySelector("a").tabIndex = -1; return c; });
    list.prepend(...copy()); list.append(...copy());
    const rows = [...list.querySelectorAll(".picker__item")];   // 3N rows; the real ones are N .. 2N-1
    const rowH = () => rows[0].parentElement.offsetHeight;
    const topFor = (i) => i * rowH();   // the list's padding centres row i at scrollTop = i * row height
    let current = -1, queued = false, spinning = false, settle;
    const paint = () => {
      queued = false;
      const mid = list.scrollTop / rowH();
      rows.forEach((row, i) => {
        const d = i - mid, ad = Math.min(Math.abs(d), 3);
        if (Math.abs(d) > 4) { row.style.opacity = "0"; return; }
        row.style.transform = `perspective(700px) rotateX(${Math.max(-75, Math.min(75, -d * 24))}deg) scale(${1 - ad * 0.06})`;
        row.style.opacity = String(Math.max(0, 1 - ad * 0.32));
      });
      const now = Math.round(mid);
      if (now !== current) { rows[current]?.classList.remove("is-on"); rows[now]?.classList.add("is-on"); current = now; }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
    // once the wheel rests in a copy, jump to the same row in the middle set (same picture, so unseen)
    const recentre = () => {
      if (spinning) return;
      const i = Math.round(list.scrollTop / rowH());
      if (i < N || i >= 2 * N) { list.scrollTop = topFor(N + (((i % N) + N) % N)); paint(); }
    };
    list.addEventListener("scroll", () => { queue(); clearTimeout(settle); settle = setTimeout(recentre, 160); }, { passive: true });
    addEventListener("resize", () => { list.scrollTop = topFor(N + (((current % N) + N) % N)); queue(); });
    const go = (i) => list.scrollTo({ top: topFor(i), behavior: still ? "auto" : "smooth" });
    rows.forEach((row, i) => {
      row.addEventListener("click", (e) => { if (i !== current) { e.preventDefault(); go(i); } });
      row.addEventListener("focus", () => { if (i !== current) go(i); });
      row.addEventListener("keydown", (e) => {
        const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = current + step;   // roll one row, then hand focus to the real row it shows
        go(next);
        rows[N + (((next % N) + N) % N)].focus({ preventScroll: true });
      });
    });
    list.scrollTop = topFor(N); paint();
    // the spin-in: roll down through the copies and settle on the first project with an ease-out
    if (!still) {
      const spin = () => {
        spinning = true;
        const from = topFor(0), to = topFor(N), t0 = performance.now(), T = 1700;
        list.style.scrollSnapType = "none"; list.scrollTop = from;
        const step = (now) => {
          const k = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - k, 4);
          list.scrollTop = from + (to - from) * e;
          if (k < 1) requestAnimationFrame(step); else { list.style.scrollSnapType = ""; spinning = false; }
        };
        requestAnimationFrame(step);
      };
      const html = document.documentElement;
      if (html.classList.contains("intro-play") && !html.classList.contains("intro-done")) {
        new MutationObserver((m, o) => { if (html.classList.contains("intro-out") || html.classList.contains("intro-done")) { o.disconnect(); setTimeout(spin, 350); } }).observe(html, { attributes: true, attributeFilter: ["class"] });
      } else spin();
    }
  }
}
