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

  /* ---- Hero entrance (single orchestrated moment, on load) ---- */
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll(".reveal-up").forEach(el => el.classList.add("is-revealed"));
    }, 80);
  });
});
