export function createUnhandledRequestTracker() {
  const requests: string[] = [];
  return {
    record(method: string, url: string) { requests.push(`${method} ${url}`); },
    verify() {
      const missing = requests.splice(0);
      if (missing.length) throw new Error(`Missing test API handlers:\n${missing.join('\n')}\nAdd an explicit fixture for each request; unhandled requests must not pass silently.`);
    }
  };
}
