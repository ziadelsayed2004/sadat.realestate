import { createServer as createHttpServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer as createViteServer } from 'vite';

const appRoot = path.dirname(new URL(import.meta.url).pathname).replace(/^\/[A-Za-z]:/, (drive) => drive.slice(1));
const clientRoot = path.resolve(appRoot, 'dist/client');
const serverRoot = path.resolve(appRoot, 'dist/server');
const entryModulePath = path.resolve(serverRoot, 'entry-server.js');
const defaultHost = '127.0.0.1';
const defaultPort = 4173;

function getMode() {
  const modeIndex = process.argv.indexOf('--mode');
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : 'development';
  if (mode !== 'development' && mode !== 'production') {
    throw new Error(`Unsupported web mode: ${mode}`);
  }
  return mode;
}

function getPort() {
  const configuredPort = process.env.WEB_PORT;
  if (configuredPort === undefined) return defaultPort;
  const port = Number(configuredPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('WEB_PORT must be an integer between 1 and 65535');
  }
  return port;
}

function getAcceptLanguage(request) {
  const header = request.headers['accept-language'];
  return Array.isArray(header) ? header.join(',') : header;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function escapeJsonForHtml(value) {
  return value.replace(/[<>&\u2028\u2029]/g, character => ({
    '<': '\\u003C',
    '>': '\\u003E',
    '&': '\\u0026',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
  })[character]);
}

function renderHomepageBootstrap(data) {
  if (data === undefined) return '';
  return '<script id="sadat-public-homepage-data" type="application/json">'
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
}

function renderPropertyListBootstrap(data) {
  if (data === undefined) return '';
  return '<script id="sadat-public-property-list-data" type="application/json">'
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
}

function renderPropertyDetailsBootstrap(data, state) {
  const dataScript = data === undefined ? '' : '<script id="sadat-public-property-details-data" type="application/json">'
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
  const stateScript = state === undefined ? '' : '<script id="sadat-public-property-details-state" type="text/plain">'
    + escapeHtml(state)
    + '</script>';
  return dataScript + stateScript;
}

function renderPropertyComparisonBootstrap(data, state) {
  const dataScript = data === undefined ? '' : '<script id="sadat-public-property-comparison-data" type="application/json">'
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
  const stateScript = state === undefined ? '' : '<script id="sadat-public-property-comparison-state" type="text/plain">'
    + escapeHtml(state)
    + '</script>';
  return dataScript + stateScript;
}

function renderDeveloperListBootstrap(data) {
  if (data === undefined) return '';
  return '<script id="sadat-public-developer-list-data" type="application/json">'
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
}

function renderDeveloperProfileBootstrap(data, state) {
  const dataScript = data === undefined ? '' : '<script id="sadat-public-developer-profile-data" type="application/json">'
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
  const stateScript = state === undefined ? '' : '<script id="sadat-public-developer-profile-state" type="text/plain">'
    + escapeHtml(state)
    + '</script>';
  return dataScript + stateScript;
}

function renderArticleListBootstrap(data, query, state) {
  const dataScript = data === undefined ? '' : '<script id="sadat-public-article-list-data" type="application/json">'
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
  const queryScript = query === undefined ? '' : '<script id="sadat-public-article-list-query" type="application/json">'
    + escapeJsonForHtml(JSON.stringify(query))
    + '</script>';
  const stateScript = state === undefined ? '' : '<script id="sadat-public-article-list-state" type="text/plain">'
    + escapeHtml(state)
    + '</script>';
  return dataScript + queryScript + stateScript;
}

function renderArticleDetailsBootstrap(data, state) {
  const dataScript = data === undefined ? '' : '<script id="sadat-public-article-details-data" type="application/json">'
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
  const stateScript = state === undefined ? '' : '<script id="sadat-public-article-details-state" type="text/plain">'
    + escapeHtml(state)
    + '</script>';
  return dataScript + stateScript;
}

function renderSeoMetadata(seo) {
  if (seo === undefined) return '';
  const description = seo.description === undefined
    ? ''
    : '<meta name="description" content="' + escapeHtml(seo.description) + '" />';
  const canonical = '<link rel="canonical" href="' + escapeHtml(seo.canonicalPath) + '" />';
  const alternates = seo.alternatePaths.map(alternate => '<link rel="alternate" hreflang="'
    + escapeHtml(alternate.hrefLang)
    + '" href="'
    + escapeHtml(alternate.href)
    + '" />').join('');
  const jsonLd = '<script type="application/ld+json">'
    + escapeJsonForHtml(JSON.stringify(seo.jsonLd))
    + '</script>';
  return description + canonical + alternates + jsonLd;
}

function renderDocument(template, result) {
  const metadata = '<html lang="' + result.locale + '" dir="' + result.direction + '">';
  const title = '<title>' + escapeHtml(result.title) + '</title>';
  const homepageBootstrap = renderHomepageBootstrap(result.homepageData);
  const propertyListBootstrap = renderPropertyListBootstrap(result.propertyListData);
  const propertyDetailsBootstrap = renderPropertyDetailsBootstrap(result.propertyDetailsData, result.propertyDetailsInitialState);
  const propertyComparisonBootstrap = renderPropertyComparisonBootstrap(result.propertyComparisonData, result.propertyComparisonInitialState);
  const developerListBootstrap = renderDeveloperListBootstrap(result.developerListData);
  const developerProfileBootstrap = renderDeveloperProfileBootstrap(result.developerProfileData, result.developerProfileInitialState);
  const articleListBootstrap = renderArticleListBootstrap(result.articleListData, result.articleListQuery, result.articleListInitialState);
  const articleDetailsBootstrap = renderArticleDetailsBootstrap(result.articleDetailsData, result.articleDetailsInitialState);
  const seoMetadata = renderSeoMetadata(result.seo);
  return template
    .replace(/<html\b[^>]*>/i, metadata)
    .replace(/<title>[\s\S]*?<\/title>/i, title)
    .replace('</head>', seoMetadata + '</head>')
    .replace('<!--ssr-outlet-->', result.html)
    .replace('</body>', homepageBootstrap + propertyListBootstrap + propertyDetailsBootstrap + propertyComparisonBootstrap + developerListBootstrap + developerProfileBootstrap + articleListBootstrap + articleDetailsBootstrap + '</body>');
}

function sendHtml(response, statusCode, html) {
  response.statusCode = statusCode;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(html);
}

function sendServerError(response) {
  if (response.headersSent) return;
  sendHtml(response, 500, '<!doctype html><html><body><h1>Internal Server Error</h1></body></html>');
}

function rejectUnsupportedMethod(request, response) {
  if (request.method === 'GET' || request.method === 'HEAD') return false;
  response.statusCode = 405;
  response.setHeader('Allow', 'GET, HEAD');
  response.end();
  return true;
}

async function renderDevelopmentPage(request, response, vite) {
  try {
    const requestUrl = request.url ?? '/';
    const template = await readFile(path.resolve(appRoot, 'index.html'), 'utf8');
    const entry = await vite.ssrLoadModule('/src/features/frontend_foundation/entry-server.tsx');
    const result = await entry.render(requestUrl, {
      acceptLanguage: getAcceptLanguage(request),
      apiOrigin: process.env.WEB_API_ORIGIN
    });
    const transformedTemplate = await vite.transformIndexHtml(requestUrl, template);
    sendHtml(response, result.statusCode, renderDocument(transformedTemplate, result));
  } catch (error) {
    vite.ssrFixStacktrace(error);
    console.error(error);
    sendServerError(response);
  }
}

async function createDevelopmentServer() {
  const vite = await createViteServer({
    root: appRoot,
    appType: 'custom',
    server: { middlewareMode: true }
  });
  const server = createHttpServer((request, response) => {
    if (rejectUnsupportedMethod(request, response)) return;
    vite.middlewares(request, response, error => {
      if (error) {
        vite.ssrFixStacktrace(error);
        console.error(error);
        sendServerError(response);
        return;
      }
      void renderDevelopmentPage(request, response, vite);
    });
  });
  return { server, close: () => vite.close() };
}

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
]);

