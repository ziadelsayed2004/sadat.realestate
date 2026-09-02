import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientAssets = path.resolve(appRoot, 'dist/client/assets');
const maxJavaScriptChunkBytes = 650 * 1024;
const maxJavaScriptBytes = 2_500 * 1024;
const maxStylesheetBytes = 450 * 1024;
const files = readdirSync(clientAssets)
  .map(name => path.join(clientAssets, name))
  .filter(file => statSync(file).isFile());
const javascript = files.filter(file => file.endsWith('.js'));
const stylesheets = files.filter(file => file.endsWith('.css'));
const javascriptBytes = javascript.reduce((total, file) => total + statSync(file).size, 0);
const stylesheetBytes = stylesheets.reduce((total, file) => total + statSync(file).size, 0);
const largestJavaScript = javascript.reduce((largest, file) => {
  const size = statSync(file).size;
  return size > largest.size ? { file, size } : largest;
}, { file: '', size: 0 });

console.log(`BUNDLE_BUDGET ${JSON.stringify({
  maxJavaScriptChunkBytes,
  maxJavaScriptBytes,
  maxStylesheetBytes,
  javascriptBytes,
  stylesheetBytes,
  largestJavaScript: {
    file: largestJavaScript.file === '' ? '' : path.relative(appRoot, largestJavaScript.file),
    bytes: largestJavaScript.size
  }
})}`);

const failures = [];
if (javascript.length === 0) failures.push('no JavaScript assets were emitted');
if (largestJavaScript.size > maxJavaScriptChunkBytes) failures.push(`largest JavaScript chunk exceeds ${maxJavaScriptChunkBytes} bytes`);
if (javascriptBytes > maxJavaScriptBytes) failures.push(`total JavaScript exceeds ${maxJavaScriptBytes} bytes`);
if (stylesheetBytes > maxStylesheetBytes) failures.push(`total stylesheets exceed ${maxStylesheetBytes} bytes`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`BUNDLE_BUDGET_FAILURE ${failure}`);
  process.exitCode = 1;
}
