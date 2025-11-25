/**
 * Caching utilities for parsed files
 */

import { stat } from "fs/promises";

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  mtime: number;
  size: number;
}

/**
 * Simple LRU cache for parsed files
 */
export class FileCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get cached entry if still valid
   */
  async get(path: string): Promise<T | undefined> {
    const entry = this.cache.get(path);
    if (!entry) {
      return undefined;
    }

    try {
      // Check if file has been modified
      const stats = await stat(path);
      if (stats.mtimeMs === entry.mtime && stats.size === entry.size) {
        // Move to end (LRU)
        this.cache.delete(path);
        this.cache.set(path, entry);
        return entry.data;
      }
    } catch {
      // File no longer exists
      this.cache.delete(path);
      return undefined;
    }

    // File has been modified
    this.cache.delete(path);
    return undefined;
  }

  /**
   * Set cache entry
   */
  async set(path: string, data: T): Promise<void> {
    try {
      const stats = await stat(path);

      // Evict oldest entry if cache is full
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      this.cache.set(path, {
        data,
        mtime: stats.mtimeMs,
        size: stats.size,
      });
    } catch {
      // Can't cache if we can't stat the file
    }
  }

  /**
   * Invalidate cache entry
   */
  invalidate(path: string): void {
    this.cache.delete(path);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}
