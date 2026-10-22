const switches = [...document.querySelectorAll("[data-case]")];
const panels = [...document.querySelectorAll(".case-panel")];
const caseGroup = document.querySelector(".case-switch");
const status = document.querySelector("#case-status");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function selectCase(id, announce = true) {
  const panel = document.querySelector(`#case-${id}`);
  if (!panel) return;
  for (const item of panels) item.hidden = item !== panel;
  for (const button of switches) {
    button.setAttribute("aria-pressed", String(button.dataset.case === id));
  }
  if (announce) {
    status.textContent = `已显示 ${panel.querySelector("h3").textContent} 实测。`;
    if (!reduceMotion.matches && panel.animate) {
      panel.animate([
        { opacity: .3, transform: "translateY(12px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 420, easing: "cubic-bezier(.22, 1, .36, 1)" });
    }
  }
}

if (caseGroup && switches.length === panels.length && panels.length > 1) {
  selectCase("qutip", false);
  caseGroup.hidden = false;
  for (const button of switches) {
    button.addEventListener("click", () => selectCase(button.dataset.case));
  }
}

const menu = document.querySelector(".mobile-menu");
menu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => { menu.open = false; });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu?.open) {
    menu.open = false;
    menu.querySelector("summary").focus();
  }
});

// Animate from visible CSS so failed or unavailable browser APIs never hide content.
const moving = new Set();
function move(element, frames, options) {
  if (!element?.animate || reduceMotion.matches) return;
  const animation = element.animate(frames, options);
  moving.add(animation);
  animation.finished.then(() => moving.delete(animation)).catch(() => moving.delete(animation));
}

if (!reduceMotion.matches && "IntersectionObserver" in window) {
  const entranceTargets = document.querySelectorAll(
    ".hero h1, .hero-description, .hero .button, .hero-note, .hero-caption, " +
    ".intro-statement > *, .index-intro, .project-column, .index-note, " +
    ".section-opening > *, .case-switch, .benchmark-numbers, .case-result, .result-figure, " +
    ".workspace-heading > *, .workspace-story > div, .workspace-panel figure, " +
    ".community > h2, .community-copy > *, .start-field > h2, .start-options > *, .footer-top, .footer-wordmark"
  );
  const observer = new IntersectionObserver((entries) => {
    let order = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      move(entry.target, [
        { opacity: .15, transform: "translateY(24px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 760, delay: Math.min(order++, 2) * 70, easing: "cubic-bezier(.22, 1, .36, 1)" });
      observer.unobserve(entry.target);
    }
  }, { threshold: .08 });
  entranceTargets.forEach((element) => observer.observe(element));

  move(document.querySelector(".orbit-window"), [
    { clipPath: "inset(100% 0 0 0)" },
    { clipPath: "inset(0 0 0 0)" },
  ], { duration: 1100, easing: "cubic-bezier(.76, 0, .24, 1)" });
  move(document.querySelector(".phase-crop"), [
    { transform: "scale(1.08)" }, { transform: "scale(1)" },
  ], { duration: 1500, easing: "cubic-bezier(.22, 1, .36, 1)" });
  move(document.querySelector(".phase-crop img"), [
    { transform: "scale(1)" }, { transform: "scale(1.035)" },
  ], { duration: 10000, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });

  reduceMotion.addEventListener("change", () => {
    if (!reduceMotion.matches) return;
    observer.disconnect();
    for (const animation of moving) animation.cancel();
    moving.clear();
  });
}
