import { createServer as createHttpServer } from 'node:http';
import { createServer as createTcpServer } from 'node:net';

const smtpHost = process.env.LOCAL_SMTP_HOST || '127.0.0.1';
const smtpPort = Number(process.env.LOCAL_SMTP_PORT || '1025');
const httpHost = process.env.LOCAL_MAIL_UI_HOST || '127.0.0.1';
const httpPort = Number(process.env.LOCAL_MAIL_UI_PORT || '8025');
const messages = [];

function escapeHtml(value) {
  return value.replace(/[&<>"']/gu, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function messageSummary(raw, id) {
  const subject = raw.match(/^Subject:\s*(.+)$/imu)?.[1]?.trim() || '(no subject)';
  const to = raw.match(/^To:\s*(.+)$/imu)?.[1]?.trim() || '(unknown recipient)';
  return { id, subject, to, receivedAt: new Date().toISOString(), raw };
}

const smtp = createTcpServer(socket => {
  socket.setEncoding('utf8');
  socket.write('220 elsadat-local ESMTP ready\r\n');
  let buffer = '';
  let dataMode = false;
  let data = [];

  socket.on('data', chunk => {
    buffer += chunk;
    let boundary = buffer.indexOf('\r\n');
    while (boundary >= 0) {
      const line = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (dataMode) {
        if (line === '.') {
          const raw = data.join('\r\n');
          const id = String(Date.now()) + '-' + String(messages.length + 1);
          messages.unshift(messageSummary(raw, id));
          messages.splice(100);
          data = [];
          dataMode = false;
          socket.write('250 2.0.0 message accepted\r\n');
        } else {
          data.push(line.startsWith('..') ? line.slice(1) : line);
        }
      } else {
        const command = line.trim().toUpperCase();
        if (command.startsWith('EHLO')) {
          socket.write('250-elsadat-local\r\n250-8BITMIME\r\n250-SIZE 10485760\r\n250 PIPELINING\r\n');
        } else if (command.startsWith('HELO') || command.startsWith('MAIL FROM:') || command.startsWith('RCPT TO:') || command === 'RSET' || command === 'NOOP') {
          socket.write('250 2.0.0 ok\r\n');
        } else if (command === 'DATA') {
          dataMode = true;
          data = [];
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (command === 'QUIT') {
          socket.end('221 2.0.0 bye\r\n');
        } else {
          socket.write('502 5.5.2 command not implemented\r\n');
        }
      }
      boundary = buffer.indexOf('\r\n');
    }
  });
});

const http = createHttpServer((request, response) => {
  const url = new URL(request.url || '/', `http://${httpHost}:${httpPort}`);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (url.pathname === '/health') {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ status: 'ok', service: 'local-mail-catcher', messages: messages.length }));
    return;
  }
  if (url.pathname === '/api/messages') {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ messages }));
    return;
  }
  const selected = url.searchParams.get('id');
  const current = selected ? messages.find(message => message.id === selected) : undefined;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Elsadat Local Mail</title><style>body{font:15px system-ui;margin:0;background:#f6f4ee;color:#101a33}header{background:#101a33;color:white;padding:18px 24px}main{display:grid;grid-template-columns:minmax(260px,34%) 1fr;gap:18px;padding:18px}section{background:white;border:1px solid #ddd;border-radius:12px;padding:16px;min-height:70vh}a{color:#92651a;text-decoration:none}.item{padding:12px 0;border-bottom:1px solid #eee}pre{white-space:pre-wrap;word-break:break-word}@media(max-width:760px){main{grid-template-columns:1fr}}</style></head><body><header><strong>Elsadat Real Estate — Local OTP Mail</strong><div>${messages.length} captured message(s)</div></header><main><section>${messages.length ? messages.map(message => `<div class="item"><a href="/?id=${encodeURIComponent(message.id)}"><strong>${escapeHtml(message.subject)}</strong></a><br>${escapeHtml(message.to)}<br><small>${escapeHtml(message.receivedAt)}</small></div>`).join('') : '<p>No email has been captured yet.</p>'}</section><section>${current ? `<h2>${escapeHtml(current.subject)}</h2><pre>${escapeHtml(current.raw)}</pre>` : '<h2>Select a message</h2><p>Request an OTP from the local application, then refresh this page.</p>'}</section></main></body></html>`);
});

await new Promise((resolve, reject) => smtp.once('error', reject).listen(smtpPort, smtpHost, resolve));
await new Promise((resolve, reject) => http.once('error', reject).listen(httpPort, httpHost, resolve));
process.stdout.write(`LOCAL_MAIL_READY smtp=${smtpHost}:${smtpPort} ui=http://${httpHost}:${httpPort}\n`);

function shutdown() {
  smtp.close();
  http.close(() => process.exit(0));
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

