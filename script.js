document.addEventListener("DOMContentLoaded", () => {
  /* ---- Sticky nav ---- */
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (window.scrollY > 12) nav.classList.add("is-scrolled");
    else nav.classList.remove("is-scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Mobile menu ---- */
  const menuBtn = document.getElementById("menuBtn");
  const menuCloseBtn = document.getElementById("menuCloseBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const openMenu = () => { mobileMenu.classList.add("is-open"); menuBtn.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; };
  const closeMenu = () => { mobileMenu.classList.remove("is-open"); menuBtn.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; };
  menuBtn.addEventListener("click", openMenu);
  menuCloseBtn.addEventListener("click", closeMenu);
  mobileMenu.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));

  /* ---- Product showcase tabs ---- */
  const tabs = document.querySelectorAll(".showcase__tab");
  const panels = document.querySelectorAll(".showcase__panel");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");
      tabs.forEach(t => { t.classList.toggle("is-active", t === tab); t.setAttribute("aria-selected", t === tab ? "true" : "false"); });
      panels.forEach(p => p.classList.toggle("is-active", p.getAttribute("data-panel") === target));
    });
  });

  /* ---- FAQ accordion ---- */
  document.querySelectorAll(".faq-item").forEach(item => {
    const q = item.querySelector(".faq-item__q");
    const a = item.querySelector(".faq-item__a");
    q.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      document.querySelectorAll(".faq-item.is-open").forEach(other => {
        if (other !== item) {
          other.classList.remove("is-open");
          other.querySelector(".faq-item__a").style.maxHeight = null;
        }
      });
      if (isOpen) {
        item.classList.remove("is-open");
        a.style.maxHeight = null;
      } else {
        item.classList.add("is-open");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });

  /* ---- Scroll reveal (section-level; see .sr in styles.css) ---- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
  document.querySelectorAll(".sr").forEach(el => revealObserver.observe(el));

  /* ---- Product demo: the YouTube player is only created when the visitor presses play ---- */
  const demoStage = document.getElementById("demoStage");
  const demoPlay = document.getElementById("demoPlay");
  const demoThumb = document.getElementById("demoThumb");
  if (demoStage && demoPlay) {
    const VIDEO_ID = "3PQWCqi0TcE";
    // maxresdefault doesn't exist for every video; fall back to a smaller frame, then to the branded stage.
    if (demoThumb) {
      const fallbacks = ["sddefault", "hqdefault"];
      const tooSmall = () => demoThumb.naturalWidth && demoThumb.naturalWidth <= 120; // YouTube's grey "missing" placeholder
      const next = () => {
        const f = fallbacks.shift();
        if (f) demoThumb.src = "https://i.ytimg.com/vi/" + VIDEO_ID + "/" + f + ".jpg";
        else demoThumb.remove();
      };
      demoThumb.addEventListener("error", next);
      demoThumb.addEventListener("load", () => { if (tooSmall()) next(); });
    }
    demoPlay.addEventListener("click", () => {
      const frame = document.createElement("iframe");
      frame.src = "https://www.youtube-nocookie.com/embed/" + VIDEO_ID + "?autoplay=1&rel=0&playsinline=1";
      frame.title = "Klyvero ERP product demo";
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      demoStage.classList.add("is-playing");
      demoStage.appendChild(frame);
    });
  }

  /* ---- Klyvero Assistant: nothing loads until the visitor engages ---- */
  const asstBtn = document.getElementById("assistantLauncher");
  if (asstBtn) {
    let asstLoad = null;
    const loadAsst = () => asstLoad || (asstLoad = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet"; css.href = "assistant.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = "assistant.js"; js.onload = resolve;
      js.onerror = () => { asstLoad = null; reject(new Error("assistant failed to load")); };
      document.body.appendChild(js);
    }));
    ["pointerenter", "focus"].forEach(ev => asstBtn.addEventListener(ev, () => { loadAsst().catch(() => {}); }, { once: true }));
    asstBtn.addEventListener("click", () => {
      loadAsst()
        .then(() => window.KlyveroAssistant.toggle(asstBtn))
        .catch(() => { window.location.hash = "#contact"; }); // graceful fallback: take the visitor to the Contact section
    });
  }

  /* ---- Hero entrance (single orchestrated moment, on load) ---- */
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll(".reveal-up").forEach(el => el.classList.add("is-revealed"));
    }, 80);
  });
});
