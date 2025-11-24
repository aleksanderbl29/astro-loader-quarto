/**
 * Integration tests for Quarto Loader
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'path';
import { quartoLoader } from '../../src/loader.js';

describe('Quarto Loader Integration', () => {
  const fixturesPath = resolve(__dirname, '../fixtures/sample-quarto-project');
  
  // Mock store and logger for testing
  const createMockStore = () => {
    const entries = new Map();
    return {
      entries,
      set: ({ id, data }: { id: string; data: any }) => {
        entries.set(id, data);
      },
      get: (id: string) => entries.get(id),
      all: () => Array.from(entries.values()),
      clear: () => entries.clear(),
    };
  };
  
  const mockLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
  
  describe('Basic Loading', () => {
    it('should load entries from Quarto project', async () => {
      const loader = quartoLoader({
        quartoRoot: fixturesPath,
        listings: 'blog-posts',
      });
      
      const store = createMockStore();
      
      await loader.load({
        store,
        logger: mockLogger,
        meta: { mode: 'build' },
        parseData: async () => ({}),
      });
      
      // Should have loaded non-draft posts
      expect(store.entries.size).toBeGreaterThan(0);
    });
    
    it('should apply default field mappings', async () => {
      const loader = quartoLoader({
        quartoRoot: fixturesPath,
        listings: 'blog-posts',
      });
      
      const store = createMockStore();
      
      await loader.load({
        store,
        logger: mockLogger,
        meta: { mode: 'build' },
        parseData: async () => ({}),
      });
      
      const firstEntry = store.entries.values().next().value;
      
      // Check that field mappings were applied
      if (firstEntry) {
        expect(firstEntry.pubDate).toBeDefined(); // date -> pubDate
        expect(firstEntry.date).toBeUndefined(); // Original should be mapped
      }
    });
  });
  
  describe('Multiple Listings', () => {
    it('should load multiple listings', async () => {
      const loader = quartoLoader({
        quartoRoot: fixturesPath,
        listings: ['blog-posts', 'tutorials'],
      });
      
      const store = createMockStore();
      
      await loader.load({
        store,
        logger: mockLogger,
        meta: { mode: 'build' },
        parseData: async () => ({}),
      });
      
      // Should have entries from both listings
      expect(store.entries.size).toBeGreaterThan(0);
    });
    
    it('should load all listings when specified', async () => {
      const loader = quartoLoader({
        quartoRoot: fixturesPath,
        listings: 'all',
      });
      
      const store = createMockStore();
      
      await loader.load({
        store,
        logger: mockLogger,
        meta: { mode: 'build' },
        parseData: async () => ({}),
      });
      
      expect(store.entries.size).toBeGreaterThan(0);
    });
  });
  
  describe('Custom Field Mappings', () => {
    it('should apply custom field mappings', async () => {
      const loader = quartoLoader({
        quartoRoot: fixturesPath,
        listings: 'blog-posts',
        fieldMappings: {
          'date': 'publishedAt',
          'date-modified': 'updatedAt',
        },
      });
      
      const store = createMockStore();
      
      await loader.load({
        store,
        logger: mockLogger,
        meta: { mode: 'build' },
        parseData: async () => ({}),
      });
      
      const firstEntry = store.entries.values().next().value;
      
      if (firstEntry) {
        expect(firstEntry.publishedAt).toBeDefined();
        expect(firstEntry.pubDate).toBeUndefined(); // Default mapping not used
      }
    });
  });
  
  describe('Filter Function', () => {
    it('should filter entries based on filter function', async () => {
      const loader = quartoLoader({
        quartoRoot: fixturesPath,
        listings: 'blog-posts',
        filter: (entry) => {
          // Only include non-draft entries
          return entry.draft !== true;
        },
      });
      
      const store = createMockStore();
      
      await loader.load({
        store,
        logger: mockLogger,
        meta: { mode: 'build' },
        parseData: async () => ({}),
      });
      
      // Check that no drafts were included
      const entries = store.all();
      for (const entry of entries) {
        expect(entry.draft).not.toBe(true);
      }
    });
    
    it('should support async filter function', async () => {
      const loader = quartoLoader({
        quartoRoot: fixturesPath,
        listings: 'blog-posts',
        filter: async (entry) => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 1));
          return entry.draft !== true;
        },
      });
      
      const store = createMockStore();
      
      await loader.load({
        store,
        logger: mockLogger,
        meta: { mode: 'build' },
        parseData: async () => ({}),
      });
      
      expect(store.entries.size).toBeGreaterThan(0);
    });
  });
  
  describe('Transform Function', () => {
    it('should transform entries', async () => {
      const loader = quartoLoader({
        quartoRoot: fixturesPath,
        listings: 'blog-posts',
        transform: (entry) => ({
          ...entry,
          customField: 'transformed',
        }),
      });
      
      const store = createMockStore();
      
      await loader.load({
        store,
        logger: mockLogger,
        meta: { mode: 'build' },
        parseData: async () => ({}),
      });
      
      const firstEntry = store.entries.values().next().value;
      expect(firstEntry?.customField).toBe('transformed');
    });
    
    it('should support async transform function', async () => {
      const loader = quartoLoader({
        quartoRoot: fixturesPath,
        listings: 'blog-posts',
        transform: async (entry) => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return {
            ...entry,
            asyncField: 'done',
          };
        },
      });
      
      const store = createMockStore();
      
      await loader.load({
        store,
        logger: mockLogger,
        meta: { mode: 'build' },
        parseData: async () => ({}),
      });
      
      const firstEntry = store.entries.values().next().value;
      expect(firstEntry?.asyncField).toBe('done');
    });
  });
  
  describe('Schema Generation', () => {
    it('should generate and return schema', async () => {
      const loader = quartoLoader({
        quartoRoot: fixturesPath,
        listings: 'blog-posts',
      });
      
      const schema = await loader.schema!();
      expect(schema).toBeDefined();
      expect(schema.shape).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should throw error for non-existent listing', async () => {
      const loader = quartoLoader({
        quartoRoot: fixturesPath,
        listings: 'non-existent-listing',
      });
      
      const store = createMockStore();
      
      await expect(
        loader.load({
          store,
          logger: mockLogger,
          meta: { mode: 'build' },
          parseData: async () => ({}),
        })
      ).rejects.toThrow();
    });
    
    it('should throw error for non-existent Quarto root', async () => {
      const loader = quartoLoader({
        quartoRoot: '/non/existent/path',
        listings: 'posts',
      });
      
      const store = createMockStore();
      
      await expect(
        loader.load({
          store,
          logger: mockLogger,
          meta: { mode: 'build' },
          parseData: async () => ({}),
        })
      ).rejects.toThrow();
    });
  });
});

