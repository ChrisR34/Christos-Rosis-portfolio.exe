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
