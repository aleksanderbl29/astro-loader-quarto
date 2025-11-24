/**
 * Schema generator - infers Zod schemas from parsed metadata
 */

import { z } from 'zod';
import type { QuartoListing } from '../types/quarto.js';
import type { SchemaConfig } from '../types/loader-config.js';
import { commonFields, getFieldSchema } from './common-fields.js';

/**
 * Schema generation options
 */
export interface SchemaOptions {
  strictMode?: boolean;
  requiredFields?: string[];
  customFields?: Record<string, z.ZodType<unknown>>;
}

/**
 * Infer Zod type from a value
 */
function inferTypeFromValue(value: unknown): z.ZodType<unknown> {
  if (value === null || value === undefined) {
    return z.unknown();
  }
  
  if (value instanceof Date) {
    return z.date();
  }
  
  if (typeof value === 'string') {
    return z.string();
  }
  
  if (typeof value === 'number') {
    return z.number();
  }
  
  if (typeof value === 'boolean') {
    return z.boolean();
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return z.array(z.unknown());
    }
    // Infer from first element
    const elementType = inferTypeFromValue(value[0]);
    return z.array(elementType);
  }
  
  if (typeof value === 'object') {
    return z.record(z.unknown());
  }
  
  return z.unknown();
}

/**
 * Infer field type from multiple values
 */
export function inferFieldType(
  fieldName: string,
  values: unknown[]
): z.ZodType<unknown> {
  // Check if it's a common field first
  const commonSchema = getFieldSchema(fieldName);
  if (commonSchema) {
    return commonSchema;
  }
  
  // Filter out undefined values
  const definedValues = values.filter(v => v !== undefined);
  
  if (definedValues.length === 0) {
    return z.unknown().optional();
  }
  
  // Infer from first non-undefined value
  const baseType = inferTypeFromValue(definedValues[0]);
  
  // Check if all values have the same type
  const allSameType = definedValues.every(v => {
    const type = inferTypeFromValue(v);
    return (type as any)._def?.typeName === (baseType as any)._def?.typeName;
  });
  
  if (!allSameType) {
    // Mixed types - use union or unknown
    return z.unknown().optional();
  }
  
  // If not all entries have this field, make it optional
  if (definedValues.length < values.length) {
    return baseType.optional();
  }
  
  return baseType;
}

/**
 * Generate schema from parsed documents
 */
export function generateSchema(
  documents: Array<Record<string, unknown>>,
  _listing: QuartoListing,
  options: SchemaOptions = {}
): z.ZodObject<any> {
  const schemaFields: Record<string, z.ZodType<unknown>> = {};
  
  // Collect all field names
  const allFieldNames = new Set<string>();
  for (const doc of documents) {
    for (const key of Object.keys(doc)) {
      allFieldNames.add(key);
    }
  }
  
  // Generate schema for each field
  for (const fieldName of allFieldNames) {
    const values = documents.map(doc => doc[fieldName]);
    
    // Use custom field schema if provided
    if (options.customFields && fieldName in options.customFields) {
      schemaFields[fieldName] = options.customFields[fieldName]!;
    } else {
      schemaFields[fieldName] = inferFieldType(fieldName, values);
    }
    
    // Mark as required if specified
    if (options.requiredFields?.includes(fieldName)) {
      schemaFields[fieldName] = schemaFields[fieldName]!;
    }
  }
  
  // Ensure minimum required fields
  if (!schemaFields['title']) {
    schemaFields['title'] = commonFields.title;
  }
  
  if (!schemaFields['pubDate'] && !schemaFields['date']) {
    schemaFields['pubDate'] = commonFields.pubDate;
  }
  
  return z.object(schemaFields);
}

/**
 * Apply schema configuration (extend/override)
 */
export function applySchemaConfig(
  baseSchema: z.ZodObject<any>,
  config?: SchemaConfig,
  logger?: { warn: (msg: string) => void }
): z.ZodObject<any> {
  if (!config) {
    return baseSchema;
  }
  
  // Override takes precedence
  if (config.override) {
    return config.override;
  }
  
  // Extend base schema
  if (config.extend) {
    try {
      // Merge schemas - extend fields will override base fields
      const merged = baseSchema.merge(config.extend);
      return merged;
    } catch (error) {
      if (logger) {
        logger.warn(
          `Schema merge conflict: ${(error as Error).message}. Using base schema.`
        );
      }
      return baseSchema;
    }
  }
  
  return baseSchema;
}

/**
 * Create schema from listing configuration
 */
export function createListingSchema(
  listing: QuartoListing,
  documents: Array<Record<string, unknown>>,
  userConfig?: SchemaConfig,
  logger?: { warn: (msg: string) => void }
): z.ZodObject<any> {
  // Get required fields from listing config
  const requiredFields = listing['field-required'] || [];
  
  // Generate base schema from documents
  const generatedSchema = generateSchema(documents, listing, {
    requiredFields,
  });
  
  // Apply user configuration
  return applySchemaConfig(generatedSchema, userConfig, logger);
}

