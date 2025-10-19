/**
 * End-to-end tests for PubMed API integration
 * 
 * These tests make ACTUAL API calls to PubMed.
 * Keep minimal - only essential happy path scenarios.
 * More detailed testing should be done in unit and integration tests.
 */

import { PubMedAPIWrapper, PubMedTool } from "../src/index.js";

describe("PubMed E2E Tests", () => {
  // Increase timeout for real API calls
  jest.setTimeout(30000);

  const testEmail = "test@example.com";

  describe("PubMedAPIWrapper - Core Functionality", () => {
    it("should successfully search and retrieve articles", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 2,
        email: testEmail,
      });

      const results = await wrapper.load("covid-19");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(2);

      const firstResult = results[0];
      expect(firstResult).toHaveProperty("uid");
      expect(firstResult).toHaveProperty("Title");
      expect(firstResult).toHaveProperty("Published");
      expect(firstResult).toHaveProperty("Summary");
      expect(firstResult.uid).toBeTruthy();
      expect(firstResult.Title).toBeTruthy();
    });

    it("should return formatted string with run method", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        email: testEmail,
      });

      const result = await wrapper.run("diabetes");

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("Title:");
      expect(result).toContain("Summary:");
    });

    it("should return LangChain Documents", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        email: testEmail,
      });

      const docs = await wrapper.loadDocs("cancer");

      expect(docs).toBeDefined();
      expect(Array.isArray(docs)).toBe(true);
      expect(docs.length).toBeGreaterThan(0);

      const firstDoc = docs[0];
      expect(firstDoc).toHaveProperty("pageContent");
      expect(firstDoc).toHaveProperty("metadata");
      expect(firstDoc.pageContent).toBeTruthy();
      expect(firstDoc.metadata).toHaveProperty("uid");
      expect(firstDoc.metadata).toHaveProperty("Title");
    });
  });

  describe("PubMedTool - Core Functionality", () => {
    it("should successfully invoke with query", async () => {
      const tool = new PubMedTool({
        topKResults: 1,
        email: testEmail,
      });

      const result = await tool.invoke("alzheimer");

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should have correct tool metadata", () => {
      const tool = new PubMedTool({
        email: testEmail,
      });

      expect(tool.name).toBe("pubmed");
      expect(tool.description).toBeTruthy();
      expect(tool.description).toContain("PubMed");
      expect(tool.description).toContain("biomedical");
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully", async () => {
      const wrapper = new PubMedAPIWrapper({
        topKResults: 1,
        email: testEmail,
      });

      // This should not throw but return a result
      const result = await wrapper.run("valid query");

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });
});
