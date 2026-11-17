// Prepare the disposable database BEFORE Nest creates any connection pools.
// Playwright runs globalSetup after webServer startup, so preparation cannot live there.
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const backend = path.join(__dirname, "..", "backend");

(async () => {
  await require("../backend/test/prepare-db.js")();
  execFileSync(process.execPath, [path.join(backend, "node_modules", "@nestjs", "cli", "bin", "nest.js"), "build"], {
    cwd: backend, stdio: "inherit"
  });
  require(path.join(backend, "dist", "main.js"));
})().catch(error => { console.error(error); process.exitCode = 1; });
