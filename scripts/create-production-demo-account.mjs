import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const role = process.argv[2];
const baseUrl = process.env.DEMO_BASE_URL || 'https://elsadatrealestate.com';

if (!['seeker', 'provider'].includes(role)) throw new Error('Usage: create-production-demo-account.mjs seeker|provider');
if (process.env.DEMO_ACCOUNT_CONFIRM !== 'CREATE_PRODUCTION_DEMO_ACCOUNT') {
  throw new Error('Set DEMO_ACCOUNT_CONFIRM=CREATE_PRODUCTION_DEMO_ACCOUNT to continue.');
}
if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== 'function') {
  throw new Error('An interactive TTY is required so the password is not exposed.');
}

const prompt = createInterface({ input: stdin, output: stdout });

async function secretQuestion(label) {
  prompt.pause();
  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  let value = '';
  try {
    for await (const chunk of stdin) {
      for (const character of String(chunk)) {
        if (character === '\r' || character === '\n') {
          stdout.write('\n');
          return value;
        }
        if (character === '\u0003') throw new Error('Cancelled.');
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
        else value += character;
      }
    }
    throw new Error('Input ended before a password was supplied.');
  } finally {
    stdin.setRawMode(false);
    stdin.pause();
    prompt.resume();
  }
}

async function post(path, body) {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(`Request failed safely (${payload?.error?.code || `HTTP_${response.status}`}).`);
  return payload?.data;
}

try {
  const email = (await prompt.question(`Demo ${role} email: `)).trim().toLowerCase();
  const password = await secretQuestion('Password (8-128 chars: upper, lower, number, symbol): ');
  const sent = await post('/api/v1/auth/otp/send', { email, roleType: role, purpose: 'registration' });
  stdout.write(`OTP sent to ${email}.\n`);
  const code = (await prompt.question('Six-digit OTP: ')).trim();
  const verified = await post('/api/v1/auth/otp/verify', {
    email, roleType: role, purpose: 'registration', challengeId: sent.challengeId, code
  });

  if (role === 'seeker') {
    const firstName = (await prompt.question('First name: ')).trim();
    const lastName = (await prompt.question('Last name: ')).trim();
    await post('/api/v1/auth/register/seeker', {
      verificationToken: verified.verificationToken, firstName, lastName, password, locale: 'ar'
    });
  } else {
    stdout.write('Provider type: 1=individual broker, 2=brokerage office, 3=developer company\n');
    const choice = (await prompt.question('Choice [1-3]: ')).trim();
    const providerType = { 1: 'individual_broker', 2: 'brokerage_office', 3: 'developer_company' }[choice];
    if (!providerType) throw new Error('Invalid provider type.');
    await post('/api/v1/provider/application', {
      verificationToken: verified.verificationToken, providerType, password
    });
  }
  stdout.write(`DEMO_ACCOUNT_CREATED role=${role} email=${email}\n`);
} finally {
  prompt.close();
}
