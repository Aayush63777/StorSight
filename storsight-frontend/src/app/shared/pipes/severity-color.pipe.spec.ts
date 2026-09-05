import { SeverityColorPipe } from './severity-color.pipe';

describe('SeverityColorPipe', () => {
  let pipe: SeverityColorPipe;

  beforeEach(() => {
    pipe = new SeverityColorPipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  // ── Known severity values ─────────────────────────────────

  it('"critical" → "critical"', () => {
    expect(pipe.transform('critical')).toBe('critical');
  });

  it('"high" → "high"', () => {
    expect(pipe.transform('high')).toBe('high');
  });

  it('"error" → "high" (error maps to high)', () => {
    expect(pipe.transform('error')).toBe('high');
  });

  it('"warning" → "medium"', () => {
    expect(pipe.transform('warning')).toBe('medium');
  });

  it('"medium" → "medium"', () => {
    expect(pipe.transform('medium')).toBe('medium');
  });

  it('"low" → "low"', () => {
    expect(pipe.transform('low')).toBe('low');
  });

  it('"info" → "info"', () => {
    expect(pipe.transform('info')).toBe('info');
  });

  // ── Unknown / empty ───────────────────────────────────────

  it('unknown string → "unknown"', () => {
    expect(pipe.transform('catastrophic')).toBe('unknown');
  });

  it('empty string → "unknown"', () => {
    expect(pipe.transform('')).toBe('unknown');
  });

  it('null → "unknown"', () => {
    expect(pipe.transform(null)).toBe('unknown');
  });

  it('undefined → "unknown"', () => {
    expect(pipe.transform(undefined)).toBe('unknown');
  });

  // ── Case-insensitivity ────────────────────────────────────

  it('"CRITICAL" → "critical" (case-insensitive)', () => {
    expect(pipe.transform('CRITICAL')).toBe('critical');
  });

  it('"WARNING" → "medium" (case-insensitive)', () => {
    expect(pipe.transform('WARNING')).toBe('medium');
  });

  it('"High" → "high" (mixed case)', () => {
    expect(pipe.transform('High')).toBe('high');
  });

  it('"INFO" → "info" (uppercase)', () => {
    expect(pipe.transform('INFO')).toBe('info');
  });
});
