# Setup and Publishing Guide

## Quick Setup

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run only e2e tests (actual PubMed API calls)
npm run test:e2e

# Run only unit tests
npm run test:unit

# Lint and format
npm run lint
npm run format
```

## Run the Example

```bash
# Build first
npm run build

# Run the example
npx ts-node example.ts
```

## Publishing to npm

1. **Update version** in `package.json`

2. **Build and test**:

   ```bash
   npm run build
   npm test
   ```

3. **Login to npm** (first time only):

   ```bash
   npm login
   ```

4. **Publish**:
   ```bash
   npm publish
   ```

## Project Structure

```
langchain-pubmed/
├── src/                    # Source code
│   ├── index.ts           # Main exports
│   ├── types.ts           # TypeScript types
│   ├── pubmed-api.ts      # API wrapper
│   └── pubmed-tool.ts     # LangChain tool
├── test/                   # Tests
│   ├── e2e/               # E2E tests (real API calls)
│   └── unit/              # Unit tests
├── dist/                   # Build output (generated)
├── priv/                   # Reference implementations (not published)
├── example.ts              # Usage example
├── package.json            # Package config
├── tsconfig.json           # TypeScript config
├── jest.config.js          # Jest config
└── README.md              # Documentation
```

## What Gets Published

Only these files are published to npm (see `.npmignore`):

- `dist/` - Compiled JavaScript and types
- `README.md`
- `LICENSE`
- `package.json`

## Testing

- **Unit tests**: Test configuration, types, and utilities
- **E2E tests**: Make actual API calls to PubMed (require internet)

## Next Steps

1. Test the package locally before publishing
2. Update README with any changes
3. Update CHANGELOG.md with version notes
4. Publish to npm!
