const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const crypto = require("crypto");
const sharp = require("sharp");

const SOURCE_DIR = path.join(__dirname, "..", "src", "images");
const OUTPUT_DIR = path.join(__dirname, "..", "_site", "images");
const CACHE_DIR = path.join(__dirname, "..", ".cache", "images");
const MANIFEST_PATH = path.join(__dirname, "..", "src", "_data", "imageMeta.json");
const WEBP_QUALITY = 80;
const RESPONSIVE_WIDTHS = [800, 1400, 2000];

const PNG_EXTENSIONS = new Set([".png"]);
const JPG_EXTENSIONS = new Set([".jpg", ".jpeg"]);
const GIF_EXTENSIONS = new Set([".gif"]);

// Files listed here will NOT get WebP variants.
// Use for assets that must remain in their original format.
const NO_WEBP = new Set(["me-share.jpg", "tock-icon.png"]);

// Files listed here will NOT get responsive size variants.
// Use for assets where resizing provides no benefit.
const NO_RESPONSIVE = new Set(["me-share.jpg", "tock-icon.png"]);

// PNG compression level for oxipng (lossless).
// 0–6: 0 = fastest/minimal, 3 = balanced default, 6 = slowest/max compression
// One-off override: OXIPNG_LEVEL=4 npm run build
const OXIPNG_LEVEL = process.env.OXIPNG_LEVEL || "3";

const CACHE_VERSION = "v2";

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

function getOutputPath(inputPath, newExtension) {
  const relativePath = path.relative(SOURCE_DIR, inputPath);
  const base = relativePath.replace(path.extname(relativePath), newExtension);
  return path.join(OUTPUT_DIR, base);
}

function getRelativeBase(inputPath) {
  const relativePath = path.relative(SOURCE_DIR, inputPath);
  const normalized = relativePath.split(path.sep).join("/");
  return normalized.replace(path.extname(normalized), "");
}

function getOutputPathForWidth(inputPath, newExtension, width) {
  const relativePath = path.relative(SOURCE_DIR, inputPath);
  const dir = path.dirname(relativePath);
  const baseName = path.basename(relativePath, path.extname(relativePath));
  const filename = `${baseName}-${width}w${newExtension}`;
  return path.join(OUTPUT_DIR, dir, filename);
}

async function ensureDirForFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function hashWithSettings(buffer, settings) {
  const hash = crypto.createHash("sha256");
  hash.update(buffer);
  hash.update(JSON.stringify(settings));
  return hash.digest("hex");
}

function getCachePath(hash, outputPath) {
  const relativeOutput = path.relative(OUTPUT_DIR, outputPath);
  return path.join(CACHE_DIR, hash, relativeOutput);
}

async function copyFromCache(cachePath, outputPath) {
  await ensureDirForFile(outputPath);
  await fs.copyFile(cachePath, outputPath);
}

function runOxipng(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      "oxipng",
      ["-o", OXIPNG_LEVEL, "--strip", "all", filePath],
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
}

async function processPng(inputPath, width, cachePaths, outputPaths) {
  const [cachePng, cacheWebp] = cachePaths;
  const [outputPng, outputWebp] = outputPaths;
  const pipeline = sharp(inputPath);
  const resized = width
    ? pipeline.resize({ width, withoutEnlargement: true })
    : pipeline;

  await ensureDirForFile(cachePng);
  await resized
    .clone()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(cachePng);

  try {
    await runOxipng(cachePng);
  } catch (error) {
    console.warn(`oxipng skipped for ${path.basename(cachePng)}: ${error.message}`);
  }

  await copyFromCache(cachePng, outputPng);
  if (cacheWebp && outputWebp) {
    await ensureDirForFile(cacheWebp);
    await resized
      .clone()
      .webp({ lossless: true, effort: 6 })
      .toFile(cacheWebp);
    await copyFromCache(cacheWebp, outputWebp);
  }
}

async function processJpg(inputPath, width, cachePaths, outputPaths) {
  const [cacheJpg, cacheWebp] = cachePaths;
  const [outputJpg, outputWebp] = outputPaths;
  const pipeline = sharp(inputPath);
  const resized = width
    ? pipeline.resize({ width, withoutEnlargement: true })
    : pipeline;

  await ensureDirForFile(cacheJpg);
  await resized
    .clone()
    .jpeg({ quality: 100, mozjpeg: true })
    .toFile(cacheJpg);

  await copyFromCache(cacheJpg, outputJpg);

  if (cacheWebp) {
    await ensureDirForFile(cacheWebp);
    await resized
      .clone()
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toFile(cacheWebp);

    await copyFromCache(cacheWebp, outputWebp);
  }
}

async function processGif(inputPath, cachePaths, outputPaths) {
  const [cacheGif] = cachePaths;
  const [outputGif] = outputPaths;
  await ensureDirForFile(cacheGif);
  await fs.copyFile(inputPath, cacheGif);
  await copyFromCache(cacheGif, outputGif);
}

