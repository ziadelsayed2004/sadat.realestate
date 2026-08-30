import { createServer as createHttpServer } from 'node:http';
import { randomBytes } from 'node:crypto';
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

function normalizePublicOrigin(value) {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (url.username || url.password || url.search || url.hash) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function createCspNonce() {
  return randomBytes(18).toString('base64');
}

function applySecurityHeaders(response, html = false, development = false, cspNonce) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=()');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (!html) return;

  const apiOrigin = normalizePublicOrigin(process.env.WEB_API_ORIGIN);
  const connectSources = apiOrigin === undefined ? "'self'" : `'self' ${apiOrigin}`;
  const imageSources = apiOrigin === undefined ? "'self' data: blob:" : `'self' ${apiOrigin} data: blob:`;
  const nonceSource = cspNonce === undefined ? '' : ` 'nonce-${cspNonce}'`;
  const scriptSources = development ? "'self' 'unsafe-inline'" : `'self'${nonceSource}`;
  const developmentConnectSources = development ? `${connectSources} ws: wss:` : connectSources;
  response.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "form-action 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src ${imageSources}`,
    `connect-src ${developmentConnectSources}`,
    "worker-src 'self' blob:"
  ].join('; '));
}

function requestPublicOrigin(request) {
  const configured = normalizePublicOrigin(process.env.WEB_PUBLIC_ORIGIN);
  if (configured !== undefined) return configured;
  const hostHeader = request.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  if (typeof host !== 'string' || host.trim() === '' || /[\s<>"']/u.test(host)) return undefined;
  const forwardedProtocol = request.headers['x-forwarded-proto'];
  const protocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol)?.split(',', 1)[0]?.trim();
  const scheme = protocol === 'https' ? 'https' : 'http';
  return normalizePublicOrigin(`${scheme}://${host}`);
}

function absoluteSeoUrl(origin, pathname) {
  if (origin === undefined) return pathname;
  try {
    return new URL(pathname, `${origin}/`).toString();
  } catch {
    return pathname;
  }
}

function inlineNonceAttribute(cspNonce) {
  return cspNonce === undefined ? '' : ` nonce="${escapeHtml(cspNonce)}"`;
}

function renderHomepageBootstrap(data, cspNonce) {
  if (data === undefined) return '';
  return `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-homepage-data" type="application/json">`
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
}

function renderPropertyListBootstrap(data, cspNonce) {
  if (data === undefined) return '';
  return `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-property-list-data" type="application/json">`
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
}

function renderPropertyDetailsBootstrap(data, state, cspNonce) {
  const dataScript = data === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-property-details-data" type="application/json">`
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
  const stateScript = state === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-property-details-state" type="text/plain">`
    + escapeHtml(state)
    + '</script>';
  return dataScript + stateScript;
}

function renderPropertyComparisonBootstrap(data, state, cspNonce) {
  const dataScript = data === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-property-comparison-data" type="application/json">`
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
  const stateScript = state === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-property-comparison-state" type="text/plain">`
    + escapeHtml(state)
    + '</script>';
  return dataScript + stateScript;
}

function renderDeveloperListBootstrap(data, cspNonce) {
  if (data === undefined) return '';
  return `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-developer-list-data" type="application/json">`
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
}

function renderDeveloperProfileBootstrap(data, state, cspNonce) {
  const dataScript = data === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-developer-profile-data" type="application/json">`
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
  const stateScript = state === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-developer-profile-state" type="text/plain">`
    + escapeHtml(state)
    + '</script>';
  return dataScript + stateScript;
}

function renderArticleListBootstrap(data, query, state, cspNonce) {
  const dataScript = data === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-article-list-data" type="application/json">`
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
  const queryScript = query === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-article-list-query" type="application/json">`
    + escapeJsonForHtml(JSON.stringify(query))
    + '</script>';
  const stateScript = state === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-article-list-state" type="text/plain">`
    + escapeHtml(state)
    + '</script>';
  return dataScript + queryScript + stateScript;
}

function renderArticleDetailsBootstrap(data, state, cspNonce) {
  const dataScript = data === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-article-details-data" type="application/json">`
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
  const stateScript = state === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-article-details-state" type="text/plain">`
    + escapeHtml(state)
    + '</script>';
  return dataScript + stateScript;
}

function renderCommunityBootstrap(data, state, cspNonce) {
  const dataScript = data === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-community-data" type="application/json">`
    + escapeJsonForHtml(JSON.stringify(data))
    + '</script>';
  const stateScript = state === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-community-state" type="text/plain">`
    + escapeHtml(state)
    + '</script>';
  return dataScript + stateScript;
}

function renderPublicContentBootstrap(id, data, state, cspNonce) {
  const dataScript = data === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-${id}-data" type="application/json">`
    + escapeJsonForHtml(JSON.stringify(data)) + '</script>';
  const stateScript = state === undefined ? '' : `<script${inlineNonceAttribute(cspNonce)} id="sadat-public-${id}-state" type="text/plain">`
    + escapeHtml(state) + '</script>';
  return dataScript + stateScript;
}

function renderSeoMetadata(seo, publicOrigin, cspNonce) {
  if (seo === undefined) return '';
  const description = seo.description === undefined
    ? ''
    : '<meta name="description" content="' + escapeHtml(seo.description) + '" />';
  const robots = '<meta name="robots" content="' + escapeHtml(seo.robots) + '" />';
  const canonical = '<link rel="canonical" href="' + escapeHtml(absoluteSeoUrl(publicOrigin, seo.canonicalPath)) + '" />';
  const alternates = seo.alternatePaths.map(alternate => '<link rel="alternate" hreflang="'
    + escapeHtml(alternate.hrefLang)
    + '" href="'
    + escapeHtml(absoluteSeoUrl(publicOrigin, alternate.href))
    + '" />').join('');
  const openGraph = '<meta property="og:type" content="' + escapeHtml(seo.openGraph.type) + '" />'
    + '<meta property="og:title" content="' + escapeHtml(seo.openGraph.title) + '" />'
    + (seo.openGraph.description === undefined ? '' : '<meta property="og:description" content="' + escapeHtml(seo.openGraph.description) + '" />')
    + '<meta property="og:url" content="' + escapeHtml(absoluteSeoUrl(publicOrigin, seo.openGraph.url)) + '" />';
  const jsonLd = `<script${inlineNonceAttribute(cspNonce)} type="application/ld+json">`
    + escapeJsonForHtml(JSON.stringify(seo.jsonLd))
    + '</script>';
  return description + robots + canonical + alternates + openGraph + jsonLd;
}

function renderDocument(template, result, cspNonce) {
  const metadata = '<html lang="' + result.locale + '" dir="' + result.direction + '">';
  const title = '<title>' + escapeHtml(result.title) + '</title>';
  const homepageBootstrap = renderHomepageBootstrap(result.homepageData, cspNonce);
  const propertyListBootstrap = renderPropertyListBootstrap(result.propertyListData, cspNonce);
  const propertyDetailsBootstrap = renderPropertyDetailsBootstrap(result.propertyDetailsData, result.propertyDetailsInitialState, cspNonce);
  const propertyComparisonBootstrap = renderPropertyComparisonBootstrap(result.propertyComparisonData, result.propertyComparisonInitialState, cspNonce);
  const developerListBootstrap = renderDeveloperListBootstrap(result.developerListData, cspNonce);
  const developerProfileBootstrap = renderDeveloperProfileBootstrap(result.developerProfileData, result.developerProfileInitialState, cspNonce);
  const articleListBootstrap = renderArticleListBootstrap(result.articleListData, result.articleListQuery, result.articleListInitialState, cspNonce);
  const articleDetailsBootstrap = renderArticleDetailsBootstrap(result.articleDetailsData, result.articleDetailsInitialState, cspNonce);
  const communityBootstrap = renderCommunityBootstrap(result.communityData, result.communityInitialState, cspNonce);
  const aboutBootstrap = renderPublicContentBootstrap('about', result.aboutData, result.aboutInitialState, cspNonce);
  const teamBootstrap = renderPublicContentBootstrap('team', result.teamData, result.teamInitialState, cspNonce);
  const seoMetadata = renderSeoMetadata(result.seo, result.publicOrigin, cspNonce);
  const inlineScriptPattern = /<script(?![^>]*\bsrc=)/giu;
  const templateWithNonce = cspNonce === undefined
    ? template
    : template.replace(inlineScriptPattern, `<script${inlineNonceAttribute(cspNonce)}`);
  const templateWithoutDefaultDescription = templateWithNonce.replace(/\s*<meta\s+name="description"[^>]*\/?>/i, '');
  return templateWithoutDefaultDescription
    .replace(/<html\b[^>]*>/i, metadata)
    .replace(/<title>[\s\S]*?<\/title>/i, title)
    .replace('</head>', seoMetadata + '</head>')
    .replace('<!--ssr-outlet-->', result.html)
    .replace('</body>', homepageBootstrap + propertyListBootstrap + propertyDetailsBootstrap + propertyComparisonBootstrap + developerListBootstrap + developerProfileBootstrap + articleListBootstrap + articleDetailsBootstrap + communityBootstrap + aboutBootstrap + teamBootstrap + '</body>');
}

function sendCrawlerDocument(request, response, body, contentType) {
  applySecurityHeaders(response);
  response.statusCode = 200;
  response.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  response.setHeader('Content-Type', contentType);
  response.end(request.method === 'HEAD' ? undefined : body);
}

function serveCrawlerDocument(request, response, seoHelpers) {
  const pathname = new URL(request.url ?? '/', 'http://sadat.local').pathname;
  if (pathname !== '/robots.txt' && pathname !== '/sitemap.xml') return false;
  const origin = requestPublicOrigin(request);
  if (pathname === '/robots.txt') {
    const sitemapUrl = origin === undefined ? undefined : `${origin}/sitemap.xml`;
    sendCrawlerDocument(request, response, seoHelpers.createRobotsTxt(sitemapUrl), 'text/plain; charset=utf-8');
    return true;
  }
  if (origin === undefined) {
    response.statusCode = 503;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('Sitemap is unavailable until a valid public origin is available.');
    return true;
  }
  sendCrawlerDocument(request, response, seoHelpers.createSitemapXml(origin), 'application/xml; charset=utf-8');
  return true;
}

function sendHtml(response, statusCode, html, development = false, cspNonce) {
  applySecurityHeaders(response, true, development, cspNonce);
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
  applySecurityHeaders(response);
  if (request.method === 'GET' || request.method === 'HEAD') return false;
  response.statusCode = 405;
  response.setHeader('Allow', 'GET, HEAD');
  response.end();
  return true;
}

function serveHealth(request, response) {
  const pathname = new URL(request.url ?? '/', 'http://sadat.local').pathname;
  if (pathname !== '/health') return false;
  applySecurityHeaders(response);
  response.statusCode = 200;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ status: 'ok', service: 'web' }));
  return true;
}

