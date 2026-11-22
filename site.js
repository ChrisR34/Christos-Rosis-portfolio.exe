// Section fades: each block rises once as it comes into view.
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  const hosts = document.querySelectorAll("main > section:not(.hero) :is(.app, .frame, .skills-panel), footer.closing > .wrap");
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
  // the click ripple is for mouse screens only: phones and tablets get no ring on tap
  const tablet = matchMedia("(max-width: 1023px), (pointer: coarse)");
  addEventListener("pointerdown", (e) => { point(e); if (!still && !tablet.matches) rings.push({ x: e.clientX, y: e.clientY, t: 0 }); }, { passive: true });
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

// The top bar (a floating rounded glass bar, set in the markup) moves with the reader: scrolling down it
// slides smoothly out of view, and the slightest scroll up brings it gliding back.
{
  const nav = document.querySelector(".nav");
  if (nav) {
    let lastY = scrollY, queued = false, travel = 0;
    const update = () => {
      queued = false;
      const y = scrollY, dy = y - lastY; lastY = y;
      const open = nav.querySelector(".nav__toggle[aria-expanded='true']") || nav.matches(":focus-within, :hover");
      // a little travel in one direction before it reacts, so small jitters do not flicker it
      travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
      if (y < 80 || open) nav.classList.remove("is-tucked");
      else if (travel > 24) nav.classList.add("is-tucked");
      else if (travel < -8) nav.classList.remove("is-tucked");
    };
    addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }
}

