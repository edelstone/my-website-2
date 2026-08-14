export function initStickyHeader() {
  function updateStickyState() {
    const headers = document.querySelectorAll('.case-study-header');
    
    headers.forEach(header => {
      const rect = header.getBoundingClientRect();
      if (rect.top <= 0) {
        header.classList.add('is-stuck');
      } else {
        header.classList.remove('is-stuck');
      }
    });
  }
  
  window.addEventListener('scroll', updateStickyState, { passive: true });
  document.addEventListener('DOMContentLoaded', updateStickyState);
  updateStickyState();
}
