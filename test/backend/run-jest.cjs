const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "../..");
const jestBin = require.resolve("jest/bin/jest", { paths: [rootDir] });
const configPath = path.join(rootDir, "test", "backend", "jest.config.cjs");

const storageDir = path.join(rootDir, "test", "backend", ".jest-localstorage");
const storagePathPosix = path.join(storageDir, "localstorage.sqlite");
fs.mkdirSync(storageDir, { recursive: true });
fs.writeFileSync(storagePathPosix, "", { flag: "a" });

function toWindowsPath(p) {
  if (process.platform !== "win32") return p;
  const m = /^\/mnt\/([a-z])\/(.*)$/i.exec(p.replace(/\\/g, "/"));
  if (!m) return p;
  const drive = m[1].toUpperCase();
  const rest = m[2].replace(/\//g, "\\");
  return `${drive}:\\${rest}`;
}

const storagePath = toWindowsPath(storagePathPosix);
const extraArgs = process.argv.slice(2);

const env = {
  ...process.env,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS + " " : ""}--localstorage-file=${storagePath}`,
};

const result = spawnSync(process.execPath, [jestBin, "--config", configPath, ...extraArgs], {
  cwd: rootDir,
  stdio: "inherit",
  env,
});

process.exit(result.status === null ? 1 : result.status);
