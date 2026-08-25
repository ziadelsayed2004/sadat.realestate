import nodemailer from 'nodemailer';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`MISSING_${name}`);
  return value;
}

function transportFromEnvironment() {
  const tls = required('SMTP_TLS');
  const port = Number(required('SMTP_PORT'));
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) throw new Error('INVALID_SMTP_PORT');
  if (!['implicit', 'starttls'].includes(tls)) throw new Error('INSECURE_SMTP_TLS');
  return {
    transport: nodemailer.createTransport({
      host: required('SMTP_HOST'),
      port,
      secure: tls === 'implicit',
      requireTLS: tls === 'starttls',
      disableFileAccess: true,
      disableUrlAccess: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      auth: { user: required('SMTP_USER'), pass: required('SMTP_PASSWORD') }
    }),
    host: required('SMTP_HOST'),
    port,
    tls
  };
}

try {
  const configuration = transportFromEnvironment();
  await configuration.transport.verify();
  if (process.argv.includes('--send')) {
    if (process.env.SMTP_SMOKE_CONFIRM !== 'SEND_TEST_EMAIL') throw new Error('SMTP_SMOKE_CONFIRM_REQUIRED');
    const recipient = required('SMTP_SMOKE_RECIPIENT');
    await configuration.transport.sendMail({
      from: required('SMTP_FROM'),
      to: recipient,
      subject: 'Elsadat Real Estate SMTP delivery check',
      text: 'This is an explicitly requested SMTP delivery check. It contains no OTP or account data.',
      html: '<p>This is an explicitly requested SMTP delivery check. It contains no OTP or account data.</p>'
    });
    process.stdout.write('SMTP_SEND_OK recipient=redacted\n');
  } else {
    process.stdout.write(`SMTP_VERIFY_OK host=${configuration.host} port=${configuration.port} tls=${configuration.tls}\n`);
  }
  configuration.transport.close();
} catch (error) {
  const code = error instanceof Error && /^[-A-Z0-9_]+$/u.test(error.message)
    ? error.message
    : 'CONNECTION_OR_AUTHENTICATION_FAILED';
  process.stderr.write(`SMTP_CHECK_FAILED ${code}\n`);
  process.exitCode = 1;
}