// Hero screen: a neural sphere. Nodes spread evenly over a slowly turning globe, each linked to its
// nearest neighbours; the far side dims and shrinks, and signals hop node to node across it. Pauses off
// screen and in a hidden tab; reduced motion draws one still frame.
{
  const screen = document.querySelector(".screen"), cv = screen?.querySelector(".screen__fx"), box = screen?.querySelector(".screen__net");
  if (cv && box) {
    const ctx = cv.getContext("2d");
    const small = matchMedia("(max-width: 639px), (pointer: coarse)").matches, K = small ? 0.55 : 1;
    const sprite = (core, edge) => {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, core); r.addColorStop(0.25, edge); r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c;
    };
    const CYAN = sprite("rgba(230,255,255,1)", "rgba(0,229,255,.55)"), ICE = sprite("rgba(255,255,255,.9)", "rgba(138,244,255,.35)");
    const rnd = (a, b) => a + Math.random() * (b - a);
    const dot = (img, x, y, s, a) => { ctx.globalAlpha = a; ctx.drawImage(img, x - s * 2, y - s * 2, s * 4, s * 4); };
    const dust = Array.from({ length: Math.round(34 * K) }, () => ({ x: Math.random(), y: Math.random(), s: rnd(6, 28), a: rnd(0.04, 0.16), vx: rnd(-0.004, 0.004), vy: rnd(-0.006, -0.001) }));
    const drawDust = (dt, W, H) => { for (const d of dust) { d.x = (d.x + d.vx * dt + 1) % 1; d.y = (d.y + d.vy * dt + 1) % 1; dot(ICE, d.x * W, d.y * H, d.s, d.a); } };
    let W = 0, H = 0, draw, layout;

    {
      // the sphere: nodes spread evenly over a globe (a Fibonacci spiral), each linked to its nearest
      // neighbours; it turns slowly, the far side dims and shrinks, and signals hop node to node
      const COUNT = small ? 70 : 120, pts = [];
      for (let i = 0; i < COUNT; i++) {
        const y = 1 - (2 * (i + 0.5)) / COUNT, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
        pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, act: 0, sx: 0, sy: 0, d: 0 });
      }
      const links = [];
      pts.forEach((p, i) => pts.map((q, j) => [j, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)]).filter(([j]) => j > i)
        .sort((a, b) => a[1] - b[1]).slice(0, 3).forEach(([j]) => links.push([p, pts[j]])));
      const nbrs = new Map(pts.map((p) => [p, []]));
      links.forEach(([a, b]) => { nbrs.get(a).push(b); nbrs.get(b).push(a); });
      const hops = [];
      const hop = (from, ttl) => { from.act = 1; if (ttl <= 0) return;
        const n = nbrs.get(from); hops.push({ a: from, b: n[Math.floor(Math.random() * n.length)], t: 0, ttl: ttl - 1 }); };
      let cx = 0, cy = 0, R = 0;
      layout = (b, r) => { cx = r.left - b.left + r.width / 2; cy = r.top - b.top + r.height / 2; R = Math.min(r.width, r.height) * 0.42; };
      let last = 0, nextFire = 0;
      draw = (time) => {
        const dt = Math.min(0.05, time - last || 0.016); last = time;
        if (!still && time > nextFire) { nextFire = time + rnd(0.25, 0.6); hop(pts[Math.floor(Math.random() * COUNT)], 6 + Math.floor(Math.random() * 6)); }
        // turn about the vertical axis, tilted toward the viewer
        const ay = time * 0.18, tilt = 0.38, ca = Math.cos(ay), sa = Math.sin(ay), ct = Math.cos(tilt), st = Math.sin(tilt);
        for (const p of pts) {
          const x = p.x * ca + p.z * sa, z0 = -p.x * sa + p.z * ca, y = p.y * ct - z0 * st, z = p.y * st + z0 * ct;
          const persp = 2.6 / (2.6 - z);
          p.sx = cx + x * R * persp; p.sy = cy + y * R * persp; p.d = (z + 1) / 2;   // 0 far side, 1 near side
        }
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = "lighter"; drawDust(dt, W, H);
        dot(CYAN, cx, cy, R * 0.28, 0.07);   // a faint core glow inside the globe
        ctx.globalCompositeOperation = "source-over"; ctx.lineWidth = 1; ctx.strokeStyle = "#00e5ff";
        for (const [a, b] of links) {
          ctx.globalAlpha = (0.03 + 0.17 * Math.min(a.d, b.d) ** 1.5) + 0.3 * Math.max(a.act, b.act);
          ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
        }
        ctx.globalCompositeOperation = "lighter";
        for (let i = hops.length - 1; i >= 0; i--) {
          const h = hops[i]; h.t += dt * 3.2;
          if (h.t >= 1) { hops.splice(i, 1); hop(h.b, h.ttl); continue; }
          for (let k = 0; k < 4; k++) { const t = Math.max(0, h.t - k * 0.06);
            dot(k ? ICE : CYAN, h.a.sx + (h.b.sx - h.a.sx) * t, h.a.sy + (h.b.sy - h.a.sy) * t, (3.2 - k * 0.6) * (0.6 + 0.6 * h.a.d), (0.95 - k * 0.2) * (0.4 + 0.6 * h.a.d)); }
        }
        for (const p of pts) {
          p.act *= Math.pow(0.15, dt);
          dot(p.act > 0.3 ? CYAN : ICE, p.sx, p.sy, (1.4 + 2.2 * p.d) * (1 + p.act * 1.6), (0.15 + 0.7 * p.d) * (0.6 + 0.4 * p.act) + 0.3 * p.act);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      };
      if (still) pts.forEach((p) => (p.act = Math.random() < 0.1 ? 0.8 : 0));
    }

    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2), b = screen.getBoundingClientRect(), r = box.getBoundingClientRect();
      W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout(b, r);
    };
    let on = true, raf = 0;
    const loop = (ms) => { draw(ms / 1000); raf = on ? requestAnimationFrame(loop) : 0; };
    const run = (go) => { on = go; if (go && !raf) raf = requestAnimationFrame(loop); };
    size();
    new ResizeObserver(() => { size(); if (still) draw(2); }).observe(screen);
    if (still) draw(2);
    else {
      let seen = true;
      new IntersectionObserver(([e]) => { seen = e.isIntersecting; run(seen && !document.hidden); }).observe(screen);
      document.addEventListener("visibilitychange", () => run(seen && !document.hidden));
    }
  }
}

