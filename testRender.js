import fs from 'fs';
import { compile } from 'svelte/compiler';

const code = fs.readFileSync('src/routes/Tasks.svelte', 'utf-8');
const compiled = compile(code, {
    format: 'cjs',
    generate: 'ssr'
});
fs.writeFileSync('Tasks.cjs', compiled.js.code);
