// Add a class to header when it becomes sticky
const el = document.querySelector(".case-study-header");
window.addEventListener("scroll", () => {
  const stickyTop = parseInt(window.getComputedStyle(el).top);
  const currentTop = el.getBoundingClientRect().top;
  el.classList.toggle("pinned", currentTop === stickyTop);
});