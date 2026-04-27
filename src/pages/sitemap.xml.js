import { site } from "../data/site";
import { getCollection } from "astro:content";

export async function GET() {
  const workEntries = await getCollection("work");
  const paths = [
    "/",
    "/about/",
    "/contact/",
    "/work/",
    ...workEntries.map((entry) => `/work/${entry.data.slug}/`)
  ];
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
