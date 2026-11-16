import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "node_modules", "stockfish", "bin");
const targetDir = join(root, "public");
mkdirSync(targetDir, { recursive: true });

for (const name of ["stockfish-19-lite-single.js", "stockfish-19-lite-single.wasm"]) {
  copyFileSync(join(sourceDir, name), join(targetDir, name));
}
