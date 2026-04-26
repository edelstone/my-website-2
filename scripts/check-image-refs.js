const fs = require("fs/promises");
const path = require("path");

const SITE_DIR = path.join(__dirname, "..", "dist");

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeUrl(url) {
  if (!url) return null;
  const cleaned = url.split(/[?#]/)[0];
  if (/^(data:|mailto:|tel:)/i.test(cleaned)) return null;
  if (/^https?:\/\//i.test(cleaned)) {
    try {
      return new URL(cleaned).pathname.replace(/^\/+/, "");
    } catch {
      return null;
    }
  }
  if (cleaned.startsWith("//")) {
    try {
      return new URL(`https:${cleaned}`).pathname.replace(/^\/+/, "");
    } catch {
      return null;
    }
  }
  if (cleaned.startsWith("/")) return cleaned.slice(1);
  if (cleaned.startsWith("./")) return cleaned.slice(2);
  return cleaned;
}

function parseAttribute(tag, name) {
  const regex = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  const match = tag.match(regex);
  return match ? match[1] : null;
}

function extractImageUrls(html) {
  const sources = new Map();
  const srcRegex = /<(?:img|source)\b[^>]*?\s(src|srcset)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = srcRegex.exec(html))) {
    const attr = match[1].toLowerCase();
    const value = match[2];
    if (!value) continue;
    if (attr === "srcset") {
      const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
      for (const entry of entries) {
        const url = entry.split(/\s+/)[0];
        if (url) sources.set(url, true);
      }
    } else {
      sources.set(value, true);
    }
  }

  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const prop = parseAttribute(tag, "property") || parseAttribute(tag, "name");
    const content = parseAttribute(tag, "content");
    if (!prop || !content) continue;
    const key = prop.toLowerCase();
    if (["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"].includes(key)) {
      sources.set(content, true);
    }
  }

  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    const rel = parseAttribute(tag, "rel");
    const href = parseAttribute(tag, "href");
    if (!rel || !href) continue;
    if (rel.toLowerCase().includes("icon")) {
      sources.set(href, true);
    }
  }

  return Array.from(sources.keys());
}

async function checkImages() {
  let htmlFiles = [];
  try {
    const allFiles = await walkFiles(SITE_DIR);
    htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
  } catch (error) {
    console.warn("Image check skipped: dist not found.");
    return;
  }

  const missing = [];
  for (const file of htmlFiles) {
    const html = await fs.readFile(file, "utf8");
    const srcs = extractImageUrls(html);
    for (const src of srcs) {
      const normalized = normalizeUrl(src);
      if (!normalized || !normalized.startsWith("images/")) continue;
      const diskPath = path.join(SITE_DIR, normalized);
      try {
        await fs.access(diskPath);
      } catch {
        missing.push({ file, src });
      }
    }
  }

  if (missing.length) {
    console.error("Image reference check: missing files detected.");
    for (const entry of missing) {
      const relativeFile = path.relative(SITE_DIR, entry.file);
      console.error(`- ${entry.src} referenced in ${relativeFile}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Image reference check: no missing files found.");
  }
}

checkImages().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