async function serveAsset(request, response) {
  const pathname = new URL(request.url ?? '/', 'http://sadat.local').pathname;
  if (!pathname.startsWith('/assets/')) return false;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.statusCode = 400;
    response.end();
    return true;
  }
  const candidate = path.resolve(clientRoot, `.${decodedPath}`);
  const relative = path.relative(clientRoot, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    response.statusCode = 404;
    response.end();
    return true;
  }
  try {
    const fileStats = await stat(candidate);
    if (!fileStats.isFile()) throw new Error('Not a file');
    const body = await readFile(candidate);
    response.statusCode = 200;
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('Content-Type', contentTypes.get(path.extname(candidate)) ?? 'application/octet-stream');
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.statusCode = 404;
    response.end();
  }
  return true;
}

async function createProductionServer() {
  const template = await readFile(path.resolve(clientRoot, 'index.html'), 'utf8');
  const { render } = await import(pathToFileURL(entryModulePath).href);
  const server = createHttpServer(async (request, response) => {
    if (rejectUnsupportedMethod(request, response)) return;
    if (await serveAsset(request, response)) return;
    try {
      const requestUrl = request.url ?? '/';
      const result = await render(requestUrl, {
        acceptLanguage: getAcceptLanguage(request),
        apiOrigin: process.env.WEB_API_ORIGIN
      });
      sendHtml(response, result.statusCode, renderDocument(template, result));
    } catch (error) {
      console.error(error);
      sendServerError(response);
    }
  });
  return { server, close: async () => undefined };
}

async function main() {
  const mode = getMode();
  const port = getPort();
  const runtime = mode === 'development' ? await createDevelopmentServer() : await createProductionServer();
  runtime.server.listen(port, process.env.WEB_HOST ?? defaultHost, () => {
    console.log(`web ${mode} server listening on http://${process.env.WEB_HOST ?? defaultHost}:${port}`);
  });
  const close = () => {
    runtime.server.close(() => { void runtime.close(); });
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
