import fs from 'node:fs';
const state = JSON.parse(fs.readFileSync('docs/quality/figma_parity/screens/PUB-03/deterministic-state.json', 'utf8'));
const source = fs.readFileSync('scripts/capture-figma-parity-runtime.mjs', 'utf8');
const line = source.split('\n').find(value => value.includes('project:')) ?? '';
console.log(JSON.stringify({ json: state.response.data.project.name.ar, sourceProjectLine: line }));
