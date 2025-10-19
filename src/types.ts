/**
 * Configuration options for the PubMed API wrapper.
 */
export interface PubMedAPIWrapperOptions {
  /**
   * Number of the top-scored documents to return from PubMed search.
   * @default 3
   */
  topKResults?: number;

  /**
   * Maximum length of the query in characters. Queries longer than this will be truncated.
   * @default 300
   */
  maxQueryLength?: number;

  /**
   * Maximum length of the document content in characters. Content will be truncated if it exceeds this length.
   * @default 2000
   */
  docContentCharsMax?: number;

  /**
   * Maximum number of retries for a request when rate limited.
   * @default 5
   */
  maxRetry?: number;

  /**
   * Initial time to wait between retries in milliseconds. This will increase exponentially with each retry.
   * @default 200
   */
  sleepTime?: number;

  /**
   * Email address to be used for the PubMed API. Required for higher rate limits.
   * @default "your_email@example.com"
   */
  email?: string;

  /**
   * API key for the PubMed API. Provides higher rate limits when specified.
   * @default ""
   */
  apiKey?: string;
}

/**
 * Metadata for a PubMed article.
 */
export interface PubMedArticleMetadata {
  /**
   * Unique identifier for the article in PubMed.
   */
  uid: string;

  /**
   * Title of the article.
   */
  Title: string;

  /**
   * Publication date in YYYY-MM-DD format.
   */
  Published: string;

  /**
   * Copyright information for the article abstract.
   */
  "Copyright Information": string;

  /**
   * Abstract summary of the article.
   */
  Summary: string;
}

/**
 * Response structure from PubMed eSearch API.
 */
export interface PubMedSearchResult {
  esearchresult: {
    webenv: string;
    idlist: string[];
    count?: string;
    retmax?: string;
  };
}

/**
 * Parsed article structure from PubMed XML response.
 */
export interface PubMedArticle {
  MedlineCitation?: {
    Article: PubMedArticleData;
  };
}

/**
 * Book document structure from PubMed XML response.
 */
export interface PubMedBookArticle {
  BookDocument: PubMedArticleData;
}

/**
 * Article data structure containing metadata and abstract.
 */
export interface PubMedArticleData {
  ArticleTitle?: string;
  ArticleDate?: {
    Year?: string;
    Month?: string;
    Day?: string;
  };
  Abstract?: {
    AbstractText?: AbstractText | string | Record<string, unknown>;
    CopyrightInformation?: string;
  };
}

/**
 * Abstract text with label (for structured abstracts).
 */
export interface AbstractText {
  "@Label"?: string;
  "#text"?: string;
  [key: string]: unknown;
}

/**
 * Root structure of PubMed XML response.
 */
export interface PubMedXMLResponse {
  PubmedArticleSet: {
    PubmedArticle?: PubMedArticle;
    PubmedBookArticle?: PubMedBookArticle;
  };
}

