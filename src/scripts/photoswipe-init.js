import PhotoSwipeLightbox from "photoswipe/lightbox";

const galleries = document.querySelectorAll(".pswp-gallery");

galleries.forEach((gallery) => {
  if (!(gallery instanceof HTMLElement)) return;

  const lightbox = new PhotoSwipeLightbox({
    gallery,
    children: "a.pswp-item",
    pswpModule: () => import("photoswipe"),
    padding: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  lightbox.on("uiRegister", () => {
    lightbox.pswp.ui.registerElement({
      name: "caption",
      order: 9,
      isButton: false,
      appendTo: "root",
      html: "",
      onInit: (caption, pswp) => {
        pswp.on("change", () => {
          const currSlideElement = pswp.currSlide.data.element;
          const captionText = currSlideElement?.dataset.pswpCaption || "";

          caption.textContent = captionText;
          caption.hidden = !captionText;
        });
      }
    });
  });

  lightbox.init();
});
