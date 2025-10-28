/**
 * Unit tests for PubMedTool
 * Tests Tool interface implementation with mocked API wrapper (no API calls)
 */

import { PubMedTool } from "../src/pubmed-tool.js";
import { PubMedAPIWrapper } from "../src/pubmed-api.js";

// Mock the API wrapper
jest.mock("../src/pubmed-api.js");

describe("PubMedTool", () => {
  let tool: PubMedTool;
  let mockApiWrapper: jest.Mocked<PubMedAPIWrapper>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock API wrapper
    mockApiWrapper = {
      run: jest.fn(),
      load: jest.fn(),
      loadDocs: jest.fn(),
      lazyLoad: jest.fn(),
      lazyLoadDocs: jest.fn(),
    } as any;

    // Mock the constructor
    (
      PubMedAPIWrapper as jest.MockedClass<typeof PubMedAPIWrapper>
    ).mockImplementation(() => mockApiWrapper);

    tool = new PubMedTool({
      topKResults: 3,
      email: "test@example.com",
    });
  });

  describe("Tool Metadata", () => {
    it("should have correct name", () => {
      expect(tool.name).toBe("pubmed");
    });

    it("should have a description", () => {
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe("string");
      expect(tool.description.length).toBeGreaterThan(0);
    });

    it("should mention PubMed in description", () => {
      expect(tool.description).toContain("PubMed");
    });

    it("should mention biomedical in description", () => {
      expect(tool.description.toLowerCase()).toContain("biomedical");
    });

    it("should indicate it's for medical/health queries", () => {
      const lowerDesc = tool.description.toLowerCase();
      expect(
        lowerDesc.includes("medicine") ||
          lowerDesc.includes("health") ||
          lowerDesc.includes("biomedical")
      ).toBe(true);
    });
  });

  describe("Constructor", () => {
    it("should create instance with default options", () => {
      const defaultTool = new PubMedTool();
      expect(defaultTool).toBeInstanceOf(PubMedTool);
    });

    it("should pass options to API wrapper", () => {
      new PubMedTool({
        topKResults: 5,
        maxQueryLength: 200,
        docContentCharsMax: 1000,
        maxRetry: 3,
        sleepTime: 100,
        email: "custom@example.com",
        apiKey: "test-api-key",
      });

      expect(PubMedAPIWrapper).toHaveBeenCalledWith({
        topKResults: 5,
        maxQueryLength: 200,
        docContentCharsMax: 1000,
        maxRetry: 3,
        sleepTime: 100,
        email: "custom@example.com",
        apiKey: "test-api-key",
      });
    });

    it("should create API wrapper instance", () => {
      expect(PubMedAPIWrapper).toHaveBeenCalled();
    });
  });

  describe("_call method", () => {
    it("should call API wrapper run method", async () => {
      const mockResult = "Test search results";
      mockApiWrapper.run.mockResolvedValue(mockResult);

      const result = await tool._call("covid-19");

      expect(mockApiWrapper.run).toHaveBeenCalledWith("covid-19");
      expect(result).toBe(mockResult);
    });

    it("should return formatted string", async () => {
      const mockResult =
        "Published: 2024-10-15\nTitle: Test Article\nSummary: Test summary";
      mockApiWrapper.run.mockResolvedValue(mockResult);

      const result = await tool._call("diabetes");

      expect(typeof result).toBe("string");
      expect(result).toBe(mockResult);
    });

    it("should handle empty query", async () => {
      mockApiWrapper.run.mockResolvedValue("No good PubMed Result was found");

      const result = await tool._call("");

      expect(mockApiWrapper.run).toHaveBeenCalledWith("");
      expect(result).toBeDefined();
    });

    it("should handle special characters in query", async () => {
      const specialQuery = "COVID-19 & diabetes (type 2)";
      mockApiWrapper.run.mockResolvedValue("Test results");

      await tool._call(specialQuery);

      expect(mockApiWrapper.run).toHaveBeenCalledWith(specialQuery);
    });

    it("should propagate errors from API wrapper", async () => {
      mockApiWrapper.run.mockRejectedValue(new Error("API error"));

      await expect(tool._call("test")).rejects.toThrow("API error");
    });

    it("should handle API wrapper returning error message", async () => {
      mockApiWrapper.run.mockResolvedValue(
        "PubMed exception: Rate limit exceeded"
      );

      const result = await tool._call("test");

      expect(result).toContain("PubMed exception");
    });
  });

  describe("invoke method", () => {
    it("should work with invoke method", async () => {
      const mockResult = "Invoke test results";
      mockApiWrapper.run.mockResolvedValue(mockResult);

      const result = await tool.invoke("alzheimer");

      expect(mockApiWrapper.run).toHaveBeenCalledWith("alzheimer");
      expect(result).toBe(mockResult);
    });

    it("should return same result as _call", async () => {
      const mockResult = "Test results";
      mockApiWrapper.run.mockResolvedValue(mockResult);

      const callResult = await tool._call("test query");

      mockApiWrapper.run.mockResolvedValue(mockResult);
      const invokeResult = await tool.invoke("test query");

      expect(callResult).toBe(invokeResult);
    });
  });

  describe("Static methods", () => {
    it("should have lc_name method", () => {
      expect(PubMedTool.lc_name).toBeDefined();
      expect(typeof PubMedTool.lc_name).toBe("function");
    });

    it("should return correct lc_name", () => {
      expect(PubMedTool.lc_name()).toBe("PubMedTool");
    });
  });

  describe("Integration with different queries", () => {
    it("should handle medical terminology", async () => {
      mockApiWrapper.run.mockResolvedValue("Medical results");

      await tool._call("myocardial infarction");
      await tool._call("hypertension treatment");
      await tool._call("oncology research");

      expect(mockApiWrapper.run).toHaveBeenCalledTimes(3);
    });

    it("should handle long queries", async () => {
      const longQuery =
        "effectiveness of combined therapy with metformin and lifestyle modifications in type 2 diabetes mellitus patients";
      mockApiWrapper.run.mockResolvedValue("Results");

      await tool._call(longQuery);

      expect(mockApiWrapper.run).toHaveBeenCalledWith(longQuery);
    });

    it("should handle queries with boolean operators", async () => {
      mockApiWrapper.run.mockResolvedValue("Boolean search results");

      await tool._call("cancer AND treatment NOT surgery");

      expect(mockApiWrapper.run).toHaveBeenCalledWith(
        "cancer AND treatment NOT surgery"
      );
    });
  });

  describe("Error scenarios", () => {
    it("should handle network errors gracefully", async () => {
      mockApiWrapper.run.mockResolvedValue("PubMed exception: Network error");

      const result = await tool._call("test");

      expect(result).toContain("PubMed exception");
    });

    it("should handle rate limit errors", async () => {
      mockApiWrapper.run.mockResolvedValue(
        "PubMed exception: Rate limit exceeded"
      );

      const result = await tool._call("test");

      expect(result).toContain("Rate limit exceeded");
    });

    it("should handle no results found", async () => {
      mockApiWrapper.run.mockResolvedValue("No good PubMed Result was found");

      const result = await tool._call("xyznonexistentquery123");

      expect(result).toBe("No good PubMed Result was found");
    });
  });

  describe("Tool behavior", () => {
    it("should be callable multiple times", async () => {
      mockApiWrapper.run.mockResolvedValue("Results");

      await tool._call("query1");
      await tool._call("query2");
      await tool._call("query3");

      expect(mockApiWrapper.run).toHaveBeenCalledTimes(3);
    });

    it("should maintain state between calls", async () => {
      mockApiWrapper.run
        .mockResolvedValueOnce("Result 1")
        .mockResolvedValueOnce("Result 2");

      const result1 = await tool._call("query1");
      const result2 = await tool._call("query2");

      expect(result1).toBe("Result 1");
      expect(result2).toBe("Result 2");
    });

    it("should handle concurrent calls", async () => {
      mockApiWrapper.run.mockImplementation((query) =>
        Promise.resolve(`Results for ${query}`)
      );

      const results = await Promise.all([
        tool._call("query1"),
        tool._call("query2"),
        tool._call("query3"),
      ]);

      expect(results).toHaveLength(3);
      expect(mockApiWrapper.run).toHaveBeenCalledTimes(3);
    });
  });
});
