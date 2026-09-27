import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, normalize, resolve } from "node:path";

const root = resolve(process.cwd(), "dist");
const types = { ".css":"text/css", ".html":"text/html", ".jpg":"image/jpeg", ".js":"text/javascript", ".json":"application/json", ".png":"image/png", ".svg":"image/svg+xml", ".webp":"image/webp" };

createServer((request, response) => {
  const requestPath = new URL(request.url ?? "/", "http://localhost").pathname;
  const target = resolve(root, `.${normalize(requestPath === "/" ? "/index.html" : requestPath)}`);
  if (!target.startsWith(root) || !existsSync(target)) { response.writeHead(404); response.end("Not found"); return; }
  response.writeHead(200, { "Content-Type": `${types[extname(target)] ?? "application/octet-stream"}; charset=utf-8`, "Cache-Control":"no-store" });
  createReadStream(target).pipe(response);
}).listen(4173, () => console.log("Coolab preview: http://localhost:4173"));
