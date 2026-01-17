const header = document.querySelector(".case-study-header");

if (header) {
  const sentinel = document.createElement("div");
  sentinel.style.position = "absolute";
  header.before(sentinel);

  const top = parseFloat(getComputedStyle(header).top) || 0;

  new IntersectionObserver(
    ([entry]) => header.classList.toggle("pinned", !entry.isIntersecting),
    { rootMargin: `-${top}px 0px 0px 0px` }
  ).observe(sentinel);

  requestAnimationFrame(() => {
    const rectTop = header.getBoundingClientRect().top;
    header.classList.toggle("pinned", rectTop <= top);
  });
}
