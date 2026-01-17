const fs = require("fs/promises");
const path = require("path");

const SITE_DIR = path.join(__dirname, "..", "_site");
const SOURCE_DIR = path.join(__dirname, "..", "src", "images");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif"]);

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

function stripWidthSuffix(relativePath) {
  const ext = path.posix.extname(relativePath);
  const dir = path.posix.dirname(relativePath);
  const base = path.posix.basename(relativePath, ext);
  const normalizedBase = base.replace(/-\d+w$/, "");
  if (dir === ".") return normalizedBase;
  return `${dir}/${normalizedBase}`;
}

async function buildSourceIndex() {
  const allFiles = await walkFiles(SOURCE_DIR);
  const sourceImages = allFiles.filter((file) =>
    IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase())
  );

  const baseToSources = new Map();
  const allSources = new Set();

  for (const file of sourceImages) {
    const relative = path.relative(SOURCE_DIR, file).split(path.sep).join("/");
    const base = relative.replace(path.extname(relative), "");
    if (!baseToSources.has(base)) baseToSources.set(base, []);
    baseToSources.get(base).push(relative);
    allSources.add(relative);
  }

  return { baseToSources, allSources };
}

async function checkUnusedImages() {
  let htmlFiles = [];
  try {
    const allFiles = await walkFiles(SITE_DIR);
    htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
  } catch (error) {
    console.warn("Unused image check skipped: _site not found.");
    return;
  }

  const { baseToSources, allSources } = await buildSourceIndex();
  const usedSources = new Set();

  for (const file of htmlFiles) {
    const html = await fs.readFile(file, "utf8");
    const srcs = extractImageUrls(html);
    for (const src of srcs) {
      const normalized = normalizeUrl(src);
      if (!normalized || !normalized.startsWith("images/")) continue;
      const relativeImage = normalized.slice("images/".length);
      if (!relativeImage) continue;
      const baseKey = stripWidthSuffix(relativeImage);
      const sources = baseToSources.get(baseKey);
      if (!sources) continue;
      for (const source of sources) {
        usedSources.add(source);
      }
    }
  }

  const unused = Array.from(allSources).filter((source) => !usedSources.has(source));
  if (unused.length) {
    console.error("Unused image check: source images not referenced in built HTML.");
    for (const file of unused.sort()) {
      console.error(`- ${file}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Unused image check: no unused source images found.");
  }
}

checkUnusedImages().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
