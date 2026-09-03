import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('LAYER 3: Frontend Security (XSS Prevention)', () => {
  it('strips dangerous script tags', () => {
    const input = "Hello <script>alert('XSS')</script> world";
    const output = sanitizeHtml(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('Hello');
  });

  it('strips onerror event handlers from images', () => {
    const input = "<img src=x onerror=alert('PWNED')>";
    const output = sanitizeHtml(input);
    expect(output).not.toContain('onerror');
    expect(output).not.toContain('alert');
  });

  it('allows safe formatting tags like strong and em', () => {
    const input = '<p><strong>Bold thought:</strong> <em>Reflection</em></p>';
    const output = sanitizeHtml(input);
    expect(output).toBe(input);
  });

  it('sanitizes javascript: URLs', () => {
    const input = "<a href='javascript:alert(1)'>Click me</a>";
    const output = sanitizeHtml(input);
    expect(output).not.toContain('javascript:');
  });
});