async function buildImages() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const allFiles = await walkFiles(SOURCE_DIR);
  const images = allFiles.filter((file) =>
    [".png", ".jpg", ".jpeg", ".gif"].includes(path.extname(file).toLowerCase())
  );

  const imageMeta = {};

  let processed = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  for (const file of images) {
    const extension = path.extname(file).toLowerCase();
    const extName = extension.slice(1);
    const fileBuffer = await fs.readFile(file);
    const baseSettings = {
      cacheVersion: CACHE_VERSION,
      ext: extension,
      webpQuality: WEBP_QUALITY,
      oxipngLevel: OXIPNG_LEVEL
    };
    const isResponsive = !NO_RESPONSIVE.has(path.basename(file));
    const widths = isResponsive ? [null, ...RESPONSIVE_WIDTHS] : [null];
    const canResize = PNG_EXTENSIONS.has(extension) || JPG_EXTENSIONS.has(extension);
    if (canResize) {
      const metadata = await sharp(fileBuffer).metadata();
      if (metadata.width && metadata.height) {
        const baseKey = `${getRelativeBase(file)}.${extName}`;
        const sizes = {};
        for (const width of RESPONSIVE_WIDTHS) {
          const actualWidth = Math.min(width, metadata.width);
          const actualHeight = Math.round(metadata.height * (actualWidth / metadata.width));
          sizes[String(width)] = {
            width: actualWidth,
            height: actualHeight
          };
        }
        imageMeta[baseKey] = {
          widths: sizes
        };
      }
    }
    if (PNG_EXTENSIONS.has(extension)) {
      const shouldSkipWebp = NO_WEBP.has(path.basename(file));
      for (const width of widths) {
        const outputPng = width
          ? getOutputPathForWidth(file, ".png", width)
          : getOutputPath(file, ".png");
        const outputWebp = shouldSkipWebp
          ? null
          : width
            ? getOutputPathForWidth(file, ".webp", width)
            : getOutputPath(file, ".webp");
        const hash = hashWithSettings(fileBuffer, {
          ...baseSettings,
          width,
          webpLossless: shouldSkipWebp ? null : true,
          format: "png"
        });
        const cachePng = getCachePath(hash, outputPng);
        const cacheWebp = outputWebp ? getCachePath(hash, outputWebp) : null;
        const expected = [cachePng, cacheWebp].filter(Boolean);
        const hit = await Promise.all(expected.map(async (p) => {
          try {
            await fs.access(p);
            return true;
          } catch {
            return false;
          }
        }));
        if (hit.every(Boolean)) {
          await copyFromCache(cachePng, outputPng);
          if (cacheWebp && outputWebp) {
            await copyFromCache(cacheWebp, outputWebp);
          }
          cacheHits += 1;
        } else {
          await processPng(
            file,
            width,
            [cachePng, cacheWebp],
            [outputPng, outputWebp]
          );
          cacheMisses += 1;
        }
        processed += 1;
      }
      continue;
    }

    if (JPG_EXTENSIONS.has(extension)) {
      const shouldSkipWebp = NO_WEBP.has(path.basename(file));
      for (const width of widths) {
        const outputJpg = width
          ? getOutputPathForWidth(file, path.extname(file), width)
          : getOutputPath(file, path.extname(file));
        const outputWebp = shouldSkipWebp
          ? null
          : width
            ? getOutputPathForWidth(file, ".webp", width)
            : getOutputPath(file, ".webp");
        const hash = hashWithSettings(fileBuffer, {
          ...baseSettings,
          width,
          format: "jpeg",
          webpQuality: shouldSkipWebp ? null : WEBP_QUALITY,
          webpLossy: !shouldSkipWebp
        });
        const cacheJpg = getCachePath(hash, outputJpg);
        const cacheWebp = outputWebp ? getCachePath(hash, outputWebp) : null;
        const expected = [cacheJpg, cacheWebp].filter(Boolean);
        const hit = await Promise.all(expected.map(async (p) => {
          try {
            await fs.access(p);
            return true;
          } catch {
            return false;
          }
        }));
        if (hit.every(Boolean)) {
          await copyFromCache(cacheJpg, outputJpg);
          if (cacheWebp && outputWebp) {
            await copyFromCache(cacheWebp, outputWebp);
          }
          cacheHits += 1;
        } else {
          await processJpg(
            file,
            width,
            [cacheJpg, cacheWebp],
            [outputJpg, outputWebp]
          );
          cacheMisses += 1;
        }
        processed += 1;
      }
      continue;
    }

    if (GIF_EXTENSIONS.has(extension)) {
      const outputGif = getOutputPath(file, ".gif");
      const hash = hashWithSettings(fileBuffer, {
        ...baseSettings,
        format: "gif"
      });
      const cacheGif = getCachePath(hash, outputGif);
      try {
        await fs.access(cacheGif);
        await copyFromCache(cacheGif, outputGif);
        cacheHits += 1;
      } catch {
        await processGif(file, [cacheGif], [outputGif]);
        cacheMisses += 1;
      }
      processed += 1;
    }
  }

  console.log(`Processed ${processed} image variant(s).`);
  console.log(`Cache hits: ${cacheHits}, cache misses: ${cacheMisses}.`);

  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(imageMeta, null, 2));
}

buildImages().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
