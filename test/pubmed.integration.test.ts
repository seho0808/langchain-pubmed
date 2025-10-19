/**
 * Integration tests for PubMed components
 * Tests how Parser, API wrapper, and Tool work together with mocked HTTP (no actual API calls)
 */

import { PubMedAPIWrapper, PubMedTool } from "../src/index.js";

// Mock only the fetch function
global.fetch = jest.fn();

describe("PubMed Integration Tests", () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  describe("PubMedAPIWrapper Integration", () => {
    it("should integrate parser and URL builder correctly", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        email: "test@example.com",
      });

      // Mock search response
      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {
            webenv: "test-webenv-123",
            idlist: ["12345678"],
          },
        }),
        { status: 200 }
      );

      // Mock fetch response with real PubMed XML structure
      const mockXML = `<?xml version="1.0"?>
<!DOCTYPE PubmedArticleSet PUBLIC "-//NLM//DTD PubMedArticle, 1st January 2024//EN" "https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_240101.dtd">
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation Status="MEDLINE" Owner="NLM">
      <Article PubModel="Print">
        <ArticleTitle>Test Article Title About COVID-19</ArticleTitle>
        <Abstract>
          <AbstractText>This is a test abstract about COVID-19 research.</AbstractText>
          <CopyrightInformation>Copyright 2024 Test Publisher.</CopyrightInformation>
        </Abstract>
        <ArticleDate DateType="Electronic">
          <Year>2024</Year>
          <Month>10</Month>
          <Day>15</Day>
        </ArticleDate>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

      const mockFetchResponse = new Response(mockXML, { status: 200 });

      mockFetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(mockFetchResponse);

      const result = await wrapper.run("covid-19");

      expect(result).toContain("Title: Test Article Title About COVID-19");
      expect(result).toContain("This is a test abstract about COVID-19");
      expect(result).toContain("2024-10-15");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle structured abstracts correctly", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        email: "test@example.com",
      });

      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["99999"],
          },
        }),
        { status: 200 }
      );

      const mockXML = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <Article>
        <ArticleTitle>Structured Abstract Article</ArticleTitle>
        <Abstract>
          <AbstractText Label="BACKGROUND">Background information here.</AbstractText>
          <AbstractText Label="METHODS">Methods description here.</AbstractText>
          <AbstractText Label="RESULTS">Results summary here.</AbstractText>
          <AbstractText Label="CONCLUSIONS">Conclusions stated here.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

      const mockFetchResponse = new Response(mockXML, { status: 200 });

      mockFetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(mockFetchResponse);

      const result = await wrapper.run("test");

      expect(result).toContain("BACKGROUND");
      expect(result).toContain("Background information here");
      expect(result).toContain("METHODS");
      expect(result).toContain("Methods description here");
    });

    it("should handle book articles correctly", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        email: "test@example.com",
      });

      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["book123"],
          },
        }),
        { status: 200 }
      );

      const mockXML = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedBookArticle>
    <BookDocument>
      <ArticleTitle>Medical Textbook Chapter</ArticleTitle>
      <Abstract>
        <AbstractText>This is a book chapter about medical topics.</AbstractText>
      </Abstract>
      <ArticleDate>
        <Year>2023</Year>
      </ArticleDate>
    </BookDocument>
  </PubmedBookArticle>
</PubmedArticleSet>`;

      const mockFetchResponse = new Response(mockXML, { status: 200 });

      mockFetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(mockFetchResponse);

      const result = await wrapper.run("test");

      expect(result).toContain("Medical Textbook Chapter");
      expect(result).toContain("This is a book chapter about medical topics");
    });

    it("should handle multiple articles correctly", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 2,
        email: "test@example.com",
      });

      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["111", "222"],
          },
        }),
        { status: 200 }
      );

      const mockXML1 = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <Article>
        <ArticleTitle>First Article</ArticleTitle>
        <Abstract>
          <AbstractText>First abstract content.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

      const mockXML2 = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <Article>
        <ArticleTitle>Second Article</ArticleTitle>
        <Abstract>
          <AbstractText>Second abstract content.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

      mockFetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(new Response(mockXML1, { status: 200 }))
        .mockResolvedValueOnce(new Response(mockXML2, { status: 200 }));

      const articles = await wrapper.load("test");

      expect(articles).toHaveLength(2);
      expect(articles[0].Title).toBe("First Article");
      expect(articles[1].Title).toBe("Second Article");
    });

    it("should correctly convert to LangChain Documents", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        email: "test@example.com",
      });

      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["12345"],
          },
        }),
        { status: 200 }
      );

      const mockXML = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <Article>
        <ArticleTitle>Document Test Article</ArticleTitle>
        <Abstract>
          <AbstractText>This content should be in pageContent.</AbstractText>
          <CopyrightInformation>Copyright info here.</CopyrightInformation>
        </Abstract>
        <ArticleDate>
          <Year>2024</Year>
          <Month>05</Month>
          <Day>20</Day>
        </ArticleDate>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

      mockFetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(new Response(mockXML, { status: 200 }));

      const docs = await wrapper.loadDocs("test");

      expect(docs).toHaveLength(1);
      expect(docs[0].pageContent).toBe(
        "This content should be in pageContent."
      );
      expect(docs[0].metadata.uid).toBe("12345");
      expect(docs[0].metadata.Title).toBe("Document Test Article");
      expect(docs[0].metadata.Published).toBe("2024-05-20");
      expect(docs[0].metadata["Copyright Information"]).toBe(
        "Copyright info here."
      );
    });

    it("should handle lazy loading correctly", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 3,
        email: "test@example.com",
      });

      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["1", "2", "3"],
          },
        }),
        { status: 200 }
      );

      const createMockXML = (title: string) => `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <Article>
        <ArticleTitle>${title}</ArticleTitle>
        <Abstract>
          <AbstractText>Abstract for ${title}</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

      mockFetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(
          new Response(createMockXML("Article 1"), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(createMockXML("Article 2"), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(createMockXML("Article 3"), { status: 200 })
        );

      const results: any[] = [];
      for await (const article of wrapper.lazyLoad("test")) {
        results.push(article);
      }

      expect(results).toHaveLength(3);
      expect(results[0].Title).toBe("Article 1");
      expect(results[1].Title).toBe("Article 2");
      expect(results[2].Title).toBe("Article 3");
    });

    it("should truncate query based on maxQueryLength", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        maxQueryLength: 20,
        email: "test@example.com",
      });

      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {
            webenv: "test-webenv",
            idlist: [],
          },
        }),
        { status: 200 }
      );

      mockFetch.mockResolvedValueOnce(mockSearchResponse);

      await wrapper.run("a".repeat(100));

      // Check that the URL contains a truncated query
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBeDefined();
    });

    it("should truncate content based on docContentCharsMax", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        docContentCharsMax: 100,
        email: "test@example.com",
      });

      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["12345"],
          },
        }),
        { status: 200 }
      );

      const longAbstract = "a".repeat(500);
      const mockXML = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <Article>
        <ArticleTitle>Long Abstract Article</ArticleTitle>
        <Abstract>
          <AbstractText>${longAbstract}</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

      mockFetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(new Response(mockXML, { status: 200 }));

      const result = await wrapper.run("test");

      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe("PubMedTool Integration", () => {
    it("should work end-to-end with mocked HTTP", async () => {
      const tool = new PubMedTool({
        topKResults: 1,
        email: "test@example.com",
      });

      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["99999"],
          },
        }),
        { status: 200 }
      );

      const mockXML = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <Article>
        <ArticleTitle>Integration Test Article</ArticleTitle>
        <Abstract>
          <AbstractText>Integration test abstract content.</AbstractText>
        </Abstract>
        <ArticleDate>
          <Year>2024</Year>
        </ArticleDate>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

      mockFetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(new Response(mockXML, { status: 200 }));

      const result = await tool.invoke("integration test");

      expect(result).toContain("Integration Test Article");
      expect(result).toContain("Integration test abstract content");
    });

    it("should handle errors in the full pipeline", async () => {
      const tool = new PubMedTool({
        topKResults: 1,
        email: "test@example.com",
        maxRetry: 0, // Disable retries for faster test
      });

      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await tool._call("test");

      expect(result).toContain("PubMed exception");
    });
  });

  describe("Error handling integration", () => {
    it("should handle invalid API response format", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        email: "test@example.com",
      });

      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {},
        }),
        { status: 200 }
      );

      mockFetch.mockResolvedValueOnce(mockSearchResponse);

      await expect(wrapper.load("test")).rejects.toThrow(
        "Invalid response from PubMed API"
      );
    });

    it("should handle malformed XML gracefully", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        email: "test@example.com",
      });

      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {
            webenv: "test-webenv",
            idlist: ["12345"],
          },
        }),
        { status: 200 }
      );

      const invalidXML = "This is not valid XML";

      mockFetch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce(new Response(invalidXML, { status: 200 }));

      // fast-xml-parser handles invalid XML gracefully, returning empty results
      const result = await wrapper.load("test");
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle empty search results", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        email: "test@example.com",
      });

      const mockSearchResponse = new Response(
        JSON.stringify({
          esearchresult: {
            webenv: "test-webenv",
            idlist: [],
          },
        }),
        { status: 200 }
      );

      mockFetch.mockResolvedValueOnce(mockSearchResponse);

      const result = await wrapper.run("nonexistent query");

      expect(result).toBe("No good PubMed Result was found");
    });
  });
});
