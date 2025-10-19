/**
 * Unit tests for PubMedParser
 * Tests XML parsing and data extraction logic with mock data (no API calls)
 */

import { PubMedParser } from "../src/pubmed-parser.js";
import { PubMedXMLResponse } from "../src/types.js";

describe("PubMedParser", () => {
  let parser: PubMedParser;

  beforeEach(() => {
    parser = new PubMedParser();
  });

  describe("parseXML", () => {
    it("should parse valid XML into structured object", () => {
      const xmlText = `
        <?xml version="1.0"?>
        <PubmedArticleSet>
          <PubmedArticle>
            <MedlineCitation>
              <Article>
                <ArticleTitle>Test Article</ArticleTitle>
              </Article>
            </MedlineCitation>
          </PubmedArticle>
        </PubmedArticleSet>
      `;

      const result = parser.parseXML(xmlText);

      expect(result).toHaveProperty("PubmedArticleSet");
      expect(result.PubmedArticleSet).toHaveProperty("PubmedArticle");
    });

    it("should handle XML with attributes", () => {
      const xmlText = `
        <?xml version="1.0"?>
        <PubmedArticleSet>
          <PubmedArticle Status="MEDLINE">
            <MedlineCitation Owner="NLM">
              <Article PubModel="Print">
                <ArticleTitle>Test</ArticleTitle>
              </Article>
            </MedlineCitation>
          </PubmedArticle>
        </PubmedArticleSet>
      `;

      const result = parser.parseXML(xmlText);

      expect(result).toBeDefined();
      expect(result.PubmedArticleSet).toBeDefined();
    });
  });

  describe("extractArticleMetadata", () => {
    it("should extract basic article metadata", () => {
      const xmlResponse: PubMedXMLResponse = {
        PubmedArticleSet: {
          PubmedArticle: {
            MedlineCitation: {
              Article: {
                ArticleTitle: "Test Article Title",
                ArticleDate: {
                  Year: "2024",
                  Month: "10",
                  Day: "15",
                },
                Abstract: {
                  AbstractText: "This is a test abstract.",
                  CopyrightInformation: "Copyright 2024",
                },
              },
            },
          },
        },
      };

      const result = parser.extractArticleMetadata("12345", xmlResponse);

      expect(result.uid).toBe("12345");
      expect(result.Title).toBe("Test Article Title");
      expect(result.Published).toBe("2024-10-15");
      expect(result["Copyright Information"]).toBe("Copyright 2024");
      expect(result.Summary).toBe("This is a test abstract.");
    });

    it("should handle missing abstract", () => {
      const xmlResponse: PubMedXMLResponse = {
        PubmedArticleSet: {
          PubmedArticle: {
            MedlineCitation: {
              Article: {
                ArticleTitle: "Article Without Abstract",
                ArticleDate: {
                  Year: "2024",
                },
              },
            },
          },
        },
      };

      const result = parser.extractArticleMetadata("12345", xmlResponse);

      expect(result.Summary).toBe("No abstract available");
      expect(result["Copyright Information"]).toBe("");
    });

    it("should handle structured abstract with labels", () => {
      const xmlResponse: PubMedXMLResponse = {
        PubmedArticleSet: {
          PubmedArticle: {
            MedlineCitation: {
              Article: {
                ArticleTitle: "Structured Abstract Article",
                Abstract: {
                  AbstractText: [
                    { "@Label": "BACKGROUND", "#text": "Background text here" },
                    { "@Label": "METHODS", "#text": "Methods text here" },
                    { "@Label": "RESULTS", "#text": "Results text here" },
                  ] as any,
                },
              },
            },
          },
        },
      };

      const result = parser.extractArticleMetadata("12345", xmlResponse);

      expect(result.Summary).toContain("BACKGROUND: Background text here");
      expect(result.Summary).toContain("METHODS: Methods text here");
      expect(result.Summary).toContain("RESULTS: Results text here");
    });

    it("should handle abstract as object with multiple fields", () => {
      const xmlResponse: PubMedXMLResponse = {
        PubmedArticleSet: {
          PubmedArticle: {
            MedlineCitation: {
              Article: {
                ArticleTitle: "Test Article",
                Abstract: {
                  AbstractText: {
                    intro: "Introduction text",
                    conclusion: "Conclusion text",
                    someNumber: 123,
                  },
                },
              },
            },
          },
        },
      };

      const result = parser.extractArticleMetadata("12345", xmlResponse);

      expect(result.Summary).toContain("Introduction text");
      expect(result.Summary).toContain("Conclusion text");
      expect(result.Summary).not.toContain("123");
    });

    it("should handle PubmedBookArticle format", () => {
      const xmlResponse: PubMedXMLResponse = {
        PubmedArticleSet: {
          PubmedBookArticle: {
            BookDocument: {
              ArticleTitle: "Book Chapter Title",
              ArticleDate: {
                Year: "2023",
              },
              Abstract: {
                AbstractText: "Book chapter abstract",
              },
            },
          },
        },
      };

      const result = parser.extractArticleMetadata("67890", xmlResponse);

      expect(result.uid).toBe("67890");
      expect(result.Title).toBe("Book Chapter Title");
      expect(result.Published).toBe("2023");
      expect(result.Summary).toBe("Book chapter abstract");
    });

    it("should handle missing date fields gracefully", () => {
      const xmlResponse: PubMedXMLResponse = {
        PubmedArticleSet: {
          PubmedArticle: {
            MedlineCitation: {
              Article: {
                ArticleTitle: "No Date Article",
                ArticleDate: {},
              },
            },
          },
        },
      };

      const result = parser.extractArticleMetadata("12345", xmlResponse);

      expect(result.Published).toBe("");
    });

    it("should handle partial date information", () => {
      const xmlResponse: PubMedXMLResponse = {
        PubmedArticleSet: {
          PubmedArticle: {
            MedlineCitation: {
              Article: {
                ArticleTitle: "Partial Date Article",
                ArticleDate: {
                  Year: "2024",
                  Month: "10",
                },
              },
            },
          },
        },
      };

      const result = parser.extractArticleMetadata("12345", xmlResponse);

      expect(result.Published).toBe("2024-10");
    });

    it("should handle empty article data", () => {
      const xmlResponse: PubMedXMLResponse = {
        PubmedArticleSet: {},
      };

      const result = parser.extractArticleMetadata("12345", xmlResponse);

      expect(result.uid).toBe("12345");
      expect(result.Title).toBe("");
      expect(result.Published).toBe("");
      expect(result.Summary).toBe("No abstract available");
    });
  });

  describe("toDocument", () => {
    it("should convert article metadata to Document", () => {
      const metadata = {
        uid: "12345",
        Title: "Test Article",
        Published: "2024-10-15",
        "Copyright Information": "Copyright 2024",
        Summary: "This is the abstract content.",
      };

      const doc = parser.toDocument(metadata);

      expect(doc.pageContent).toBe("This is the abstract content.");
      expect(doc.metadata.uid).toBe("12345");
      expect(doc.metadata.Title).toBe("Test Article");
      expect(doc.metadata.Published).toBe("2024-10-15");
      expect(doc.metadata["Copyright Information"]).toBe("Copyright 2024");
      expect(doc.metadata).not.toHaveProperty("Summary");
    });

    it("should handle empty summary", () => {
      const metadata = {
        uid: "12345",
        Title: "Test Article",
        Published: "2024-10-15",
        "Copyright Information": "",
        Summary: "",
      };

      const doc = parser.toDocument(metadata);

      expect(doc.pageContent).toBe("");
      expect(doc.metadata.uid).toBe("12345");
    });
  });

  describe("Edge cases", () => {
    it("should parse XML without throwing on simple text", () => {
      const xmlText = "Not valid XML at all";

      // fast-xml-parser doesn't throw on invalid XML, it just returns what it can parse
      const result = parser.parseXML(xmlText);
      expect(result).toBeDefined();
    });

    it("should handle empty structured abstract array", () => {
      const xmlResponse: PubMedXMLResponse = {
        PubmedArticleSet: {
          PubmedArticle: {
            MedlineCitation: {
              Article: {
                ArticleTitle: "Test",
                Abstract: {
                  AbstractText: [] as any,
                },
              },
            },
          },
        },
      };

      const result = parser.extractArticleMetadata("12345", xmlResponse);

      expect(result.Summary).toBe("No abstract available");
    });

    it("should handle structured abstract with missing text fields", () => {
      const xmlResponse: PubMedXMLResponse = {
        PubmedArticleSet: {
          PubmedArticle: {
            MedlineCitation: {
              Article: {
                ArticleTitle: "Test",
                Abstract: {
                  AbstractText: [
                    { "@Label": "BACKGROUND" },
                    { "#text": "Text without label" },
                  ] as any,
                },
              },
            },
          },
        },
      };

      const result = parser.extractArticleMetadata("12345", xmlResponse);

      // Should handle gracefully without crashing
      expect(result.Summary).toBeDefined();
    });

    it("should handle object abstract with no string values", () => {
      const xmlResponse: PubMedXMLResponse = {
        PubmedArticleSet: {
          PubmedArticle: {
            MedlineCitation: {
              Article: {
                ArticleTitle: "Test",
                Abstract: {
                  AbstractText: {
                    number: 123,
                    boolean: true,
                    nested: { obj: "value" },
                  },
                },
              },
            },
          },
        },
      };

      const result = parser.extractArticleMetadata("12345", xmlResponse);

      expect(result.Summary).toBe("No abstract available");
    });
  });
});
