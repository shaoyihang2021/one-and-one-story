#!/usr/bin/env node
/**
 * Build the two fully self-contained HTML editions:
 * - the original English game
 * - the independent Simplified Chinese edition
 *
 * Both bundle the ES modules with esbuild and inline every referenced image,
 * sound, music track, font and level file as data URIs, so either edition can
 * be downloaded and opened directly from disk.
 */
import { build } from "esbuild";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

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

async function collectFiles({ excludeChinese }) {
  const assetFiles = [
    ...await walk(join(ROOT, "assets")),
    join(ROOT, "favicon.svg"),
  ];
  const files = {};
  for (const file of assetFiles) {
    const key = relative(ROOT, file).split("\\").join("/");
    if (excludeChinese && (key.startsWith("assets/img/zh/") || key.includes("longcang-zh") || key.includes("OFL-LongCang"))) {
      continue;
    }
    const extension = extname(file).toLowerCase();
    const mime = MIME[extension];
    if (!mime) continue;
    files[key] = dataUri(await readFile(file), mime);
  }
  return files;
}

async function inlineCss(path, files) {
  const rawCss = await readFile(path, "utf8");
  const missingCssAssets = new Set();
  const css = rawCss.replace(/url\((["']?)(assets\/[^"')]+)\1\)/g, (match, quote, url) => {
    if (!files[url]) {
      missingCssAssets.add(url);
      return match;
    }
    return `url("${files[url]}")`;
  });
  if (missingCssAssets.size) {
    throw new Error(`Missing CSS assets: ${[...missingCssAssets].join(", ")}`);
  }
  return css;
}

async function buildEdition({ input, output, excludeChinese }) {
  const files = await collectFiles({ excludeChinese });
  const levels = JSON.parse(await readFile(join(ROOT, "data", "levels.json"), "utf8"));
  const embeddedText = escapeScript(JSON.stringify({ files, levels }));
  const embeddedScript = `window.__ONE_AND_ONE_EMBEDDED__ = ${embeddedText};`;

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

  let html = await readFile(input, "utf8");

  html = html.replace(
    '<link rel="icon" href="favicon.svg" type="image/svg+xml">',
    `<link rel="icon" href="${files["favicon.svg"]}" type="image/svg+xml">`,
  );

  // The local edition has no sibling manifest, social image, icon or preload
  // files; remove links that would only fail when opened from disk.
  html = html.replace(/\n  <link rel="manifest"[^>]*>/g, "");
  html = html.replace(/\n  <link rel="apple-touch-icon"[^>]*>/g, "");
  html = html.replace(/\n  <link rel="preload"[^>]*>/g, "");

  // Inline every local stylesheet referenced by the page.
  const styleLinks = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)];
  for (const match of styleLinks) {
    const stylePath = join(ROOT, match[1]);
    const css = await inlineCss(stylePath, files);
    html = html.replace(match[0], `<style>\n${css}\n</style>`);
  }

  // Inline static HUD icons and other plain image references.
  html = html.replace(/src="(assets\/[^"]+)"/g, (match, path) => {
    if (!files[path]) throw new Error(`Missing HTML asset: ${path}`);
    return `src="${files[path]}"`;
  });

  html = html.replace(
    '<script type="module" src="src/main.js"></script>',
    `<script>${embeddedScript}</script>\n  <script>${javascript}</script>`,
  );

  await mkdir(DIST, { recursive: true });
  await writeFile(output, html, "utf8");
  const size = (await readFile(output)).byteLength;
  console.log(`Built ${relative(ROOT, output)} (${(size / 1024 / 1024).toFixed(2)} MiB)`);
}

async function main() {
  await buildEdition({
    input: join(ROOT, "index.html"),
    output: join(DIST, "one-and-one-story.html"),
    excludeChinese: true,
  });
  await buildEdition({
    input: join(ROOT, "zh.html"),
    output: join(DIST, "one-and-one-story-zh.html"),
    excludeChinese: false,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
