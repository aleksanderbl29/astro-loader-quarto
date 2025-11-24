/**
 * Schema validator for parsed entries
 */

import type { z } from 'zod';
import { ValidationError } from '../utils/errors.js';

/**
 * Validation result
 */
export interface ValidationResult {
  success: boolean;
  data?: Record<string, unknown>;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Validate entry against schema
 */
export function validateEntry(
  entry: Record<string, unknown>,
  schema: z.ZodObject<any>,
  _filePath?: string
): ValidationResult {
  const result = schema.safeParse(entry);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  
  // Format Zod errors
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  
  return {
    success: false,
    errors,
  };
}

/**
 * Validate entry and throw on error
 */
export function validateEntryOrThrow(
  entry: Record<string, unknown>,
  schema: z.ZodObject<any>,
  filePath?: string
): Record<string, unknown> {
  const result = validateEntry(entry, schema, filePath);
  
  if (!result.success) {
    throw new ValidationError(
      'Entry validation failed',
      filePath,
      result.errors
    );
  }
  
  return result.data!;
}

/**
 * Validate multiple entries
 */
export function validateEntries(
  entries: Array<{ data: Record<string, unknown>; path: string }>,
  schema: z.ZodObject<any>
): Array<ValidationResult & { path: string }> {
  return entries.map(entry => ({
    path: entry.path,
    ...validateEntry(entry.data, schema, entry.path),
  }));
}

/**
 * Collect all validation errors
 */
export function collectValidationErrors(
  results: Array<ValidationResult & { path: string }>
): Array<{ path: string; errors: Array<{ field: string; message: string }> }> {
  return results
    .filter(r => !r.success)
    .map(r => ({
      path: r.path,
      errors: r.errors || [],
    }));
}

