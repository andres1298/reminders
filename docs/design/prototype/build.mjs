// Genera lukas-prototype.html: el prototipo en un solo archivo, con styles.css,
// icons.js y lukas-art.js del sistema en línea (para publicarlo o abrirlo sin carpetas).
// Uso: node docs/design/prototype/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, 'index.html'), 'utf8');

const out = src.replace(/<!--INLINE:(.+?)-->[\s\S]*?<!--\/INLINE-->/g, (_, rel) => {
  const body = readFileSync(resolve(here, rel), 'utf8');
  return rel.endsWith('.css') ? `<style>\n${body}\n</style>` : `<script>\n${body}\n</script>`;
}).replace('href="../system/index.html"', 'href="https://github.com/andres1298/reminders/tree/claude/lukas-design-system/docs/design/system"');

writeFileSync(resolve(here, 'lukas-prototype.html'), out);
console.log(`lukas-prototype.html · ${(out.length / 1024).toFixed(1)} KB`);

// --artifact <ruta>: fragmento para publicar como Artifact de claude.ai (el visor pone su
// propio <html>/<head>/<body> y ya rellena las áreas seguras del teléfono).
const i = process.argv.indexOf('--artifact');
if (i > 0) {
  const frag = out
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>|<\/html>|<head>|<\/head>|<\/body>/g, '')
    .replace(/<meta [^>]*>\s*/g, '')
    .replace(/<title>.*?<\/title>/, '<title>Prototipo Lukas</title>')
    .replace('<body class="proto">', `<script>document.body.classList.add('proto')</script>
<style>
body.proto{overflow:auto}
@media (max-width:520px),(max-height:700px) and (max-width:900px){
  html,body{height:100%}
  .device{height:100%}
  .app{--safe-top:0px;--safe-bottom:0px}
}
</style>`);
  writeFileSync(resolve(process.argv[i + 1]), frag);
  console.log(`artifact · ${(frag.length / 1024).toFixed(1)} KB`);
}
