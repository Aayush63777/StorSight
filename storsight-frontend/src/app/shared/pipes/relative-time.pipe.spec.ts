import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;

  beforeEach(() => {
    pipe = new RelativeTimePipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  // ── Null / undefined / empty ──────────────────────────────

  it('returns "—" for null', () => {
    expect(pipe.transform(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(pipe.transform(undefined)).toBe('—');
  });

  // ── Invalid date ──────────────────────────────────────────

  it('returns the raw value as string for an invalid date string', () => {
    expect(pipe.transform('not-a-date')).toBe('not-a-date');
  });

  // ── "just now" ────────────────────────────────────────────

  it('returns "just now" for a timestamp 0 seconds ago', () => {
    const now = new Date().toISOString();
    expect(pipe.transform(now)).toBe('just now');
  });

  it('returns "just now" for a timestamp 30 seconds ago', () => {
    const d = new Date(Date.now() - 30_000).toISOString();
    expect(pipe.transform(d)).toBe('just now');
  });

  it('returns "just now" for a timestamp 59 seconds ago', () => {
    const d = new Date(Date.now() - 59_000).toISOString();
    expect(pipe.transform(d)).toBe('just now');
  });

  // ── Minutes ───────────────────────────────────────────────

  it('returns "1m ago" for a timestamp 60 seconds ago', () => {
    const d = new Date(Date.now() - 60_000).toISOString();
    expect(pipe.transform(d)).toBe('1m ago');
  });

  it('returns "5m ago" for a timestamp 5 minutes ago', () => {
    const d = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(pipe.transform(d)).toBe('5m ago');
  });

  it('returns "59m ago" for a timestamp 59 minutes ago', () => {
    const d = new Date(Date.now() - 59 * 60_000).toISOString();
    expect(pipe.transform(d)).toBe('59m ago');
  });

  // ── Hours ─────────────────────────────────────────────────

  it('returns "1h ago" for a timestamp 1 hour ago', () => {
    const d = new Date(Date.now() - 3600_000).toISOString();
    expect(pipe.transform(d)).toBe('1h ago');
  });

  it('returns "2h ago" for a timestamp 2 hours ago', () => {
    const d = new Date(Date.now() - 2 * 3600_000).toISOString();
    expect(pipe.transform(d)).toBe('2h ago');
  });

  it('returns "23h ago" for a timestamp 23 hours ago', () => {
    const d = new Date(Date.now() - 23 * 3600_000).toISOString();
    expect(pipe.transform(d)).toBe('23h ago');
  });

  // ── Days ──────────────────────────────────────────────────

  it('returns "1d ago" for a timestamp exactly 1 day ago', () => {
    const d = new Date(Date.now() - 86400_000).toISOString();
    expect(pipe.transform(d)).toBe('1d ago');
  });

  it('returns "3d ago" for a timestamp 3 days ago', () => {
    const d = new Date(Date.now() - 3 * 86400_000).toISOString();
    expect(pipe.transform(d)).toBe('3d ago');
  });

  it('returns "29d ago" for a timestamp 29 days ago', () => {
    const d = new Date(Date.now() - 29 * 86400_000).toISOString();
    expect(pipe.transform(d)).toBe('29d ago');
  });

  // ── Formatted date (30+ days) ─────────────────────────────

  it('returns a formatted date string for a timestamp 30 days ago', () => {
    const d = new Date(Date.now() - 30 * 86400_000).toISOString();
    const result = pipe.transform(d);
    // Should NOT contain "ago" — should be a human-readable date string
    expect(result).not.toContain('ago');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a formatted date string for a very old timestamp', () => {
    const d = new Date('2020-01-15T00:00:00').toISOString();
    const result = pipe.transform(d);
    expect(result).not.toContain('ago');
    expect(result).toContain('2020');
  });

  // ── Date object input ─────────────────────────────────────

  it('accepts a Date object as input', () => {
    const d = new Date(Date.now() - 5 * 60_000);
    expect(pipe.transform(d)).toBe('5m ago');
  });

  it('accepts a Date object for "just now"', () => {
    const d = new Date();
    expect(pipe.transform(d)).toBe('just now');
  });
});
