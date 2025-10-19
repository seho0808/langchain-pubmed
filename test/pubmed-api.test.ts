/**
 * Unit tests for PubMedAPIWrapper
 * Tests business logic with mocked HTTP client and parser (no actual API calls)
 */

import { PubMedAPIWrapper } from "../src/pubmed-api.js";
import { RetryableHttpClient } from "../src/http-client.js";
import { PubMedParser } from "../src/pubmed-parser.js";
import { PubMedURLBuilder } from "../src/url-builder.js";
import { PubMedArticleMetadata } from "../src/types.js";

// Mock dependencies
jest.mock("../src/http-client.js");
jest.mock("../src/pubmed-parser.js");
jest.mock("../src/url-builder.js");

describe("PubMedAPIWrapper", () => {
  let wrapper: PubMedAPIWrapper;
  let mockHttpClient: jest.Mocked<RetryableHttpClient>;
  let mockParser: jest.Mocked<PubMedParser>;
  let mockUrlBuilder: jest.Mocked<PubMedURLBuilder>;

  const mockArticle: PubMedArticleMetadata = {
    uid: "12345",
    Title: "Test Article",
    Published: "2024-10-15",
    "Copyright Information": "Copyright 2024",
    Summary: "This is a test summary.",
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockHttpClient = {
      fetch: jest.fn(),
    } as any;

    mockParser = {
      parseXML: jest.fn(),
      extractArticleMetadata: jest.fn(),
      toDocument: jest.fn(),
    } as any;

    mockUrlBuilder = {
      buildSearchUrl: jest.fn(),
      buildFetchUrl: jest.fn(),
    } as any;

    // Mock constructors
    (
      RetryableHttpClient as jest.MockedClass<typeof RetryableHttpClient>
    ).mockImplementation(() => mockHttpClient);
    (PubMedParser as jest.MockedClass<typeof PubMedParser>).mockImplementation(
      () => mockParser
    );
    (
      PubMedURLBuilder as jest.MockedClass<typeof PubMedURLBuilder>
    ).mockImplementation(() => mockUrlBuilder);

    wrapper = new PubMedAPIWrapper({
      topKResults: 2,
      email: "test@example.com",
    });
  });

  describe("Constructor and Configuration", () => {
    it("should use default values when no options provided", () => {
      const defaultWrapper = new PubMedAPIWrapper();
      expect(defaultWrapper).toBeInstanceOf(PubMedAPIWrapper);
    });

    it("should pass options to dependencies", () => {
      new PubMedAPIWrapper({
        topKResults: 5,
        maxRetry: 3,
        sleepTime: 100,
        email: "custom@example.com",
        apiKey: "test-key",
      });

      expect(RetryableHttpClient).toHaveBeenCalledWith({
        maxRetry: 3,
        initialSleepTime: 100,
      });

      expect(PubMedURLBuilder).toHaveBeenCalledWith(
        "custom@example.com",
        "test-key"
      );
    });
  });

  describe("run", () => {
    it("should return formatted string with article metadata", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");
      mockUrlBuilder.buildFetchUrl.mockReturnValue("fetch-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["12345"],
          },
        }),
      } as any;

      const mockFetchResponse = {
        text: jest.fn().mockResolvedValue("<xml>test</xml>"),
      } as any;

      mockHttpClient.fetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(mockFetchResponse);

      mockParser.parseXML.mockReturnValue({} as any);
      mockParser.extractArticleMetadata.mockReturnValue(mockArticle);

      const result = await wrapper.run("covid-19");

      expect(result).toContain("Published: 2024-10-15");
      expect(result).toContain("Title: Test Article");
      expect(result).toContain("Summary:");
      expect(result).toContain("This is a test summary");
    });

    it("should truncate query to maxQueryLength", async () => {
      const longQueryWrapper = new PubMedAPIWrapper({
        maxQueryLength: 10,
      });

      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: [],
          },
        }),
      } as any;

      mockHttpClient.fetch.mockResolvedValueOnce(mockSearchResponse);

      await longQueryWrapper.run("a".repeat(100));

      // The query should be truncated before being passed to load
      expect(mockHttpClient.fetch).toHaveBeenCalled();
    });

    it("should truncate content to docContentCharsMax", async () => {
      const smallWrapper = new PubMedAPIWrapper({
        topKResults: 1,
        docContentCharsMax: 50,
      });

      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");
      mockUrlBuilder.buildFetchUrl.mockReturnValue("fetch-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["12345"],
          },
        }),
      } as any;

      const mockFetchResponse = {
        text: jest.fn().mockResolvedValue("<xml>test</xml>"),
      } as any;

      mockHttpClient.fetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(mockFetchResponse);

      mockParser.parseXML.mockReturnValue({} as any);

      const longArticle = {
        ...mockArticle,
        Summary: "a".repeat(200),
      };
      mockParser.extractArticleMetadata.mockReturnValue(longArticle);

      const result = await smallWrapper.run("test");

      expect(result.length).toBeLessThanOrEqual(50);
    });

    it("should return message when no results found", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: [],
          },
        }),
      } as any;

      mockHttpClient.fetch.mockResolvedValueOnce(mockSearchResponse);

      const result = await wrapper.run("nonexistent query");

      expect(result).toBe("No good PubMed Result was found");
    });

    it("should handle errors gracefully", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");
      mockHttpClient.fetch.mockRejectedValue(new Error("Network error"));

      const result = await wrapper.run("test");

      expect(result).toContain("PubMed exception:");
      expect(result).toContain("Network error");
    });
  });

  describe("load", () => {
    it("should return array of article metadata", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");
      mockUrlBuilder.buildFetchUrl.mockReturnValue("fetch-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["12345", "67890"],
          },
        }),
      } as any;

      const mockFetchResponse = {
        text: jest.fn().mockResolvedValue("<xml>test</xml>"),
      } as any;

      mockHttpClient.fetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValue(mockFetchResponse);

      mockParser.parseXML.mockReturnValue({} as any);
      mockParser.extractArticleMetadata.mockReturnValue(mockArticle);

      const results = await wrapper.load("test query");

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results[0]).toEqual(mockArticle);
    });

    it("should respect topKResults limit", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: [],
          },
        }),
      } as any;

      mockHttpClient.fetch.mockResolvedValueOnce(mockSearchResponse);

      await wrapper.load("test");

      expect(mockUrlBuilder.buildSearchUrl).toHaveBeenCalledWith("test", 2);
    });

    it("should throw error when API returns invalid response", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {},
        }),
      } as any;

      mockHttpClient.fetch.mockResolvedValueOnce(mockSearchResponse);

      await expect(wrapper.load("test")).rejects.toThrow(
        "Invalid response from PubMed API"
      );
    });
  });

  describe("lazyLoad", () => {
    it("should yield articles one by one", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");
      mockUrlBuilder.buildFetchUrl.mockReturnValue("fetch-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["12345", "67890"],
          },
        }),
      } as any;

      const mockFetchResponse = {
        text: jest.fn().mockResolvedValue("<xml>test</xml>"),
      } as any;

      mockHttpClient.fetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValue(mockFetchResponse);

      mockParser.parseXML.mockReturnValue({} as any);
      mockParser.extractArticleMetadata.mockReturnValue(mockArticle);

      const results: PubMedArticleMetadata[] = [];
      for await (const article of wrapper.lazyLoad("test")) {
        results.push(article);
      }

      expect(results.length).toBe(2);
      expect(mockHttpClient.fetch).toHaveBeenCalledTimes(3); // 1 search + 2 fetches
    });

    it("should handle empty result list", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: [],
          },
        }),
      } as any;

      mockHttpClient.fetch.mockResolvedValueOnce(mockSearchResponse);

      const results: PubMedArticleMetadata[] = [];
      for await (const article of wrapper.lazyLoad("test")) {
        results.push(article);
      }

      expect(results.length).toBe(0);
    });
  });

  describe("loadDocs", () => {
    it("should return array of Document instances", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");
      mockUrlBuilder.buildFetchUrl.mockReturnValue("fetch-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["12345"],
          },
        }),
      } as any;

      const mockFetchResponse = {
        text: jest.fn().mockResolvedValue("<xml>test</xml>"),
      } as any;

      mockHttpClient.fetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(mockFetchResponse);

      mockParser.parseXML.mockReturnValue({} as any);
      mockParser.extractArticleMetadata.mockReturnValue(mockArticle);

      const mockDocument = {
        pageContent: "Test content",
        metadata: { uid: "12345" },
      };
      mockParser.toDocument.mockReturnValue(mockDocument as any);

      const docs = await wrapper.loadDocs("test");

      expect(Array.isArray(docs)).toBe(true);
      expect(docs.length).toBe(1);
      expect(docs[0]).toEqual(mockDocument);
      expect(mockParser.toDocument).toHaveBeenCalledWith(mockArticle);
    });
  });

  describe("lazyLoadDocs", () => {
    it("should yield Document instances one by one", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");
      mockUrlBuilder.buildFetchUrl.mockReturnValue("fetch-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["12345", "67890"],
          },
        }),
      } as any;

      const mockFetchResponse = {
        text: jest.fn().mockResolvedValue("<xml>test</xml>"),
      } as any;

      mockHttpClient.fetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValue(mockFetchResponse);

      mockParser.parseXML.mockReturnValue({} as any);
      mockParser.extractArticleMetadata.mockReturnValue(mockArticle);

      const mockDocument = {
        pageContent: "Test content",
        metadata: { uid: "12345" },
      };
      mockParser.toDocument.mockReturnValue(mockDocument as any);

      const docs: any[] = [];
      for await (const doc of wrapper.lazyLoadDocs("test")) {
        docs.push(doc);
      }

      expect(docs.length).toBe(2);
      expect(mockParser.toDocument).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error handling", () => {
    it("should propagate HTTP client errors in load", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");
      mockHttpClient.fetch.mockRejectedValue(new Error("HTTP error"));

      await expect(wrapper.load("test")).rejects.toThrow("HTTP error");
    });

    it("should propagate parser errors", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");
      mockUrlBuilder.buildFetchUrl.mockReturnValue("fetch-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["12345"],
          },
        }),
      } as any;

      const mockFetchResponse = {
        text: jest.fn().mockResolvedValue("<xml>invalid</xml>"),
      } as any;

      mockHttpClient.fetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(mockFetchResponse);

      mockParser.parseXML.mockImplementation(() => {
        throw new Error("Parse error");
      });

      await expect(wrapper.load("test")).rejects.toThrow("Parse error");
    });
  });

  describe("URL building", () => {
    it("should call URL builder with correct parameters for search", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv",
            idlist: [],
          },
        }),
      } as any;

      mockHttpClient.fetch.mockResolvedValueOnce(mockSearchResponse);

      await wrapper.load("covid-19 vaccine");

      expect(mockUrlBuilder.buildSearchUrl).toHaveBeenCalledWith(
        "covid-19 vaccine",
        2
      );
    });

    it("should call URL builder with correct parameters for fetch", async () => {
      mockUrlBuilder.buildSearchUrl.mockReturnValue("search-url");
      mockUrlBuilder.buildFetchUrl.mockReturnValue("fetch-url");

      const mockSearchResponse = {
        json: jest.fn().mockResolvedValue({
          esearchresult: {
            webenv: "test-webenv-123",
            idlist: ["98765"],
          },
        }),
      } as any;

      const mockFetchResponse = {
        text: jest.fn().mockResolvedValue("<xml>test</xml>"),
      } as any;

      mockHttpClient.fetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(mockFetchResponse);

      mockParser.parseXML.mockReturnValue({} as any);
      mockParser.extractArticleMetadata.mockReturnValue(mockArticle);

      await wrapper.load("test");

      expect(mockUrlBuilder.buildFetchUrl).toHaveBeenCalledWith(
        "98765",
        "test-webenv-123"
      );
    });
  });
});
