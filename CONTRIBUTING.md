# Contributing to astro-loader-quarto

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or pnpm
- Quarto 1.3 or higher (for testing)
- Git

### Setup Steps

1. Fork and clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/astro-loader-quarto.git
cd astro-loader-quarto
```

2. Install dependencies:

```bash
npm install
```

3. Build the package:

```bash
npm run build
```

4. Run tests:

```bash
npm test
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Building

```bash
# Build once
npm run build

# Build in watch mode
npm run dev
```

## Project Structure

```
astro-loader-quarto/
├── src/
│   ├── index.ts              # Main entry point
│   ├── loader.ts             # Astro Loader implementation
│   ├── parsers/              # Parsing modules
│   ├── schema/               # Schema generation
│   ├── utils/                # Utilities
│   └── types/                # TypeScript types
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── fixtures/             # Test fixtures
├── docs/                     # Documentation
└── examples/                 # Example projects
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Write clear, readable code
- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass

### 3. Test Your Changes

```bash
# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build

# Test in example project
cd examples/basic-blog
npm install
quarto render quarto
npm run dev
```

### 4. Commit Your Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update documentation"
git commit -m "test: add tests"
git commit -m "refactor: improve code"
```

### 5. Push and Create PR

```bash
git push origin your-branch-name
```

Then create a Pull Request on GitHub.

## Pull Request Guidelines

### PR Description

- Clearly describe what your PR does
- Link related issues
- Include screenshots/examples if applicable
- List any breaking changes

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Code follows project style
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (for significant changes)
- [ ] Example project still works
- [ ] Commits follow Conventional Commits format

## Code Style

### TypeScript

- Use TypeScript for all code
- Provide type annotations for public APIs
- Avoid `any` types when possible
- Use interfaces for public types

### Naming Conventions

- Use camelCase for functions and variables
- Use PascalCase for classes and types
- Use UPPER_SNAKE_CASE for constants
- Use descriptive names

### Code Organization

- One feature per file when possible
- Group related functionality
- Export public APIs from index files
- Keep files focused and manageable

### Comments

- Use JSDoc for public APIs
- Explain "why" not "what"
- Keep comments up to date

## Testing Guidelines

### Unit Tests

- Test individual functions and modules
- Mock external dependencies
- Cover edge cases
- Use descriptive test names

### Integration Tests

- Test complete workflows
- Use realistic fixtures
- Test error scenarios
- Ensure cleanup after tests

### Test Structure

```typescript
describe('Feature Name', () => {
  describe('specific aspect', () => {
    it('should do something specific', () => {
      // Arrange
      const input = ...;

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

## Documentation

### When to Update Docs

- Adding new features
- Changing APIs
- Fixing bugs that affect usage
- Adding examples

### Documentation Files

- `README.md` - Main documentation
- `docs/api.md` - API reference
- `docs/field-mappings.md` - Field mapping guide
- `docs/examples.md` - Usage examples
- `CHANGELOG.md` - Version history

## Reporting Issues

### Bug Reports

Include:

- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment (Node version, Astro version, etc.)
- Minimal reproduction example

### Feature Requests

Include:

- Use case / problem to solve
- Proposed solution
- Alternative solutions considered
- Examples of usage

## Questions?

- Open an issue for questions
- Check existing issues first
- Be respectful and patient

## License

By contributing, you agree that your contributions will be licensed under the GPL-3.0 License.
