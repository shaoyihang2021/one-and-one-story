#!/usr/bin/env node
/**
 * Build a fully self-contained HTML file:
 * - bundles the ES modules with esbuild
 * - inlines every image, sound, music track, font and level file as data URIs
 * - inlines styles, the favicon and the game boot script
 *
 * The resulting file can be downloaded and opened directly from disk.
 */
import { build } from "esbuild";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const OUTPUT = join(DIST, "one-and-one-story.html");

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function dataUri(buffer, mime) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function escapeScript(value) {
  return value.replace(/<\/script/gi, "<\\/script");
}

async function main() {
  const assetFiles = [
    ...await walk(join(ROOT, "assets")),
    join(ROOT, "favicon.svg"),
  ];
  const files = {};
  for (const file of assetFiles) {
    const key = relative(ROOT, file).split("\\").join("/");
    const extension = extname(file).toLowerCase();
    const mime = MIME[extension];
    if (!mime) continue;
    files[key] = dataUri(await readFile(file), mime);
  }

  const levels = JSON.parse(await readFile(join(ROOT, "data", "levels.json"), "utf8"));
  const embeddedText = escapeScript(JSON.stringify({ files, levels }));
  const embeddedScript = `window.__ONE_AND_ONE_EMBEDDED__ = ${embeddedText};`;

  const rawCss = await readFile(join(ROOT, "styles.css"), "utf8");
  const missingCssAssets = new Set();
  const css = rawCss.replace(/url\((["']?)(assets\/[^"')]+)\1\)/g, (match, quote, path) => {
    if (!files[path]) {
      missingCssAssets.add(path);
      return match;
    }
    return `url("${files[path]}")`;
  });
  if (missingCssAssets.size) {
    throw new Error(`Missing CSS assets: ${[...missingCssAssets].join(", ")}`);
  }

  const bundle = await build({
    entryPoints: [join(ROOT, "src", "main.js")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    minify: true,
    legalComments: "none",
    charset: "utf8",
  });
  const javascript = escapeScript(bundle.outputFiles[0].text);

  let html = await readFile(join(ROOT, "index.html"), "utf8");

  html = html.replace(
    '<link rel="icon" href="favicon.svg" type="image/svg+xml">',
    `<link rel="icon" href="${files["favicon.svg"]}" type="image/svg+xml">`,
  );

  // Inline the three static HUD icons.
  html = html.replace(/src="(assets\/[^"]+)"/g, (match, path) => {
    if (!files[path]) throw new Error(`Missing HTML asset: ${path}`);
    return `src="${files[path]}"`;
  });

  html = html.replace(
    '<link rel="stylesheet" href="styles.css">',
    `<style>\n${css}\n</style>`,
  );
  html = html.replace(
    '<script type="module" src="src/main.js"></script>',
    `<script>${embeddedScript}</script>\n  <script>${javascript}</script>`,
  );

  await mkdir(DIST, { recursive: true });
  await writeFile(OUTPUT, html, "utf8");
  const size = (await readFile(OUTPUT)).byteLength;
  console.log(`Built ${relative(ROOT, OUTPUT)} (${(size / 1024 / 1024).toFixed(2)} MiB)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
