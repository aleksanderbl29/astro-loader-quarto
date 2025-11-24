/**
 * Unit tests for parser modules
 */

import { describe, it, expect } from 'vitest';
import { extractMetadata, normalizeDate } from '../../src/parsers/qmd-frontmatter.js';
import { 
  applyFieldMappings, 
  generateSlug, 
  inheritListingDefaults,
  mergeFieldMappings 
} from '../../src/parsers/metadata-normalizer.js';
import { extractListings } from '../../src/parsers/quarto-yaml.js';
import { DEFAULT_FIELD_MAPPINGS } from '../../src/types/loader-config.js';
import { FieldMappingConflictError } from '../../src/utils/errors.js';

describe('QMD Frontmatter Parser', () => {
  describe('extractMetadata', () => {
    it('should extract and normalize basic metadata', () => {
      const frontmatter = {
        title: 'Test Post',
        description: 'A test post',
        author: 'John Doe',
        date: '2025-11-24',
      };
      
      const metadata = extractMetadata(frontmatter);
      
      expect(metadata.title).toBe('Test Post');
      expect(metadata.description).toBe('A test post');
      expect(metadata.author).toBe('John Doe');
      expect(metadata.date).toBeInstanceOf(Date);
    });
    
    it('should handle author as array', () => {
      const frontmatter = {
        author: ['John Doe', 'Jane Smith'],
      };
      
      const metadata = extractMetadata(frontmatter);
      expect(metadata.author).toEqual(['John Doe', 'Jane Smith']);
    });
    
    it('should normalize categories and tags', () => {
      const frontmatter = {
        categories: ['Tech', 'Web'],
        tags: 'javascript, typescript',
      };
      
      const metadata = extractMetadata(frontmatter);
      expect(metadata.categories).toEqual(['Tech', 'Web']);
      expect(metadata.tags).toEqual(['javascript', 'typescript']);
    });
    
    it('should normalize draft field', () => {
      const metadata1 = extractMetadata({ draft: true });
      expect(metadata1.draft).toBe(true);
      
      const metadata2 = extractMetadata({ draft: 'true' });
      expect(metadata2.draft).toBe(true);
      
      const metadata3 = extractMetadata({});
      expect(metadata3.draft).toBeUndefined();
    });
  });
  
  describe('normalizeDate', () => {
    it('should parse YYYY-MM-DD format', () => {
      const date = normalizeDate('2025-11-24');
      expect(date).toBeInstanceOf(Date);
      expect((date as Date).getFullYear()).toBe(2025);
    });
    
    it('should parse ISO 8601 format', () => {
      const date = normalizeDate('2025-11-24T10:30:00Z');
      expect(date).toBeInstanceOf(Date);
    });
    
    it('should pass through Date objects', () => {
      const inputDate = new Date('2025-11-24');
      const date = normalizeDate(inputDate);
      expect(date).toBe(inputDate);
    });
  });
});

describe('Metadata Normalizer', () => {
  describe('applyFieldMappings', () => {
    it('should apply field mappings', () => {
      const metadata = {
        date: new Date('2025-11-24'),
        'date-modified': new Date('2025-11-24'),
        image: 'cover.jpg',
      };
      
      const mapped = applyFieldMappings(
        metadata,
        DEFAULT_FIELD_MAPPINGS,
        'test.qmd'
      );
      
      expect(mapped.pubDate).toBeDefined();
      expect(mapped.updatedDate).toBeDefined();
      expect(mapped.heroImage).toBe('cover.jpg');
      expect(mapped.date).toBeUndefined();
    });
    
    it('should pass through unmapped fields', () => {
      const metadata = {
        title: 'Test',
        customField: 'value',
      };
      
      const mapped = applyFieldMappings(
        metadata,
        DEFAULT_FIELD_MAPPINGS,
        'test.qmd'
      );
      
      expect(mapped.title).toBe('Test');
      expect(mapped.customField).toBe('value');
    });
    
    it('should throw on field mapping conflict', () => {
      const metadata = {
        date: new Date('2025-11-24'),
        pubDate: new Date('2025-11-24'), // Conflict!
      };
      
      expect(() => {
        applyFieldMappings(metadata, DEFAULT_FIELD_MAPPINGS, 'test.qmd');
      }).toThrow(FieldMappingConflictError);
    });
  });
  
  describe('generateSlug', () => {
    it('should generate slug from filename', () => {
      const slug = generateSlug('/path/to/my-post.qmd');
      expect(slug).toBe('my-post');
    });
    
    it('should remove date prefix from filename', () => {
      const slug = generateSlug('/path/to/2025-11-24-my-post.qmd');
      expect(slug).toBe('my-post');
    });
    
    it('should normalize special characters', () => {
      const slug = generateSlug('/path/to/My Cool Post!.qmd');
      expect(slug).toBe('my-cool-post');
    });
    
    it('should use custom slugify function', () => {
      const slug = generateSlug(
        '/path/to/test.qmd',
        'Test Title',
        (title) => title.toLowerCase().replace(' ', '_')
      );
      expect(slug).toBe('test_title');
    });
  });
  
  describe('inheritListingDefaults', () => {
    it('should inherit defaults for undefined fields', () => {
      const metadata = { title: 'Test' };
      const defaults = { author: 'Default Author', categories: ['Blog'] };
      
      const result = inheritListingDefaults(metadata, defaults);
      
      expect(result.title).toBe('Test');
      expect(result.author).toBe('Default Author');
      expect(result.categories).toEqual(['Blog']);
    });
    
    it('should not override existing fields', () => {
      const metadata = { title: 'Test', author: 'Specific Author' };
      const defaults = { author: 'Default Author' };
      
      const result = inheritListingDefaults(metadata, defaults);
      
      expect(result.author).toBe('Specific Author');
    });
  });
  
  describe('mergeFieldMappings', () => {
    it('should return defaults when no custom mappings', () => {
      const merged = mergeFieldMappings();
      expect(merged).toEqual(DEFAULT_FIELD_MAPPINGS);
    });
    
    it('should merge custom mappings with defaults', () => {
      const custom = { date: 'publishedAt', customField: 'mappedField' };
      const merged = mergeFieldMappings(custom);
      
      expect(merged.date).toBe('publishedAt');
      expect(merged.customField).toBe('mappedField');
      expect(merged['date-modified']).toBe('updatedDate'); // Default preserved
    });
  });
});

describe('Quarto YAML Parser', () => {
  describe('extractListings', () => {
    it('should extract single listing', () => {
      const config = {
        listing: {
          id: 'posts',
          contents: 'posts/*.qmd',
        },
      };
      
      const listings = extractListings(config);
      expect(listings).toHaveLength(1);
      expect(listings[0]?.id).toBe('posts');
    });
    
    it('should extract multiple listings', () => {
      const config = {
        listing: [
          { id: 'posts', contents: 'posts/*.qmd' },
          { id: 'docs', contents: 'docs/*.qmd' },
        ],
      };
      
      const listings = extractListings(config);
      expect(listings).toHaveLength(2);
      expect(listings[0]?.id).toBe('posts');
      expect(listings[1]?.id).toBe('docs');
    });
    
    it('should return empty array when no listings', () => {
      const config = {};
      const listings = extractListings(config);
      expect(listings).toHaveLength(0);
    });
  });
});

