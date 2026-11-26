const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Animate from visible CSS so unavailable APIs never hide content.
const moving = new Set();
function move(element, frames, options) {
  if (!element?.animate || reduceMotion.matches) return;
  const animation = element.animate(frames, options);
  moving.add(animation);
  animation.finished.then(() => moving.delete(animation)).catch(() => moving.delete(animation));
}

// 1. Interactive Workflow Theater Tabs
const wfTabBar = document.querySelector(".wf-tabs");
const wfTabs = [...document.querySelectorAll("[data-wf]")];
const wfPanels = [...document.querySelectorAll(".wf-panel")];
const wfStatus = document.querySelector("#wf-status");

function selectWorkflow(id, announce = true) {
  const panel = document.querySelector(`#wf-panel-${id}`);
  if (!panel) return;
  for (const item of wfPanels) item.hidden = item !== panel;
  for (const tab of wfTabs) {
    const active = tab.dataset.wf === id;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  if (announce && wfStatus) {
    const label = wfTabs.find((t) => t.dataset.wf === id)?.textContent ?? id;
    wfStatus.textContent = `已切换至 ${label} 案例。`;
    move(panel, [
      { opacity: 0.35, transform: "translateY(10px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 360, easing: "cubic-bezier(.22, 1, .36, 1)" });
  }
}

if (wfTabBar && wfTabs.length && wfTabs.length === wfPanels.length) {
  wfTabBar.hidden = false;
  selectWorkflow("vqe", false);
  wfTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectWorkflow(tab.dataset.wf));
    tab.addEventListener("keydown", (event) => {
      const next = event.key === "ArrowRight" ? (index + 1) % wfTabs.length
        : event.key === "ArrowLeft" ? (index + wfTabs.length - 1) % wfTabs.length
        : event.key === "Home" ? 0
        : event.key === "End" ? wfTabs.length - 1 : null;
      if (next !== null) {
        event.preventDefault();
        wfTabs[next].focus();
        selectWorkflow(wfTabs[next].dataset.wf);
      }
    });
  });
}

// 2. Ecosystem Domain Filter
const domainBar = document.querySelector(".domain-filter");
const domainButtons = [...document.querySelectorAll("[data-domain]")];
const ecoCards = [...document.querySelectorAll(".eco-card")];

if (domainBar && domainButtons.length && ecoCards.length) {
  domainBar.hidden = false;
  for (const button of domainButtons) {
    button.addEventListener("click", () => {
      const target = button.dataset.domain;
      for (const item of domainButtons) item.setAttribute("aria-pressed", String(item === button));
      for (const card of ecoCards) {
        const visible = target === "all" || card.dataset.domainGroup === target;
        card.hidden = !visible;
      }
    });
  }
}

// 3. Benchmark Case Switcher
const switches = [...document.querySelectorAll("[data-case]")];
const panels = [...document.querySelectorAll(".case-panel")];
const caseGroup = document.querySelector(".case-switch");
const status = document.querySelector("#case-status");

function selectCase(id, announce = true) {
  const panel = document.querySelector(`#case-${id}`);
  if (!panel) return;
  for (const item of panels) item.hidden = item !== panel;
  for (const button of switches) {
    button.setAttribute("aria-pressed", String(button.dataset.case === id));
  }
  if (announce && status) {
    status.textContent = `已显示 ${panel.querySelector("h3").textContent} 实测。`;
    move(panel, [
      { opacity: 0.3, transform: "translateY(12px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 400, easing: "cubic-bezier(.22, 1, .36, 1)" });
  }
}

if (caseGroup && switches.length === panels.length && panels.length > 1) {
  selectCase("qutip", false);
  caseGroup.hidden = false;
  for (const button of switches) {
    button.addEventListener("click", () => selectCase(button.dataset.case));
  }
}

// 4. Progressive Copy Buttons
for (const button of document.querySelectorAll("[data-copy]")) {
  const source = document.getElementById(button.dataset.copy);
  if (!source) continue;
  const label = button.textContent;
  button.hidden = false;
  button.addEventListener("click", async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(source.textContent.trim());
      copied = true;
    } catch {
      const range = document.createRange();
      range.selectNodeContents(source);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    }
    button.dataset.state = copied ? "done" : "selected";
    button.textContent = copied ? "已复制" : "已选中，请手动复制";
    if (status) status.textContent = button.textContent;
    setTimeout(() => { button.textContent = label; delete button.dataset.state; }, 2400);
  });
}

// 5. Mobile Menu Keyboard & Navigation Hygiene
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

// 6. Subtle Entrance & Wavefield Parallax
if (!reduceMotion.matches && "IntersectionObserver" in window) {
  const entranceTargets = document.querySelectorAll(
    ".hero-badge, .hero h1, .hero-description, .hero-cta-row, .hero-facts, " +
    ".theater-head, .wf-tabs, .wf-stage, " +
    ".intro-statement, .eco-card, .section-opening, .case-panel, " +
    ".pillar-card, .roadmap-item, .start-field, .community"
  );
  const observer = new IntersectionObserver((entries) => {
    let order = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      move(entry.target, [
        { opacity: 0.2, transform: "translateY(18px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 640, delay: Math.min(order++, 2) * 60, easing: "cubic-bezier(.22, 1, .36, 1)" });
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.08 });
  entranceTargets.forEach((element) => observer.observe(element));

  const field = document.querySelector(".hero-field");
  const hero = document.querySelector(".hero");
  move(field?.querySelector("img"), [
    { transform: "scale(1.03) translateX(-.4%)" },
    { transform: "scale(1.06) translateX(.4%)" },
  ], { duration: 14000, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });

  if (field && hero && window.matchMedia("(hover: hover)").matches) {
    hero.addEventListener("pointermove", (event) => {
      if (reduceMotion.matches) return;
      const bounds = hero.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      field.style.transform = `translate3d(${x * 4}px, ${y * 3}px, 0)`;
    });
    hero.addEventListener("pointerleave", () => { field.style.transform = ""; });
  }

  reduceMotion.addEventListener("change", () => {
    if (!reduceMotion.matches) return;
    observer.disconnect();
    for (const animation of moving) animation.cancel();
    moving.clear();
    if (field) field.style.transform = "";
  });
}
