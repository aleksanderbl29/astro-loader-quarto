import { describe, it, expect, vi } from 'vitest';
import { normalizeAutoRenderConfig } from '../../src/utils/quarto-renderer.js';

describe('quarto-renderer', () => {
  describe('normalizeAutoRenderConfig', () => {
    it('should return disabled config when undefined', () => {
      const result = normalizeAutoRenderConfig(undefined);
      expect(result.enabled).toBe(false);
    });

    it('should return disabled config when false', () => {
      const result = normalizeAutoRenderConfig(false);
      expect(result.enabled).toBe(false);
    });

    it('should return default config when true', () => {
      const result = normalizeAutoRenderConfig(true);
      expect(result.enabled).toBe(true);
      expect(result.command).toBe('quarto');
      expect(result.args).toEqual(['render']);
      expect(result.format).toBe('gfm');
    });

    it('should merge custom options with defaults', () => {
      const result = normalizeAutoRenderConfig({
        enabled: true,
        command: 'custom-quarto',
      });
      expect(result.enabled).toBe(true);
      expect(result.command).toBe('custom-quarto');
      expect(result.args).toEqual(['render']); // default
      expect(result.format).toBe('gfm'); // default
    });

    it('should respect all custom options', () => {
      const result = normalizeAutoRenderConfig({
        enabled: true,
        command: 'quarto-dev',
        args: ['render', '--quiet', '--no-cache'],
        format: 'html',
      });
      expect(result.enabled).toBe(true);
      expect(result.command).toBe('quarto-dev');
      expect(result.args).toEqual(['render', '--quiet', '--no-cache']);
      expect(result.format).toBe('html');
    });

    it('should allow disabling via object config', () => {
      const result = normalizeAutoRenderConfig({
        enabled: false,
      });
      expect(result.enabled).toBe(false);
    });
  });
});


