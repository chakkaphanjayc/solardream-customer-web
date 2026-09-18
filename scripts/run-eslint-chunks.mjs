import { existsSync, readdirSync } from "node:fs";
import { resolve, extname, relative } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const eslintBinary = resolve(projectRoot, "node_modules/.bin/eslint");
const chunkSize = 50;
const lintableExtensions = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const ignoredDirectories = new Set([
  ".agents",
  ".git",
  ".next",
  ".open-next",
  ".turbo",
  "build",
  "coverage",
  "generated",
  "node_modules",
  "out",
  "public",
  "scratch",
  "scripts",
]);

if (!existsSync(eslintBinary)) {
  throw new Error(`ESLint binary not found at ${eslintBinary}`);
}

function collectLintFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      files.push(...collectLintFiles(resolve(directory, entry.name)));
      continue;
    }

    if (!entry.isFile() || !lintableExtensions.has(extname(entry.name))) {
      continue;
    }

    files.push(resolve(directory, entry.name));
  }

  return files;
}

const files = collectLintFiles(projectRoot).sort();
const extraArgs = process.argv.slice(2);

console.log(`Linting ${files.length} files in chunks of ${chunkSize}...`);

for (let offset = 0; offset < files.length; offset += chunkSize) {
  const chunk = files.slice(offset, offset + chunkSize);
  const chunkNumber = Math.floor(offset / chunkSize) + 1;
  const totalChunks = Math.ceil(files.length / chunkSize);
  console.log(`\nESLint chunk ${chunkNumber}/${totalChunks}`);

  const result = spawnSync(eslintBinary, [...extraArgs, ...chunk], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nESLint completed successfully.");
