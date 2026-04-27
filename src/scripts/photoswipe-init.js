import PhotoSwipeLightbox from "photoswipe/lightbox";

const galleries = document.querySelectorAll(".pswp-gallery");

galleries.forEach((gallery) => {
  if (!(gallery instanceof HTMLElement)) return;

  const lightbox = new PhotoSwipeLightbox({
    gallery,
    children: "a.pswp-item",
    pswpModule: () => import("photoswipe"),
    padding: { top: 10, right: 0, bottom: 10, left: 0 }
  });

  lightbox.init();
});