async function renderDevelopmentPage(request, response, vite) {
  try {
    const requestUrl = request.url ?? '/';
    const template = await readFile(path.resolve(appRoot, 'index.html'), 'utf8');
    const entry = await vite.ssrLoadModule('/src/features/frontend_foundation/entry-server.tsx');
    if (serveCrawlerDocument(request, response, entry)) return;
    const publicOrigin = requestPublicOrigin(request);
    const result = await entry.render(requestUrl, {
      acceptLanguage: getAcceptLanguage(request),
      apiOrigin: process.env.WEB_API_ORIGIN,
      ...(publicOrigin === undefined ? {} : { publicOrigin })
    });
    const transformedTemplate = await vite.transformIndexHtml(requestUrl, template);
    const cspNonce = createCspNonce();
    sendHtml(response, result.statusCode, renderDocument(transformedTemplate, result, cspNonce), true, cspNonce);
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
    server: {
      middlewareMode: true,
      hmr: process.env.WEB_DISABLE_HMR === 'true' ? false : undefined
    }
  });
  const server = createHttpServer((request, response) => {
    if (rejectUnsupportedMethod(request, response)) return;
    if (serveHealth(request, response)) return;
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
  const { createRobotsTxt, createSitemapXml, render } = await import(pathToFileURL(entryModulePath).href);
  const seoHelpers = { createRobotsTxt, createSitemapXml };
  const server = createHttpServer(async (request, response) => {
    if (rejectUnsupportedMethod(request, response)) return;
    if (serveHealth(request, response)) return;
    if (serveCrawlerDocument(request, response, seoHelpers)) return;
    if (await serveAsset(request, response)) return;
    try {
      const requestUrl = request.url ?? '/';
      const publicOrigin = requestPublicOrigin(request);
      const result = await render(requestUrl, {
        acceptLanguage: getAcceptLanguage(request),
        apiOrigin: process.env.WEB_API_ORIGIN,
        ...(publicOrigin === undefined ? {} : { publicOrigin })
      });
      const cspNonce = createCspNonce();
      sendHtml(response, result.statusCode, renderDocument(template, result, cspNonce), false, cspNonce);
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
