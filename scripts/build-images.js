const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const crypto = require("crypto");
const sharp = require("sharp");

const SOURCE_DIR = path.join(__dirname, "..", "src", "images");
const OUTPUT_DIR = path.join(__dirname, "..", "_site", "images");
const CACHE_DIR = path.join(__dirname, "..", ".cache", "images");
const WEBP_QUALITY = 80;

const PNG_EXTENSIONS = new Set([".png"]);
const JPG_EXTENSIONS = new Set([".jpg", ".jpeg"]);
const GIF_EXTENSIONS = new Set([".gif"]);
const NO_WEBP = new Set(["me-share.jpg"]);
const OXIPNG_LEVEL = process.env.OXIPNG_LEVEL || "3";
const CACHE_VERSION = "v1";

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

async function processPng(inputPath, cachePaths, outputPaths) {
  const [cachePng, cacheWebp] = cachePaths;
  const [outputPng, outputWebp] = outputPaths;

  await ensureDirForFile(cachePng);
  await sharp(inputPath)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(cachePng);

  try {
    await runOxipng(cachePng);
  } catch (error) {
    console.warn(`oxipng skipped for ${path.basename(cachePng)}: ${error.message}`);
  }

  await ensureDirForFile(cacheWebp);
  await sharp(inputPath)
    .webp({ lossless: true, effort: 6 })
    .toFile(cacheWebp);

  await copyFromCache(cachePng, outputPng);
  await copyFromCache(cacheWebp, outputWebp);
}

async function processJpg(inputPath, cachePaths, outputPaths) {
  const [cacheJpg, cacheWebp] = cachePaths;
  const [outputJpg, outputWebp] = outputPaths;

  await ensureDirForFile(cacheJpg);
  await sharp(inputPath)
    .jpeg({ quality: 100, mozjpeg: true })
    .toFile(cacheJpg);

  await copyFromCache(cacheJpg, outputJpg);

  if (cacheWebp) {
    await ensureDirForFile(cacheWebp);
    await sharp(inputPath)
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

  let processed = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  for (const file of images) {
    const extension = path.extname(file).toLowerCase();
    const fileBuffer = await fs.readFile(file);
    const baseSettings = {
      cacheVersion: CACHE_VERSION,
      ext: extension,
      webpQuality: WEBP_QUALITY,
      oxipngLevel: OXIPNG_LEVEL
    };
    if (PNG_EXTENSIONS.has(extension)) {
      const outputPng = getOutputPath(file, ".png");
      const outputWebp = getOutputPath(file, ".webp");
      const hash = hashWithSettings(fileBuffer, {
        ...baseSettings,
        webpLossless: true,
        format: "png"
      });
      const cachePng = getCachePath(hash, outputPng);
      const cacheWebp = getCachePath(hash, outputWebp);
      const hit = await Promise.all([cachePng, cacheWebp].map(async (p) => {
        try {
          await fs.access(p);
          return true;
        } catch {
          return false;
        }
      }));
      if (hit.every(Boolean)) {
        await copyFromCache(cachePng, outputPng);
        await copyFromCache(cacheWebp, outputWebp);
        cacheHits += 1;
      } else {
        await processPng(file, [cachePng, cacheWebp], [outputPng, outputWebp]);
        cacheMisses += 1;
      }
      processed += 1;
      continue;
    }

    if (JPG_EXTENSIONS.has(extension)) {
      const outputJpg = getOutputPath(file, path.extname(file));
      const shouldSkipWebp = NO_WEBP.has(path.basename(file));
      const outputWebp = shouldSkipWebp ? null : getOutputPath(file, ".webp");
      const hash = hashWithSettings(fileBuffer, {
        ...baseSettings,
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
          [cacheJpg, cacheWebp],
          [outputJpg, outputWebp]
        );
        cacheMisses += 1;
      }
      processed += 1;
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

  console.log(`Processed ${processed} image(s).`);
  console.log(`Cache hits: ${cacheHits}, cache misses: ${cacheMisses}.`);
}

buildImages().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
