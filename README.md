# [<img src="src/icon.svg" width="28px" alt="" />](https://michaeledelstone.com) &nbsp;[My website and portfolio](https://michaeledelstone.com)

[![Netlify Status](https://api.netlify.com/api/v1/badges/04b3019c-b59a-40e8-91c2-173019e07f8b/deploy-status)](https://app.netlify.com/sites/edelstone/deploys)

## About

This is the source code for my portfolio website. It's built from scratch using the [Eleventy (11ty) static site generator](https://www.11ty.dev) and is designed to be simple, accessible, fast, and content-focused.

Please use any of my code or design for your own purposes (except fonts, which must be licensed separately).

## Typography

[Lausanne](https://weltkern.com/typefaces/lausanne) by Nizar Kazan at WELTKERN&reg;.

## Colors

- White: `#ffffff`
- Light: `#f6f0e8`
- Tan: `#e4d8cd`
- Blue: `#005198`
- Gray: `#8d8d8d`
- Dark: `#1b1b1b`

## Local development

*Prerequisites: Node.js 18+*

1. Clone this project.
2. Install dependencies: `npm install`.
3. Start the dev server: `npm start`.
4. Open `http://localhost:8080`.

Build for production:

```sh
npm run build
```

### Images

Images are processed during `npm run build` and written to `_site/images` (generated files are not tracked). Processed outputs are cached in `.cache/images` to speed up rebuilds. Cached images are reused until the source image changes or the image-processing rules are updated.

- Responsive variants: PNG/JPG sources generate `-800w/-1400w/-2000w` versions for `srcset`.
- Manifest: `build:images` writes `src/_data/imageMeta.json` with dimensions for width/height attributes.
- Build guard: `check:images` runs on `npm run build` and fails if `/images/...` references are missing.
- PNG: lossless optimization + lossless WebP generation
- JPG: optimized + lossy WebP generation (quality 80)
- WebP exceptions (no WebP): add filenames to `NO_WEBP` in `scripts/build-images.js`
- Responsive exceptions (no responsive sizes): add filenames to `NO_RESPONSIVE` in `scripts/build-images.js`
- GIF: copied as-is

Tune PNG optimization level:

```sh
OXIPNG_LEVEL=4 npm run build
```

Default is `3`. Lower values (e.g., `2`) are faster with slightly less compression; higher values (e.g., `4`) are slower with potentially smaller files.

Clear the image cache:

```sh
npm run clean:images
```
