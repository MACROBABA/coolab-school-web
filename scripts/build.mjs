import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const outputDirectory = resolve(projectDirectory, "dist");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(resolve(projectDirectory, "index.html"), resolve(outputDirectory, "index.html"));
await cp(resolve(projectDirectory, "coolab-nedir.html"), resolve(outputDirectory, "coolab-nedir.html"));
await cp(resolve(projectDirectory, "fealiyyetler.html"), resolve(outputDirectory, "fealiyyetler.html"));
await cp(resolve(projectDirectory, "portal.html"), resolve(outputDirectory, "portal.html"));
await cp(resolve(projectDirectory, "proqram.html"), resolve(outputDirectory, "proqram.html"));
await cp(resolve(projectDirectory, "sebet.html"), resolve(outputDirectory, "sebet.html"));
await cp(resolve(projectDirectory, "details.css"), resolve(outputDirectory, "details.css"));
await cp(resolve(projectDirectory, "program-sales.css"), resolve(outputDirectory, "program-sales.css"));
await cp(resolve(projectDirectory, "experience.js"), resolve(outputDirectory, "experience.js"));
await cp(resolve(projectDirectory, "auth.js"), resolve(outputDirectory, "auth.js"));
await cp(resolve(projectDirectory, "assistant-widget.js"), resolve(outputDirectory, "assistant-widget.js"));
await cp(resolve(projectDirectory, "portal.js"), resolve(outputDirectory, "portal.js"));
await cp(resolve(projectDirectory, "shop.js"), resolve(outputDirectory, "shop.js"));
await cp(resolve(projectDirectory, "program-sales.js"), resolve(outputDirectory, "program-sales.js"));
await cp(resolve(projectDirectory, "site-content.js"), resolve(outputDirectory, "site-content.js"));
await cp(resolve(projectDirectory, "i18n.js"), resolve(outputDirectory, "i18n.js"));
await cp(resolve(projectDirectory, "assets"), resolve(outputDirectory, "assets"), { recursive: true });
