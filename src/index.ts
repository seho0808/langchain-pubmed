/**
 * langchain-pubmed - LangChain.js integration for PubMed API
 *
 * This package provides tools to search PubMed's biomedical literature database
 * and retrieve article metadata for use in LangChain applications.
 *
 * Main exports:
 * - {@link PubMedTool} - LangChain Tool for searching PubMed (recommended for most users)
 * - {@link PubMedAPIWrapper} - Lower-level wrapper for advanced use cases
 *
 * @packageDocumentation
 */

// Main Tool export - most users will use this
export { PubMedTool } from "./pubmed-tool.js";

// API wrapper for advanced use cases
export { PubMedAPIWrapper } from "./pubmed-api.js";

// Advanced exports - for customization and testing
export { RetryableHttpClient } from "./http-client.js";
export { PubMedURLBuilder } from "./url-builder.js";
export { PubMedParser } from "./pubmed-parser.js";

// Type exports
export type {
  PubMedAPIWrapperOptions,
  PubMedArticleMetadata,
  PubMedSearchResult,
  PubMedArticle,
  PubMedBookArticle,
  PubMedArticleData,
  AbstractText,
  PubMedXMLResponse,
} from "./types.js";
export type { RetryableHttpClientOptions } from "./http-client.js";
