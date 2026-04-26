# [My website and portfolio](https://michaeledelstone.com)

## About

This is the source code for my portfolio website. You’re free to use any of the code or design for your own purposes. Credit is appreciated but not required.

## Typography

[Lausanne](https://weltkern.com/typefaces/lausanne) by Nizar Kazan at WELTKERN®.

## Colors

- White: `#ffffff`
- Light: `#f6f0e8`
- Tan: `#e4d8cd`
- Blue: `#005198`
- Gray: `#8d8d8d`
- Dark: `#1b1b1b`

## Built with

- [Astro](https://astro.build)
- [Netlify](https://www.netlify.com)
- [PhotoSwipe](https://photoswipe.com)
- [Sass](https://sass-lang.com)
- [Sharp](https://sharp.pixelplumbing.com)

## Local development

*Prerequisites: Node.js 18+*

1. Clone this project
2. Install dependencies: `npm install`
3. Start the dev server: `npm start`
4. Open `http://localhost:4321`

Build for production with `npm run build`.

Preview the production build locally with `npm run preview`.

### Image pipeline

Images are built automatically during `npm run build` and written to `public/images`. Astro compiles Sass from `src/styles` during dev/build and outputs the final site to `dist/`. Generated files are not committed.

#### Features

- Responsive images with correct width and height attributes
- Alt text enforced (or explicit `decorative`)
- Build fails on missing image references
- Build fails on unused source images
- Images are cached until source or processing rules are updated
- Cache is clearable with `npm run clean:images`
- Exception lists for format/size overrides

#### Format outputs

- PNG → compressed + WebP
- JPG → optimized + WebP
- GIF → copied as-is
