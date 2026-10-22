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
      move(panel, [
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

  const object = document.querySelector(".quantum-object");
  const hero = document.querySelector(".hero");
  move(object?.querySelector("img"), [
    { transform: "translateY(4px) rotate(-.35deg)" },
    { transform: "translateY(-5px) rotate(.35deg)" },
  ], { duration: 9000, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });

  if (object && hero && window.matchMedia("(hover: hover)").matches) {
    hero.addEventListener("pointermove", (event) => {
      if (reduceMotion.matches) return;
      const bounds = hero.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      object.style.transform = `rotateX(${-y * 1.2}deg) rotateY(${x * 2}deg)`;
    });
    hero.addEventListener("pointerleave", () => { object.style.transform = ""; });
  }

  reduceMotion.addEventListener("change", () => {
    if (!reduceMotion.matches) return;
    observer.disconnect();
    for (const animation of moving) animation.cancel();
    moving.clear();
    if (object) object.style.transform = "";
  });
}
