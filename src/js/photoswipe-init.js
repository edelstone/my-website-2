import PhotoSwipeLightbox from "/js/vendor/photoswipe-lightbox.esm.js";

const galleries = document.querySelectorAll(".pswp-gallery");

if (galleries.length) {
  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  let removeFocusTrap = null;

  function setupFocusTrap(pswp) {
    const root = pswp && pswp.element;
    if (!root) return null;

    const lastActive = document.activeElement;

    function getFocusable() {
      return Array.from(root.querySelectorAll(focusableSelector)).filter(
        (el) => !el.hasAttribute("aria-hidden")
      );
    }

    function focusRoot() {
      if (typeof root.focus === "function") {
        root.focus();
      }
    }

    function onKeyDown(event) {
      if (event.key !== "Tab") return;
      const items = getFocusable();
      if (!items.length) {
        event.preventDefault();
        focusRoot();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function onFocusIn(event) {
      if (!root.contains(event.target)) {
        event.stopPropagation();
        focusRoot();
      }
    }

    setTimeout(focusRoot, 0);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      if (lastActive && typeof lastActive.focus === "function") {
        lastActive.focus();
      }
    };
  }

  const lightbox = new PhotoSwipeLightbox({
    gallery: ".pswp-gallery",
    children: "a.pswp-item",
    trapFocus: true,
    returnFocus: true,
    pswpModule: () => import("/js/vendor/photoswipe.esm.js")
  });

  lightbox.on("afterInit", () => {
    if (removeFocusTrap) removeFocusTrap();
    removeFocusTrap = setupFocusTrap(lightbox.pswp);
  });

  lightbox.on("close", () => {
    if (removeFocusTrap) {
      removeFocusTrap();
      removeFocusTrap = null;
    }
  });

  lightbox.init();
}
