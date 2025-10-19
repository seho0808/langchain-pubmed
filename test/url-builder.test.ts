import { PubMedURLBuilder } from "../src/url-builder";

describe("PubMedURLBuilder", () => {
  describe("buildSearchUrl", () => {
    it("should build a basic search URL with query and maxResults", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");
      const url = builder.buildSearchUrl("cancer", 10);

      expect(url).toContain(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?"
      );
      expect(url).toContain("db=pubmed");
      expect(url).toContain("term=cancer");
      expect(url).toContain("retmode=json");
      expect(url).toContain("retmax=10");
      expect(url).toContain("usehistory=y");
    });

    it("should include email parameter", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");
      const url = builder.buildSearchUrl("cancer", 10);

      expect(url).toContain("email=test%40example.com");
    });

    it("should include API key when provided", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");
      const url = builder.buildSearchUrl("cancer", 10);

      expect(url).toContain("api_key=test-api-key");
    });

    it("should not include API key when empty string", () => {
      const builder = new PubMedURLBuilder("test@example.com", "");
      const url = builder.buildSearchUrl("cancer", 10);

      expect(url).not.toContain("api_key");
    });

    it("should properly encode special characters in query", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");
      const url = builder.buildSearchUrl("breast cancer AND therapy", 10);

      expect(url).toContain("term=breast%20cancer%20AND%20therapy");
    });

    it("should properly encode special characters in email", () => {
      const builder = new PubMedURLBuilder(
        "user+test@example.com",
        "test-api-key"
      );
      const url = builder.buildSearchUrl("cancer", 10);

      expect(url).toContain("email=user%2Btest%40example.com");
    });

    it("should handle complex queries with special characters", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");
      const url = builder.buildSearchUrl(
        "(cancer OR tumor) AND [2020:2024]",
        50
      );

      expect(url).toContain("retmax=50");
      expect(url).toContain(
        encodeURIComponent("(cancer OR tumor) AND [2020:2024]")
      );
    });

    it("should handle different maxResults values", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");

      const url1 = builder.buildSearchUrl("cancer", 1);
      expect(url1).toContain("retmax=1");

      const url100 = builder.buildSearchUrl("cancer", 100);
      expect(url100).toContain("retmax=100");

      const url1000 = builder.buildSearchUrl("cancer", 1000);
      expect(url1000).toContain("retmax=1000");
    });
  });

  describe("buildFetchUrl", () => {
    it("should build a basic fetch URL with uid and webenv", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");
      const url = builder.buildFetchUrl("12345678", "test-webenv");

      expect(url).toContain(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?"
      );
      expect(url).toContain("db=pubmed");
      expect(url).toContain("retmode=xml");
      expect(url).toContain("id=12345678");
      expect(url).toContain("webenv=test-webenv");
    });

    it("should include email parameter", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");
      const url = builder.buildFetchUrl("12345678", "test-webenv");

      expect(url).toContain("email=test%40example.com");
    });

    it("should include API key when provided", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");
      const url = builder.buildFetchUrl("12345678", "test-webenv");

      expect(url).toContain("api_key=test-api-key");
    });

    it("should not include API key when empty string", () => {
      const builder = new PubMedURLBuilder("test@example.com", "");
      const url = builder.buildFetchUrl("12345678", "test-webenv");

      expect(url).not.toContain("api_key");
    });

    it("should properly encode special characters in email", () => {
      const builder = new PubMedURLBuilder(
        "user+test@example.com",
        "test-api-key"
      );
      const url = builder.buildFetchUrl("12345678", "test-webenv");

      expect(url).toContain("email=user%2Btest%40example.com");
    });

    it("should handle multiple UIDs", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");
      const url = builder.buildFetchUrl("12345678,87654321", "test-webenv");

      expect(url).toContain("id=12345678,87654321");
    });

    it("should handle webenv with special characters", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");
      const url = builder.buildFetchUrl("12345678", "MCID_123ABC+XYZ=");

      expect(url).toContain("webenv=MCID_123ABC+XYZ=");
    });
  });

  describe("constructor", () => {
    it("should create instance with email and API key", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-api-key");
      expect(builder).toBeInstanceOf(PubMedURLBuilder);
    });

    it("should create instance with email and empty API key", () => {
      const builder = new PubMedURLBuilder("test@example.com", "");
      expect(builder).toBeInstanceOf(PubMedURLBuilder);
    });
  });

  describe("URL structure", () => {
    it("should generate valid URLs with all parameters in correct format for search", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-key");
      const url = builder.buildSearchUrl("test query", 5);

      // Check it's a valid URL
      expect(() => new URL(url)).not.toThrow();

      const urlObj = new URL(url);
      expect(urlObj.searchParams.get("db")).toBe("pubmed");
      expect(urlObj.searchParams.get("term")).toBe("test query");
      expect(urlObj.searchParams.get("retmode")).toBe("json");
      expect(urlObj.searchParams.get("retmax")).toBe("5");
      expect(urlObj.searchParams.get("usehistory")).toBe("y");
      expect(urlObj.searchParams.get("email")).toBe("test@example.com");
      expect(urlObj.searchParams.get("api_key")).toBe("test-key");
    });

    it("should generate valid URLs with all parameters in correct format for fetch", () => {
      const builder = new PubMedURLBuilder("test@example.com", "test-key");
      const url = builder.buildFetchUrl("12345", "webenv123");

      // Check it's a valid URL
      expect(() => new URL(url)).not.toThrow();

      const urlObj = new URL(url);
      expect(urlObj.searchParams.get("db")).toBe("pubmed");
      expect(urlObj.searchParams.get("retmode")).toBe("xml");
      expect(urlObj.searchParams.get("id")).toBe("12345");
      expect(urlObj.searchParams.get("webenv")).toBe("webenv123");
      expect(urlObj.searchParams.get("email")).toBe("test@example.com");
      expect(urlObj.searchParams.get("api_key")).toBe("test-key");
    });
  });
});
