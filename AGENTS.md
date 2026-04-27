# Agent Notes

Project context and constraints observed so far.

## Build and Assets

- Source images live in `src/images`.
- Images are optimized by Astro's native asset pipeline during build.
- Shared image lookup lives in `src/data/images.ts`.
- The main image wrapper is `src/components/Picture.astro`, which uses `astro:assets`.
- Optimized image output is generated under Astro's build assets, not committed source files.
- `npm run build` runs Astro site build only.
- `npm start` runs Astro dev via `npm run dev`.
- Node engine is `>=22.12.0` (`package.json`).

## Framework and Output

- The site is built with Astro.
- Astro output goes to `dist/`.
- Astro-generated optimized images are emitted in the build output under `dist/_astro/`.
- The public asset directory is `public/`, not `_site/`.

## Templates and Components

- Astro page files live in `src/pages/`.
- Shared UI components live in `src/components/`.
- Layouts live in `src/layouts/`.
- `src/styles/` contains Sass sources.

## Styles

- Sass sources live in `src/styles`.
- Breakpoints are defined in `src/styles/_variables.scss`.

## General

- Favor centralized, reusable component/layout patterns when updating markup.
- Never edit generated output in `dist/`.
- Static assets live in `public/` and are served as-is.
- The site does not use Astro content collections or `src/content.config.ts`.
- Top-level committed assets include `public/js`, `public/fonts`, and files like `_redirects`.
