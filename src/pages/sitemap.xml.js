import { site } from "../data/site";

const paths = [
  "/",
  "/about/",
  "/contact/",
  "/work/",
  "/work/gtreasury/",
  "/work/balto/",
  "/work/kuali/",
  "/work/texas-state/",
  "/work/tints-and-shades/",
  "/work/tock/",
  "/work/material-palettes/"
];

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
