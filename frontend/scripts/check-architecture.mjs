import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/", import.meta.url));
const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
const files = walk(root).filter((file) => /\.jsx?$/.test(file));
const relative = (file) => path.relative(root, file).replaceAll("\\", "/");
const featureOf = (file) => relative(file).match(/^features\/([^/]+)\//)?.[1];
const errors = [];
const graph = new Map();

function resolveLocal(file, specifier) {
  const target = path.resolve(path.dirname(file), specifier.split("?")[0]);
  return [
    target,
    `${target}.js`,
    `${target}.jsx`,
    path.join(target, "index.js"),
    path.join(target, "index.jsx"),
  ].find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const imports = [
    ...source.matchAll(
      /\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?["']([^"']+)["']/g,
    ),
    ...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g),
  ]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith("."));
  const dependencies = [];
  for (const specifier of imports) {
    const target = resolveLocal(file, specifier);
    if (!target) {
      errors.push(`${relative(file)}: missing import ${specifier}`);
      continue;
    }
    const fromFeature = featureOf(file);
    const toFeature = featureOf(target);
    if (fromFeature && toFeature && fromFeature !== toFeature)
      errors.push(`${relative(file)}: imports peer feature ${toFeature}`);
    if (
      fromFeature &&
      /^(app\/|App\.jsx$|AdminPanel\.jsx$|LibraryArchivePanel\.jsx$)/.test(
        relative(target),
      )
    )
      errors.push(`${relative(file)}: imports the application layer`);
    if (
      relative(file).startsWith("shared/") &&
      (toFeature || relative(target).startsWith("app/"))
    )
      errors.push(
        `${relative(file)}: shared module depends on a feature or application`,
      );
    if (
      relative(file).startsWith("app/") &&
      toFeature &&
      !/^features\/[^/]+\/index\.jsx?$/.test(relative(target))
    )
      errors.push(`${relative(file)}: use the ${toFeature} public entry point`);
    if (/\.jsx?$/.test(target)) dependencies.push(target);
  }
  if (/\bfetch\s*\(/.test(source) && relative(file) !== "shared/api/http.js")
    errors.push(
      `${relative(file)}: send requests through its feature API and shared transport`,
    );
  graph.set(file, dependencies);
}

const visited = new Set();
const active = new Set();
function visit(file, trail = []) {
  if (active.has(file)) {
    errors.push(
      `Import cycle: ${[...trail.slice(trail.indexOf(file)), file].map(relative).join(" -> ")}`,
    );
    return;
  }
  if (visited.has(file)) return;
  active.add(file);
  for (const dependency of graph.get(file) || [])
    visit(dependency, [...trail, file]);
  active.delete(file);
  visited.add(file);
}
for (const file of files) visit(file);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Architecture checks passed: ${files.length} modules, isolated features, public app imports, no import cycles, shared HTTP transport.`,
  );
}
