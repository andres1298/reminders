// Genera los íconos PNG de la PWA a partir de la ilustración de Lukas.
// Uso: node scripts/generate-icons.mjs   (necesita Playwright con Chromium instalado)
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const art = (await import(resolve(root, "src/components/lukas/lukas-art.js"))).default;
const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = createRequire(process.env.NODE_PATH ? `${process.env.NODE_PATH}/` : "/")("playwright");
}

const CREAM = "#FBF6DC";
/** SVG con colores literales (las variables CSS no se resuelven en un .svg suelto). */
const flat = (svg) =>
  svg
    .replace(/var\(--art-paper, (#[0-9A-Fa-f]+)\)/g, "$1")
    .replace(/var\(--art-eye, (#[0-9A-Fa-f]+)\)/g, "$1")
    .replace(/var\(--art-calico, (#[0-9A-Fa-f]+)\)/g, "$1")
    .replace(/currentColor/g, "#151515")
    .replace(/ style="[^"]*"/, "")
    .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');

const rounded = flat(art.icon({ idPrefix: "icon" }));
const square = flat(art.icon({ idPrefix: "sq", radius: 0 }));
writeFileSync(resolve(root, "src/app/icon.svg"), rounded);

const browser = await playwright.chromium.launch();
const page = await browser.newPage();
async function png(svg, size, out, { pad = 0 } = {}) {
  // pad: margen (fracción) para la zona segura de los íconos "maskable" (80 % central)
  const inner = Math.round(size * (1 - pad * 2));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;background:${CREAM};display:grid;place-items:center;width:${size}px;height:${size}px">` +
      svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `) +
      "</body>",
  );
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out });
}
await png(square, 180, resolve(root, "src/app/apple-icon.png"));
await png(square, 192, resolve(root, "public/icons/icon-192.png"));
await png(square, 512, resolve(root, "public/icons/icon-512.png"));
await png(square, 512, resolve(root, "public/icons/maskable-512.png"), { pad: 0.1 });
await browser.close();
console.log("íconos generados");
