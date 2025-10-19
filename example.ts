/**
 * Complete example demonstrating langchain-pubmed usage
 *
 * Run with: npm run build && node example.ts
 */

import { PubMedTool, PubMedAPIWrapper } from "./dist/index.js";

async function main() {
  console.log("=".repeat(80));
  console.log("PubMed LangChain Integration - Complete Example");
  console.log("=".repeat(80));
  console.log();

  // Example 1: Basic Tool Usage
  console.log("Example 1: Basic Tool Usage");
  console.log("-".repeat(80));

  const tool = new PubMedTool({
    topKResults: 2,
    email: "your_email@example.com", // Replace with your email
  });

  const toolResult = await tool.invoke("CRISPR gene editing");
  console.log(toolResult);
  console.log();

  // Example 2: Using API Wrapper for Structured Data
  console.log("Example 2: Using API Wrapper for Structured Data");
  console.log("-".repeat(80));

  const pubmed = new PubMedAPIWrapper({
    topKResults: 3,
    email: "your_email@example.com",
  });

  const articles = await pubmed.load("covid-19 vaccine");

  articles.forEach((article, idx) => {
    console.log(`\nArticle ${idx + 1}:`);
    console.log(`  UID: ${article.uid}`);
    console.log(`  Title: ${article.Title}`);
    console.log(`  Published: ${article.Published}`);
    console.log(`  Summary: ${article.Summary.substring(0, 150)}...`);
  });
  console.log();

  // Example 3: Getting LangChain Documents
  console.log("Example 3: Getting LangChain Documents");
  console.log("-".repeat(80));

  const documents = await pubmed.loadDocs("alzheimer disease");

  console.log(`\nFound ${documents.length} documents`);
  documents.forEach((doc, idx) => {
    console.log(`\nDocument ${idx + 1}:`);
    console.log(`  Content length: ${doc.pageContent.length} chars`);
    console.log(`  Metadata:`, doc.metadata);
  });
  console.log();

  // Example 4: Streaming Results
  console.log("Example 4: Streaming Results with Async Iterator");
  console.log("-".repeat(80));

  let count = 0;
  for await (const article of pubmed.lazyLoad("machine learning healthcare")) {
    count++;
    console.log(`\nStreamed Article ${count}:`);
    console.log(`  Title: ${article.Title}`);
    console.log(`  Published: ${article.Published}`);
  }

  console.log();
  console.log("=".repeat(80));
  console.log("Examples completed!");
  console.log("=".repeat(80));
}

main().catch(console.error);
