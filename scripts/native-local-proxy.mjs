import http from 'node:http';
import net from 'node:net';

const host = process.env.LOCAL_PROXY_HOST || '127.0.0.1';
const port = Number(process.env.LOCAL_HTTP_PORT || '8080');
const apiPort = Number(process.env.API_PORT || '3000');
const webPort = Number(process.env.WEB_PORT || '4173');

function targetFor(url) {
  const pathname = new URL(url || '/', `http://${host}:${port}`).pathname;
  return pathname.startsWith('/api/') ? apiPort : webPort;
}

const server = http.createServer((request, response) => {
  const targetPort = targetFor(request.url);
  const headers = { ...request.headers };
  headers['x-forwarded-for'] = request.socket.remoteAddress || '127.0.0.1';
  headers['x-forwarded-proto'] = 'http';
  headers['x-forwarded-host'] = request.headers.host || `${host}:${port}`;
  const upstream = http.request({
    hostname: '127.0.0.1', port: targetPort, method: request.method, path: request.url, headers
  }, upstreamResponse => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'LOCAL_UPSTREAM_UNAVAILABLE' }));
  });
  request.pipe(upstream);
});

server.on('upgrade', (request, socket, head) => {
  const targetPort = targetFor(request.url);
  const upstream = net.connect(targetPort, '127.0.0.1', () => {
    const lines = [`${request.method} ${request.url} HTTP/${request.httpVersion}`];
    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) lines.push(`${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
    }
    upstream.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
});

server.listen(port, host, () => process.stdout.write(`LOCAL_PROXY_READY http://${host}:${port}\n`));
function shutdown() { server.close(() => process.exit(0)); }
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

