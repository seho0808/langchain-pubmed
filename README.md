# 🧬 langchain-pubmed

LangChain.js integration for PubMed API - search biomedical literature and retrieve article metadata.

[![npm version](https://img.shields.io/npm/v/langchain-pubmed.svg)](https://www.npmjs.com/package/langchain-pubmed)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔍 Search PubMed's 35+ million biomedical literature citations
- 🤖 Ready-to-use LangChain Tool for AI agents
- 📄 Returns structured article metadata (title, abstract, publication date)
- ⚡ Built-in retry logic and rate limit handling
- 🔄 Supports streaming results with async iterators
- 🎯 Converts to LangChain Documents for RAG applications

## Installation

```bash
npm install langchain-pubmed @langchain/core
```

## Quick Start

```typescript
import { PubMedTool } from "langchain-pubmed";

const tool = new PubMedTool({
  topKResults: 3,
  email: "your_email@example.com", // Recommended for better rate limits
});

const result = await tool.invoke("covid-19 vaccine efficacy");
console.log(result);
```

## Environment Variables

Set these environment variables to avoid hardcoding credentials:

```bash
export PUBMED_EMAIL="your_email@example.com"
export PUBMED_API_KEY="your_ncbi_api_key"  # Optional, for higher rate limits
```

Then use without passing credentials:

```typescript
const tool = new PubMedTool({ topKResults: 3 });
```

## Usage

### 1. As a LangChain Tool

```typescript
import { PubMedTool } from "langchain-pubmed";

const tool = new PubMedTool({
  topKResults: 3,
  email: "your_email@example.com",
});

// Direct invocation
const result = await tool.invoke("diabetes treatment");
console.log(result);
```

### 2. With an AI Agent

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { PubMedTool } from "langchain-pubmed";
import dotenv from "dotenv";

dotenv.config();

const model = new ChatOpenAI({
  model: "gpt-5-nano",
});

const tools = [
  new PubMedTool({
    topKResults: 5,
  }),
];

const agent = createAgent({ model, tools });

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "What are the latest treatments for Alzheimer's disease?",
    },
  ],
});

console.log(result.messages[result.messages.length - 1].content);
```

### 3. Direct API Wrapper

```typescript
import { PubMedAPIWrapper } from "langchain-pubmed";

const pubmed = new PubMedAPIWrapper({
  topKResults: 5,
  email: "your_email@example.com",
  apiKey: "your_ncbi_api_key", // Optional: for higher rate limits
});

// Get structured metadata
const articles = await pubmed.load("cancer immunotherapy");
articles.forEach((article) => {
  console.log(article.Title);
  console.log(article.Summary);
});

// Get LangChain Documents
const documents = await pubmed.loadDocs("machine learning healthcare");

// Stream results
for await (const article of pubmed.lazyLoad("alzheimer disease")) {
  console.log(article.Title);
}
```

### 4. For RAG Applications

```typescript
import { PubMedAPIWrapper } from "langchain-pubmed";

const pubmed = new PubMedAPIWrapper({
  topKResults: 10,
  email: "your_email@example.com",
});

// Get LangChain Documents for vector store
const documents = await pubmed.loadDocs("CRISPR gene editing");

// Add to your vector store
// await vectorStore.addDocuments(documents);
```

## Configuration Options

| Option                                             | Type     | Default                    | Description                     |
| -------------------------------------------------- | -------- | -------------------------- | ------------------------------- |
| `topKResults`                                      | `number` | `3`                        | Number of results to return     |
| `maxQueryLength`                                   | `number` | `300`                      | Max query length (chars)        |
| `docContentCharsMax`                               | `number` | `2000`                     | Max content length (chars)      |
| `maxRetry`                                         | `number` | `5`                        | Max retries on rate limit       |
| `sleepTime`                                        | `number` | `200`                      | Initial retry delay (ms)        |
| `email`                                            | `string` | `"your_email@example.com"` | Email for PubMed API            |
| `apiKey`                                           | `string` | `""`                       | NCBI API key (optional)         |
| Plus all `ToolParams` from `@langchain/core/tools` |          |                            | Callbacks, tags, metadata, etc. |

## Rate Limits

- **Without API key:** 3 requests/second
- **With API key:** 10 requests/second

Get a free API key at: https://www.ncbi.nlm.nih.gov/account/settings/

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run e2e tests (calls actual PubMed API)
npm run test:e2e

# Run unit tests
npm run test:unit

# Lint
npm run lint

# Format
npm run format
```

## Example

See [example.ts](example.ts) for a complete working example.

```bash
# Build first, then run the example
npm run build
npx ts-node example.ts
```

## API

### PubMedTool

Main tool class for LangChain agents.

```typescript
const tool = new PubMedTool(options);
const result = await tool.invoke(query);
```

### PubMedAPIWrapper

Core API wrapper with multiple access methods.

**Methods:**

- `run(query)` - Get formatted search results string
- `load(query)` - Get array of article metadata
- `loadDocs(query)` - Get array of LangChain Documents
- `lazyLoad(query)` - Async iterator over article metadata
- `lazyLoadDocs(query)` - Async iterator over Documents

## License

MIT

## Credits

TypeScript port of the [Python LangChain PubMed integration](https://github.com/langchain-ai/langchain/tree/master/libs/community/langchain_community/utilities/pubmed.py).

## Resources

- [PubMed](https://pubmed.ncbi.nlm.nih.gov/)
- [NCBI E-utilities API](https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- [LangChain.js](https://js.langchain.com/)
