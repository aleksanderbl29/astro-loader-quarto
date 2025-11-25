# 1.0.0 (2025-11-25)


### Bug Fixes

* convert absolute paths to relative for Astro store ([b1b4291](https://github.com/aleksanderbl29/astro-loader-quarto/commit/b1b42918fa849046ff0bc1fed422011170a253bc))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-24

### Added

- Initial release of astro-loader-quarto
- Core Astro Loader implementation for Quarto content
- Support for reading Quarto listing configurations from `_quarto.yml`
- Parsing of `.qmd` files with YAML frontmatter extraction
- Default field mappings (date → pubDate, date-modified → updatedDate, image → heroImage)
- Customizable field mapping configuration
- Multiple listings support
- Filter function for conditional entry inclusion
- Transform function for custom entry processing
- Auto-generated Zod schemas with type inference
- Custom schema extension and override support
- File caching for improved performance
- File watching for hot module replacement in development
- Parallel file parsing
- Comprehensive error handling with custom error classes
- Full TypeScript support with type definitions
- Unit tests for parsers and utilities
- Integration tests with fixtures
- Complete documentation (README, API docs, field mappings guide, examples)
- Working example blog project
- Support for Astro 4.0+ Loader API
- Compatible with Quarto 1.3+

### Features

- Zero-config setup with sensible defaults
- Field mapping to match Astro blog conventions
- Multiple collections from different Quarto listings
- Async filter and transform functions
- Listing-level default field inheritance
- Configurable asset handling strategies
- Draft filtering support
- Date normalization (YYYY-MM-DD, ISO 8601)
- Author field normalization (string or array)
- Categories and tags array normalization
- Slug generation from filename or title
- Field mapping conflict detection
- Schema validation with detailed error messages

### Documentation

- Comprehensive README with quick start guide
- API documentation with all configuration options
- Field mappings guide with examples and edge cases
- Examples documentation with advanced use cases
- Working example project with sample Quarto content

### Testing

- Unit tests for all core modules
- Integration tests with realistic fixtures
- Sample Quarto project for testing

## [Unreleased]

### Planned

- Auto-render integration (optional Quarto execution during build)
- Content rendering support (HTML extraction from rendered Quarto)
- Cross-reference support between documents
- Computed field support from Quarto code execution
- Performance benchmarks
- GitHub Actions CI/CD pipeline
- NPM package publishing automation

[0.1.0]: https://github.com/aleksanderbl29/astro-loader-quarto/releases/tag/v0.1.0
