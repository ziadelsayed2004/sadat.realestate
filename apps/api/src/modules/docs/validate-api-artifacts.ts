import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateOpenApiDocument,
  validatePostmanCollection,
  validatePostmanEnvironment
} from './api-artifacts.js';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
const openApiPath = path.join(apiRoot, 'openapi', 'openapi.json');
const postmanCollectionPath = path.join(
  apiRoot,
  'postman',
  'Sadat-Real-Estate.postman_collection.json'
);
const postmanEnvironmentPath = path.join(
  apiRoot,
  'postman',
  'Sadat-Real-Estate.local.postman_environment.json'
);
const mode = process.argv[2];

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function finish(label: string, issues: string[]): void {
  if (issues.length > 0) {
    for (const issue of issues) process.stderr.write(`${issue}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${label}_VALID\n`);
}

if (mode === 'openapi') {
  finish('OPENAPI', validateOpenApiDocument(readJson(openApiPath)));
} else if (mode === 'postman') {
  finish('POSTMAN', [
    ...validatePostmanCollection(readJson(postmanCollectionPath)),
    ...validatePostmanEnvironment(readJson(postmanEnvironmentPath))
  ]);
} else {
  process.stderr.write('Usage: validate-api-artifacts.ts <openapi|postman>\n');
  process.exitCode = 1;
}
