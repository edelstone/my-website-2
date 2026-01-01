const fs = require("fs/promises");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");

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

function indexToLine(text, index) {
  return text.slice(0, index).split("\n").length;
}

function findPictureCalls(text) {
  const results = [];
  let index = 0;
  while ((index = text.indexOf("picture(", index)) !== -1) {
    let cursor = index + "picture(".length;
    while (/\s/.test(text[cursor])) cursor += 1;
    if (text[cursor] !== "{") {
      index = cursor;
      continue;
    }

    const start = cursor;
    let depth = 0;
    let inString = null;
    let escaped = false;
    for (let i = start; i < text.length; i += 1) {
      const char = text[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === inString) {
          inString = null;
        }
        continue;
      }
      if (char === "\"" || char === "'" || char === "`") {
        inString = char;
        continue;
      }
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          results.push({ start, end: i + 1 });
          index = i + 1;
          break;
        }
      }
    }
    index += 1;
  }
  return results;
}

async function checkImageAlt() {
  const allFiles = await walkFiles(SRC_DIR);
  const templates = allFiles.filter((file) => file.endsWith(".njk"));
  const issues = [];

  for (const file of templates) {
    const text = await fs.readFile(file, "utf8");
    const calls = findPictureCalls(text);
    for (const call of calls) {
      const block = text.slice(call.start, call.end);
      const hasAlt = /\balt\s*:/.test(block);
      const hasDecorative = /\bdecorative\s*:/.test(block);
      if (!hasAlt && !hasDecorative) {
        issues.push({
          file,
          line: indexToLine(text, call.start)
        });
      }
    }
  }

  if (issues.length) {
    console.error("Image alt check: missing alt or decorative flag.");
    for (const issue of issues) {
      const relativeFile = path.relative(process.cwd(), issue.file);
      console.error(`- ${relativeFile}:${issue.line}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Image alt check: all picture calls have alt or decorative.");
  }
}

checkImageAlt().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
