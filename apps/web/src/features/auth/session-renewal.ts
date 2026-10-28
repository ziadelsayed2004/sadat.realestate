// Access tokens stay in memory. Only the existing HttpOnly cookie renews them.
export class SessionRenewal {
  private expiresAt = 0;
  private timer: number | undefined;
  private disposed = false;
  constructor(private readonly refresh: () => Promise<unknown>, private readonly authenticated: () => boolean) {
    if (typeof window === 'undefined') return;
    window.addEventListener('focus', this.resume);
    window.addEventListener('online', this.resume);
    document.addEventListener('visibilitychange', this.resume);
  }
  schedule(seconds: number): void {
    this.expiresAt = Date.now() + seconds * 1000;
    this.arm(Math.max(1000, seconds * 1000 - Math.min(30_000, seconds * 200)));
  }
  clear(): void {
    if (this.timer !== undefined && typeof window !== 'undefined') window.clearTimeout(this.timer);
    this.timer = undefined;
    this.expiresAt = 0;
  }
  retry(): void {
    this.expiresAt = Date.now();
    this.arm(15_000);
  }
  dispose(): void {
    this.disposed = true;
    this.clear();
    if (typeof window === 'undefined') return;
    window.removeEventListener('focus', this.resume);
    window.removeEventListener('online', this.resume);
    document.removeEventListener('visibilitychange', this.resume);
  }
  private readonly resume = () => {
    if (this.expiresAt && Date.now() >= this.expiresAt - 30_000) this.renew();
  };
  private arm(delay: number): void {
    if (this.disposed || typeof window === 'undefined') return;
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => { this.timer = undefined; this.renew(); }, delay);
  }
  private renew(): void {
    if (this.disposed || !this.authenticated() || document.visibilityState === 'hidden') return;
    void this.refresh().catch(() => {
      if (this.authenticated()) this.arm(15_000);
    });
  }
}
