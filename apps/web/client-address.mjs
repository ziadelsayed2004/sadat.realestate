import { isIP } from 'node:net';

/** Nginx replaces X-Real-IP; only accept it from the native loopback peer. */
export function requestClientAddress(request) {
  const peer = request.socket.remoteAddress;
  if (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer)) {
    const forwarded = request.headers['x-real-ip'];
    if (typeof forwarded === 'string' && isIP(forwarded)) return forwarded;
  }
  return typeof peer === 'string' && isIP(peer) ? peer : undefined;
}
