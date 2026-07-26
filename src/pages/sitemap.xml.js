import { site } from "../data/site";

const pageModules = import.meta.glob("./**/*.astro");

const EXCLUDED = new Set(["404"]);

function toPath(key) {
  const trimmed = key.replace(/^\.\//, "").replace(/\.astro$/, "");
  if (trimmed === "index") return "/";
  if (trimmed.endsWith("/index")) return `/${trimmed.slice(0, -"/index".length)}/`;
  return `/${trimmed}/`;
}

const paths = Object.keys(pageModules)
  .filter((key) => !key.includes("["))
  .map(toPath)
  .filter((path) => !EXCLUDED.has(path.replace(/\//g, "")))
  .sort();

export function GET() {
  const lastmod = new Date().toISOString();
  const urls = paths
    .map((path) => `  <url>\n    <loc>${site.url}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
    .join("\n");

  const body = `<?xml version="1.0" encoding="utf-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
