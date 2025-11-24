/**
 * Parser for Quarto YAML configuration files (_quarto.yml)
 */

import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import type { QuartoConfig, QuartoListing } from '../types/quarto.js';
import { QuartoConfigError } from '../utils/errors.js';

/**
 * Parse _quarto.yml configuration file
 */
export async function parseQuartoYaml(path: string): Promise<QuartoConfig> {
  try {
    const content = await readFile(path, 'utf-8');
    const config = parseYaml(content) as QuartoConfig;
    
    if (!config || typeof config !== 'object') {
      throw new QuartoConfigError('Invalid Quarto configuration: expected YAML object', path);
    }
    
    return config;
  } catch (error) {
    if (error instanceof QuartoConfigError) {
      throw error;
    }
    
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new QuartoConfigError(`Quarto configuration file not found: ${path}`, path);
    }
    
    throw new QuartoConfigError(
      `Failed to parse Quarto configuration: ${(error as Error).message}`,
      path
    );
  }
}

/**
 * Extract listing definitions from Quarto config
 */
export function extractListings(config: QuartoConfig): QuartoListing[] {
  if (!config.listing) {
    return [];
  }
  
  // Handle both single listing and array of listings
  const listings = Array.isArray(config.listing) ? config.listing : [config.listing];
  
  // Validate listings
  return listings.map((listing, index) => {
    if (!listing.id) {
      throw new QuartoConfigError(
        `Listing at index ${index} is missing required 'id' field`
      );
    }
    
    if (!listing.contents) {
      throw new QuartoConfigError(
        `Listing '${listing.id}' is missing required 'contents' field`
      );
    }
    
    return listing;
  });
}

/**
 * Get output directory from Quarto config
 */
export function getOutputDir(config: QuartoConfig): string {
  return config.project?.['output-dir'] || '_site';
}

/**
 * Find a specific listing by ID
 */
export function findListing(
  config: QuartoConfig,
  listingId: string
): QuartoListing | undefined {
  const listings = extractListings(config);
  return listings.find(l => l.id === listingId);
}

/**
 * Get all listing IDs from config
 */
export function getListingIds(config: QuartoConfig): string[] {
  const listings = extractListings(config);
  return listings.map(l => l.id);
}

