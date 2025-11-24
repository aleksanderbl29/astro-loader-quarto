/**
 * Custom error classes for Quarto Loader
 */

export class QuartoLoaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuartoLoaderError';
  }
}

export class QuartoConfigError extends QuartoLoaderError {
  constructor(message: string, public readonly configPath?: string) {
    super(message);
    this.name = 'QuartoConfigError';
  }
}

export class QmdParseError extends QuartoLoaderError {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly lineNumber?: number
  ) {
    super(`Failed to parse ${filePath}${lineNumber ? ` at line ${lineNumber}` : ''}: ${message}`);
    this.name = 'QmdParseError';
  }
}

export class FieldMappingConflictError extends QuartoLoaderError {
  constructor(
    public readonly quartoField: string,
    public readonly mappedField: string,
    public readonly existingField: string,
    public readonly filePath: string
  ) {
    super(
      `Field mapping conflict in ${filePath}: Cannot map '${quartoField}' to '${mappedField}' because '${mappedField}' already exists in the source data. ` +
      `Please choose a different mapping or remove the conflicting field.`
    );
    this.name = 'FieldMappingConflictError';
  }
}

export class ValidationError extends QuartoLoaderError {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly errors?: Array<{ field: string; message: string }>
  ) {
    let fullMessage = message;
    if (filePath) {
      fullMessage = `Validation error in ${filePath}: ${message}`;
    }
    if (errors && errors.length > 0) {
      fullMessage += '\n' + errors.map(e => `  - ${e.field}: ${e.message}`).join('\n');
    }
    super(fullMessage);
    this.name = 'ValidationError';
  }
}

export class ListingNotFoundError extends QuartoLoaderError {
  constructor(
    public readonly listingId: string,
    public readonly availableListings: string[]
  ) {
    super(
      `Listing '${listingId}' not found. Available listings: ${availableListings.join(', ')}`
    );
    this.name = 'ListingNotFoundError';
  }
}

