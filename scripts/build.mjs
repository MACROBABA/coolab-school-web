import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const outputDirectory = resolve(projectDirectory, "dist");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(resolve(projectDirectory, "index.html"), resolve(outputDirectory, "index.html"));
await cp(resolve(projectDirectory, "experience.js"), resolve(outputDirectory, "experience.js"));
await cp(resolve(projectDirectory, "assets"), resolve(outputDirectory, "assets"), { recursive: true });
