import { Document } from "@langchain/core/documents";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import {
  PubMedAPIWrapperOptions,
  PubMedArticleMetadata,
  PubMedSearchResult,
} from "./types.js";
import { RetryableHttpClient } from "./http-client.js";
import { PubMedURLBuilder } from "./url-builder.js";
import { PubMedParser } from "./pubmed-parser.js";

/**
 * Wrapper around PubMed API.
 *
 * This wrapper uses the PubMed E-utilities API to conduct searches and fetch
 * document summaries. By default, it returns the document summaries
 * of the top-k results of an input search.
 *
 * @example
 * ```typescript
 * const pubmed = new PubMedAPIWrapper({
 *   topKResults: 5,
 *   email: "your_email@example.com",
 *   apiKey: "your_api_key"
 * });
 *
 * const results = await pubmed.run("covid-19 vaccine");
 * console.log(results);
 * ```
 */
export class PubMedAPIWrapper {
  private readonly topKResults: number;
  private readonly maxQueryLength: number;
  private readonly docContentCharsMax: number;

  private readonly httpClient: RetryableHttpClient;
  private readonly urlBuilder: PubMedURLBuilder;
  private readonly parser: PubMedParser;

  constructor(options: PubMedAPIWrapperOptions = {}) {
    this.topKResults = options.topKResults ?? 5;
    this.maxQueryLength = options.maxQueryLength ?? 300;
    this.docContentCharsMax = options.docContentCharsMax ?? 10000;

    const email =
      options.email ??
      getEnvironmentVariable("PUBMED_EMAIL") ??
      "your_email@example.com";
    const apiKey =
      options.apiKey ?? getEnvironmentVariable("PUBMED_API_KEY") ?? "";

    this.httpClient = new RetryableHttpClient({
      maxRetry: options.maxRetry ?? 5,
      initialSleepTime: options.sleepTime ?? 200,
    });

    this.urlBuilder = new PubMedURLBuilder(email, apiKey);
    this.parser = new PubMedParser();
  }

  /**
   * Run PubMed search and get the article meta information.
   * See https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESearch
   * It uses only the most informative fields of article meta information.
   *
   * @param query - The search query to execute
   * @returns A formatted string containing article metadata, or an error message
   */
  async run(query: string): Promise<string> {
    try {
      const results = await this.load(query.substring(0, this.maxQueryLength));

      if (results.length === 0) {
        return "No good PubMed Result was found";
      }

      const formattedResults = results.map(this.formatArticle);
      return formattedResults
        .join("\n\n")
        .substring(0, this.docContentCharsMax);
    } catch (error) {
      return `PubMed exception: ${error}`;
    }
  }

  /**
   * Format a single article metadata into a readable string.
   */
  private formatArticle(article: PubMedArticleMetadata): string {
    return (
      `Published: ${article.Published}\n` +
      `Title: ${article.Title}\n` +
      `Copyright Information: ${article["Copyright Information"]}\n` +
      `Summary:\n${article.Summary}`
    );
  }

  /**
   * Search PubMed for documents matching the query.
   * Return an async iterator of dictionaries containing the document metadata.
   *
   * @param query - The search query
   */
  async *lazyLoad(
    query: string
  ): AsyncGenerator<PubMedArticleMetadata, void, unknown> {
    const searchUrl = this.urlBuilder.buildSearchUrl(query, this.topKResults);
    const response = await this.httpClient.fetch(searchUrl, "search request");

    const data = (await response.json()) as PubMedSearchResult;

    if (!data.esearchresult || !data.esearchresult.webenv) {
      throw new Error("Invalid response from PubMed API");
    }

    const webenv = data.esearchresult.webenv;
    const idList = data.esearchresult.idlist || [];

    for (const uid of idList) {
      yield await this.retrieveArticle(uid, webenv);
    }
  }

  /**
   * Search PubMed for documents matching the query.
   * Return a list of dictionaries containing the document metadata.
   *
   * @param query - The search query
   * @returns A promise that resolves to an array of article metadata
   */
  async load(query: string): Promise<PubMedArticleMetadata[]> {
    const results: PubMedArticleMetadata[] = [];
    for await (const result of this.lazyLoad(query)) {
      results.push(result);
    }
    return results;
  }

  /**
   * Convert a metadata dictionary to a LangChain Document.
   *
   * @param doc - The article metadata
   * @returns A Document instance
   */
  private dictToDocument(doc: PubMedArticleMetadata): Document {
    return this.parser.toDocument(doc);
  }

  /**
   * Search PubMed and return an async iterator of Document instances.
   *
   * @param query - The search query
   */
  async *lazyLoadDocs(query: string): AsyncGenerator<Document, void, unknown> {
    for await (const doc of this.lazyLoad(query)) {
      yield this.dictToDocument(doc);
    }
  }

  /**
   * Search PubMed and return a list of Document instances.
   *
   * @param query - The search query
   * @returns A promise that resolves to an array of Documents
   */
  async loadDocs(query: string): Promise<Document[]> {
    const docs: Document[] = [];
    for await (const doc of this.lazyLoadDocs(query)) {
      docs.push(doc);
    }
    return docs;
  }

  /**
   * Retrieve a single article from PubMed by UID.
   *
   * @param uid - The PubMed article ID
   * @param webenv - The web environment string from the search
   * @returns A promise that resolves to the article metadata
   */
  private async retrieveArticle(
    uid: string,
    webenv: string
  ): Promise<PubMedArticleMetadata> {
    const fetchUrl = this.urlBuilder.buildFetchUrl(uid, webenv);
    const response = await this.httpClient.fetch(fetchUrl, `article ${uid}`);

    const xmlText = await response.text();
    const xmlResponse = this.parser.parseXML(xmlText);

    return this.parser.extractArticleMetadata(uid, xmlResponse);
  }
}
