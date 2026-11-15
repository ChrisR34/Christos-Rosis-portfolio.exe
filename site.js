// Section fades and the cyan glow that drifts as the page scrolls.
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!still) {
  // each block rises once as it comes into view
  const items = document.querySelectorAll("main > section:not(.hero):not([data-moment]) .wrap > *, .closing__cta");
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  items.forEach((el, i) => { el.classList.add("rise"); el.style.setProperty("--i", i % 3); io.observe(el); });

  // the glow swings left and right and bobs as you scroll, so it seems to travel with you
  const root = document.documentElement;
  let queued = false;
  const move = () => {
    queued = false;
    const p = scrollY / Math.max(1, root.scrollHeight - innerHeight);
    root.style.setProperty("--gy", `${50 + 12 * Math.cos(p * Math.PI * 4)}%`);
  };
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(move); } }, { passive: true });
  move();
}
