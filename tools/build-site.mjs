#!/usr/bin/env node
/**
 * Generate sw.js with a content-addressed cache version and the list of
 * static files the game requests. Keeping the version inside sw.js makes
 * browsers notice the update whenever a shipped asset or module changes.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = join(ROOT, "tools", "sw-template.js");
const OUTPUT = join(ROOT, "sw.js");
const LISTED = ["index.html", "styles.css", "favicon.svg", "manifest.webmanifest"];

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

function webPath(file) {
  return relative(ROOT, file).split("\\").join("/");
}

async function main() {
  const roots = [
    join(ROOT, "assets"),
    join(ROOT, "data"),
    join(ROOT, "src"),
    join(ROOT, "icons"),
  ];
  const files = [];
  for (const root of roots) {
    try {
      files.push(...await walk(root));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  for (const file of LISTED) files.push(join(ROOT, file));

  // The precache URL must be relative to the service worker's scope so the
  // same build works at /one-and-one-story/ and at a domain root.
  const extensions = new Set([
    ".html", ".css", ".js", ".json", ".webmanifest", ".svg", ".png",
    ".jpg", ".jpeg", ".webp", ".woff", ".woff2", ".mp3", ".wav",
  ]);
  const assets = [...new Set(["./", ...files.map(webPath)])]
    .filter((path) => path === "./" || extensions.has(extname(path)))
    .sort((a, b) => (a === "./" ? -1 : b === "./" ? 1 : a.localeCompare(b)));

  const hash = createHash("sha256");
  for (const path of assets) {
    const target = path === "./" ? join(ROOT, "index.html") : join(ROOT, path);
    try {
      hash.update(path);
      hash.update(await readFile(target));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const version = hash.digest("hex").slice(0, 10);
  const template = await readFile(TEMPLATE, "utf8");
  const output = template
    .replace("__BUILD_VERSION__", version)
    .replace("__PRECACHE__", JSON.stringify(assets, null, 2));

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, output);
  console.log(`Generated sw.js (${assets.length} entries, version ${version})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
