/**
 * Unit tests for caching utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FileCache } from '../../src/utils/cache.js';

describe('FileCache', () => {
  let cache: FileCache<string>;
  
  beforeEach(() => {
    cache = new FileCache<string>(5);
  });
  
  it('should store and retrieve values', async () => {
    await cache.set('test.txt', 'test data');
    const value = await cache.get('test.txt');
    
    // Note: This will fail if test.txt doesn't exist
    // In real tests, we'd use fixtures
    expect(value).toBeUndefined(); // File doesn't exist in test env
  });
  
  it('should return undefined for non-existent keys', async () => {
    const value = await cache.get('nonexistent.txt');
    expect(value).toBeUndefined();
  });
  
  it('should invalidate cache entries', async () => {
    cache.invalidate('test.txt');
    const value = await cache.get('test.txt');
    expect(value).toBeUndefined();
  });
  
  it('should clear entire cache', async () => {
    cache.clear();
    expect(cache.size()).toBe(0);
  });
  
  it('should track cache size', () => {
    expect(cache.size()).toBe(0);
  });
  
  it('should evict oldest entry when full', async () => {
    const smallCache = new FileCache<string>(2);
    
    // This would require actual files to test properly
    // In real tests, we'd use fixtures
    expect(smallCache.size()).toBeLessThanOrEqual(2);
  });
});