// Projects wheel, like a phone's alarm picker, with a clear "engaged" state.
// At rest, scrolling over it scrolls the page. It engages on intent: the pointer moves onto it and
// rests for half a second (a line draws across its top edge meanwhile), or a click, Tab or touch.
// Engaged, each scroll step rolls exactly one project with an eased settle; scrolling past the first
// or last project releases it and the visitor's own scrolling carries on, softly smoothed.
// Moving the pointer away or pressing Esc releases it. Phones keep native swiping (touch is intent
// enough) with the same engaged look. It spins in once on load and starts on project one.
{
  const picker = document.querySelector(".picker"), list = picker?.querySelector(".picker__list");
  if (list) {
    const rows = [...list.querySelectorAll(".picker__item")], N = rows.length;
    const fine = matchMedia("(pointer: fine)").matches;
    picker.classList.toggle("is-fine", fine);
    const hint = picker.querySelector(".picker__hint"), count = picker.querySelector(".picker__count b");
    const rail = picker.querySelector(".picker__rail");
    rail.append(...rows.map(() => document.createElement("i")));
    const ticks = [...rail.children];
    const pad = (n) => String(n).padStart(2, "0");
    picker.querySelector(".picker__count").lastChild.textContent = ` / ${pad(N)}`;
    const rowH = () => rows[0].parentElement.offsetHeight;
    const topFor = (i) => i * rowH();   // the list's padding centres row i at scrollTop = i * row height

    let current = -1;
    const paint = () => {
      const mid = list.scrollTop / rowH();
      rows.forEach((row, i) => {
        const d = i - mid, ad = Math.min(Math.abs(d), 3);
        row.style.transform = `perspective(700px) rotateX(${Math.max(-75, Math.min(75, -d * 24))}deg) scale(${1 - ad * 0.06})`;
        row.style.opacity = String(Math.max(0, 1 - ad * 0.32));
      });
      const now = Math.max(0, Math.min(N - 1, Math.round(mid)));
      if (now !== current) {
        rows[current]?.classList.remove("is-on"); ticks[current]?.classList.remove("is-on");
        rows[now].classList.add("is-on"); ticks[now].classList.add("is-on");
        const was = current; count.textContent = pad(now + 1); current = now;
        if (was !== -1) picker.dispatchEvent(new CustomEvent("project-change", { detail: now }));
      }
    };
    let say = "";
    const setHint = (text) => {
      if (text === say) return; say = text;
      hint.classList.add("is-swapping");
      setTimeout(() => { hint.textContent = text; hint.classList.remove("is-swapping"); }, 150);
    };
    const restHint = fine ? "Hover to browse" : "Swipe to browse";
    const onHint = fine ? "Scroll to turn · Esc to leave" : "Swipe to turn";

    // eased roll to a row; a new step retargets from wherever the wheel is
    let target = 0, anim = 0;
    const ease = (k) => 1 - Math.pow(1 - k, 4);
    const rollTo = (i, ms = 640) => {
      target = Math.max(0, Math.min(N - 1, i));
      cancelAnimationFrame(anim);
      const from = list.scrollTop, to = topFor(target), t0 = performance.now(), T = still ? 0 : ms;
      const step = (now) => {
        const k = T ? Math.min(1, (now - t0) / T) : 1;
        list.scrollTop = from + (to - from) * ease(k); paint();
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };

    // engaged state
    let engaged = false, armTimer = 0, quietUntil = 0;
    const engage = () => {
      clearTimeout(armTimer); armTimer = 0;
      picker.classList.remove("is-arming");
      if (engaged) return;
      engaged = true; picker.classList.add("is-engaged"); setHint(onHint);
    };
    const release = () => {
      clearTimeout(armTimer); armTimer = 0;
      picker.classList.remove("is-arming");
      if (!engaged) return;
      engaged = false; picker.classList.remove("is-engaged"); setHint(restHint);
    };
    hint.textContent = say = restHint;

    if (fine) {
      // arming: only real pointer movement counts (a page scrolling under a still pointer does not)
      let lx = null, ly = null;
      picker.addEventListener("pointermove", (e) => {
        const moved = lx !== null && Math.hypot(e.clientX - lx, e.clientY - ly) > 1;
        lx = e.clientX; ly = e.clientY;
        if (engaged || armTimer || !moved || performance.now() < quietUntil) return;
        picker.classList.add("is-arming");
        armTimer = setTimeout(engage, 500);
      });
      picker.addEventListener("pointerleave", () => { lx = ly = null; release(); });
      picker.addEventListener("pointerdown", engage);
      addEventListener("scroll", () => { if (armTimer) { clearTimeout(armTimer); armTimer = 0; picker.classList.remove("is-arming"); } }, { passive: true });

      // leaving the wheel: the visitor's own scrolling moves the page, smoothed so it trails softly
      // behind their input and starts gently (a quarter speed, building to full over 0.8 s). When they
      // stop and the page has settled, the browser's own scrolling takes over again.
      let soft = null;
      const settle = () => {
        if (!soft) return;
        const now = performance.now(), gap = soft.target - scrollY;
        // at least 1px a frame: smaller steps are rounded away and the page would never arrive
        const step = Math.abs(gap * 0.085) < 1 ? Math.sign(gap) * Math.min(1, Math.abs(gap)) : gap * 0.085;
        scrollTo(0, scrollY + step);
        // arrived and the visitor has stopped (or, as a safety, idle for 1.5 s): hand back to the browser
        if ((Math.abs(gap) < 1 && now - soft.last > 300) || now - soft.last > 1500) { soft = null; return; }
        soft.raf = requestAnimationFrame(settle);
      };
      const feed = (dy) => {
        const now = performance.now(), ramp = Math.min(1, 0.25 + 0.75 * ((now - soft.t0) / 800));
        const max = document.documentElement.scrollHeight - innerHeight;
        soft.target = Math.max(0, Math.min(max, soft.target + dy * ramp)); soft.last = now;
      };
      const leave = (dy) => {
        release(); quietUntil = performance.now() + 1600;
        if (still) return scrollBy(0, dy);
        cancelAnimationFrame(soft?.raf);
        soft = { target: scrollY, t0: performance.now(), last: 0 };
        feed(dy); soft.raf = requestAnimationFrame(settle);
      };
      addEventListener("wheel", (e) => {
        if (!soft || e.defaultPrevented) return;
        e.preventDefault();
        feed(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1));
      }, { passive: false });
      // a key, touch or drag of the scrollbar hands straight back to the browser
      const handBack = () => { if (soft) { cancelAnimationFrame(soft.raf); soft = null; } };
      ["keydown", "touchstart", "mousedown"].forEach((t) => addEventListener(t, handBack, { passive: true }));

      // engaged scrolling: one project per step, spaced so a trackpad flick cannot race
      let acc = 0, lastStep = 0;
      list.addEventListener("wheel", (e) => {
        if (!engaged) return;   // at rest the page scrolls as normal
        const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
        const dir = Math.sign(dy);
        if (!dir) return;
        e.preventDefault();
        const atEnd = (dir > 0 && target >= N - 1) || (dir < 0 && target <= 0);
        const now = performance.now();
        if (atEnd) {
          // leave at once (the visitor scrolls on, smoothed), unless this is the tail of the flick that just reached the end
          if (now - lastStep > 350) leave(dy);
          return;
        }
        acc += dy;
        if (Math.abs(acc) >= 40 && now - lastStep > 180) {
          lastStep = now; acc = 0;
          rollTo(target + dir);
        }
      }, { passive: false });
      addEventListener("keydown", (e) => { if (e.key === "Escape" && engaged) release(); });
    } else {
      // touch: native swiping with snapping; the engaged look while the finger is on it and shortly after
      let restTimer = 0;
      const touchOn = () => { clearTimeout(restTimer); engage(); };
      const touchOff = () => { clearTimeout(restTimer); restTimer = setTimeout(release, 1200); };
      list.addEventListener("touchstart", touchOn, { passive: true });
      list.addEventListener("touchend", touchOff, { passive: true });
      list.addEventListener("scroll", () => { paint(); target = current; if (engaged) touchOff(); }, { passive: true });
    }

    // taps and keys: tapping a row rolls it to the centre, tapping the centred row opens it
    rows.forEach((row, i) => {
      row.addEventListener("click", (e) => { if (i !== current) { e.preventDefault(); engage(); rollTo(i); } });
      row.addEventListener("focus", () => { engage(); if (i !== current) rollTo(i); });
      row.addEventListener("keydown", (e) => {
        const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
        if (!step || !rows[i + step]) return;
        e.preventDefault();
        rows[i + step].focus({ preventScroll: true });
      });
    });
    picker.addEventListener("focusout", (e) => { if (!picker.contains(e.relatedTarget) && !picker.matches(":hover")) release(); });
    addEventListener("resize", () => { list.scrollTop = topFor(current); paint(); });
    list.scrollTop = 0; paint();

    // the spin-in: roll up from the last project and settle on the first
    if (!still) {
      const spin = () => {
        list.style.scrollSnapType = "none"; list.scrollTop = topFor(N - 1); paint();
        rollTo(0, 1700);
        setTimeout(() => { list.style.scrollSnapType = ""; }, 1750);
      };
      spin();
    }
  }
}
