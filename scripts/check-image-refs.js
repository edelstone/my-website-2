const fs = require("fs/promises");
const path = require("path");

const SITE_DIR = path.join(__dirname, "..", "_site");

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
  if (/^(https?:|data:|mailto:|tel:)/i.test(url)) return null;
  const cleaned = url.split(/[?#]/)[0];
  if (cleaned.startsWith("/")) {
    return cleaned.slice(1);
  }
  if (cleaned.startsWith("./")) {
    return cleaned.slice(2);
  }
  return cleaned;
}

function extractSrcs(html) {
  const sources = new Map();
  const srcRegex = /<(?:img|source)[^>]+?\s(?:src|srcset)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = srcRegex.exec(html))) {
    const value = match[1];
    if (!value) continue;
    if (match[0].includes("srcset")) {
      const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
      for (const entry of entries) {
        const url = entry.split(/\s+/)[0];
        if (url) {
          sources.set(url, true);
        }
      }
    } else {
      sources.set(value, true);
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
    console.warn("Image check skipped: _site not found.");
    return;
  }

  const missing = [];
  for (const file of htmlFiles) {
    const html = await fs.readFile(file, "utf8");
    const srcs = extractSrcs(html);
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
