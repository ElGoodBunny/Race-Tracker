// Browser side of Nav.astro (docs/tasks/033-claude-navigation.md): full height menu and the current section,
// both from the legacy script. The main action is set by hero.ts.

export function startNav(): void {
  const toggle = document.getElementById("menu-toggle");
  const menu = document.getElementById("mnav");
  if (!toggle || !menu) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setMenu(open: boolean) {
    toggle!.setAttribute("aria-expanded", String(open));
    toggle!.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
    if (open) {
      menu!.hidden = false;
      // Two frames, so the panel is in the layout before it fades in.
      requestAnimationFrame(() => requestAnimationFrame(() => menu!.classList.add("open")));
      document.body.style.overflow = "hidden";
      menu!.querySelector("a")?.focus();
    } else {
      menu!.classList.remove("open");
      document.body.style.overflow = "";
      window.setTimeout(() => {
        if (!menu!.classList.contains("open")) menu!.hidden = true;
      }, reduced ? 0 : 500);
    }
  }
  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";
  toggle.addEventListener("click", () => setMenu(!isOpen()));
  menu.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      setMenu(false);
      toggle.focus();
    }
  });
  // Back to the wide bar with the menu still open: close it, or the page stays locked.
  matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
    if (e.matches && isOpen()) setMenu(false);
  });

  // Current section: the one crossing the middle band of the screen.
  const links = [...document.querySelectorAll<HTMLAnchorElement>(".nav-links a[data-spy]")];
  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const l of links) l.setAttribute("aria-current", String(l.dataset.spy === e.target.id));
      }
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  for (const l of links) {
    const target = document.getElementById(l.dataset.spy!);
    if (target) spy.observe(target);
  }
}
