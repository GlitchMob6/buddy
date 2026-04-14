import fs from 'fs';
import { compile } from 'svelte/compiler';

const code = fs.readFileSync('src/routes/Tasks.svelte', 'utf-8');
try {
  compile(code);
  console.log("SUCCESS");
} catch(e) {
  console.log("COMPILE ERROR:", e.message);
  console.log("LINE:", e.start ? e.start.line : "Unknown");
}
