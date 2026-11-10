import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFlag, writeFlag } from './stored-flag';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('stored-flag', () => {
  it('speichert und liest Ein/Aus', () => {
    expect(readFlag('x')).toBe(false);
    expect(readFlag('x', true)).toBe(true);
    writeFlag('x', true);
    expect(readFlag('x')).toBe(true);
    writeFlag('x', false);
    expect(readFlag('x', true)).toBe(false);
  });

  it('kommt ohne Speicher aus', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('gesperrt'); });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('gesperrt'); });
    expect(() => writeFlag('x', true)).not.toThrow();
    expect(readFlag('x', true)).toBe(true);
  });
});
