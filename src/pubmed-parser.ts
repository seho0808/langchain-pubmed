import { Document } from "@langchain/core/documents";
import { XMLParser } from "fast-xml-parser";
import {
  PubMedArticleMetadata,
  PubMedXMLResponse,
  PubMedArticleData,
  AbstractText,
} from "./types.js";

/**
 * Parser for PubMed XML responses.
 *
 * Handles the complexities of parsing PubMed XML and extracting
 * structured metadata from articles.
 */
export class PubMedParser {
  private readonly parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@",
    });
  }

  /**
   * Parse XML text into a structured object.
   *
   * @param xmlText - The raw XML text
   * @returns The parsed XML as an object
   */
  parseXML(xmlText: string): PubMedXMLResponse {
    return this.parser.parse(xmlText) as PubMedXMLResponse;
  }

  /**
   * Extract article metadata from parsed XML.
   *
   * @param uid - The article UID
   * @param xmlResponse - The parsed XML response
   * @returns Structured article metadata
   */
  extractArticleMetadata(
    uid: string,
    xmlResponse: PubMedXMLResponse
  ): PubMedArticleMetadata {
    const articleData = this.extractArticleData(xmlResponse);
    const summary = this.extractAbstract(articleData);
    const pubDate = this.extractPublicationDate(articleData);

    return {
      uid,
      Title:
        typeof articleData.ArticleTitle === "string"
          ? articleData.ArticleTitle
          : (JSON.stringify(articleData.ArticleTitle) ?? ""),
      Published: pubDate,
      "Copyright Information": articleData.Abstract?.CopyrightInformation ?? "",
      Summary: summary,
    };
  }

  /**
   * Convert article metadata to a LangChain Document.
   *
   * @param metadata - The article metadata
   * @returns A Document instance
   */
  toDocument(metadata: PubMedArticleMetadata): Document {
    const { Summary, ...metadataFields } = metadata;
    return new Document({
      pageContent: Summary,
      metadata: metadataFields,
    });
  }

  /**
   * Extract article data from the XML response.
   */
  private extractArticleData(
    xmlResponse: PubMedXMLResponse
  ): PubMedArticleData {
    try {
      return (
        xmlResponse.PubmedArticleSet.PubmedArticle?.MedlineCitation?.Article ??
        xmlResponse.PubmedArticleSet.PubmedBookArticle?.BookDocument ??
        {}
      );
    } catch {
      return {};
    }
  }

  /**
   * Extract and format the abstract text from article data.
   */
  private extractAbstract(articleData: PubMedArticleData): string {
    const abstractText = articleData.Abstract?.AbstractText;

    if (!abstractText) {
      return "No abstract available";
    }

    if (Array.isArray(abstractText)) {
      return this.formatAbstractArray(abstractText);
    }

    if (typeof abstractText === "string") {
      return abstractText;
    }

    if (typeof abstractText === "object") {
      return this.formatAbstractObject(abstractText);
    }

    return "No abstract available";
  }

  /**
   * Format an array of abstract sections with labels.
   */
  private formatAbstractArray(abstractArray: unknown[]): string {
    const summaries: string[] = [];

    for (const txt of abstractArray) {
      if (
        typeof txt === "object" &&
        txt !== null &&
        "#text" in txt &&
        "@Label" in txt
      ) {
        const section = txt as AbstractText;
        summaries.push(`${section["@Label"]}: ${section["#text"]}`);
      }
    }

    return summaries.length > 0
      ? summaries.join("\n")
      : "No abstract available";
  }

  /**
   * Format an abstract object by joining its string values.
   */
  private formatAbstractObject(abstractObj: object): string {
    const values = Object.values(abstractObj).filter(
      (v) => typeof v === "string"
    );
    return values.length > 0 ? values.join("\n") : "No abstract available";
  }

  /**
   * Extract and format the publication date.
   * Returns date in ISO 8601 format (YYYY-MM-DD) with leading zeros.
   */
  private extractPublicationDate(articleData: PubMedArticleData): string {
    const articleDate = articleData.ArticleDate ?? {};
    const parts = [];

    if (articleDate.Year) {
      parts.push(String(articleDate.Year));
    }
    if (articleDate.Month) {
      parts.push(String(articleDate.Month).padStart(2, "0"));
    }
    if (articleDate.Day) {
      parts.push(String(articleDate.Day).padStart(2, "0"));
    }

    return parts.join("-");
  }
}
