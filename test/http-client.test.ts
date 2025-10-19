import { RetryableHttpClient } from "../src/http-client.js";

// Mock global fetch
global.fetch = jest.fn();

describe("RetryableHttpClient", () => {
  let client: RetryableHttpClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    client = new RetryableHttpClient({
      maxRetry: 3,
      initialSleepTime: 100,
    });
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("Successful requests", () => {
    it("should return response on successful request", async () => {
      const mockResponse = new Response("OK", { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.fetch("https://example.com");

      expect(result).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should include context in successful requests", async () => {
      const mockResponse = new Response("OK", { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      await client.fetch("https://example.com", "test request");

      expect(mockFetch).toHaveBeenCalledWith("https://example.com");
    });
  });

  describe("Rate limiting (429) handling", () => {
    it("should retry on 429 and eventually succeed", async () => {
      const mockErrorResponse = new Response("Too Many Requests", {
        status: 429,
      });
      const mockSuccessResponse = new Response("OK", { status: 200 });

      mockFetch
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await client.fetch("https://example.com", "test");

      expect(result).toBe(mockSuccessResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Rate limited (test)")
      );
    });

    it("should apply exponential backoff on rate limit", async () => {
      const mockErrorResponse = new Response("Too Many Requests", {
        status: 429,
      });
      const mockSuccessResponse = new Response("OK", { status: 200 });

      mockFetch
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      await client.fetch("https://example.com");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("waiting for 0.10 seconds... (attempt 1/3)")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("waiting for 0.20 seconds... (attempt 2/3)")
      );
    });

    it("should throw error when rate limit retries exceeded", async () => {
      const mockErrorResponse = new Response("Too Many Requests", {
        status: 429,
      });

      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(
        client.fetch("https://example.com", "test context")
      ).rejects.toThrow("Rate limit exceeded (test context) after 3 retries");

      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it("should handle rate limit without context", async () => {
      const mockErrorResponse = new Response("Too Many Requests", {
        status: 429,
      });

      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(client.fetch("https://example.com")).rejects.toThrow(
        "Rate limit exceeded after 3 retries"
      );
    });
  });

  describe("Network error handling", () => {
    it("should retry on network errors", async () => {
      const networkError = new Error("Network failure");
      const mockSuccessResponse = new Response("OK", { status: 200 });

      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await client.fetch("https://example.com", "test");

      expect(result).toBe(mockSuccessResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Network error (test), retrying...")
      );
    });

    it("should throw after max network error retries", async () => {
      const networkError = new Error("Network failure");

      mockFetch.mockRejectedValue(networkError);

      await expect(client.fetch("https://example.com", "test")).rejects.toThrow(
        "Network failure"
      );

      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe("HTTP error handling", () => {
    it("should throw on 4xx errors (except 429)", async () => {
      const mockErrorResponse = new Response("Not Found", {
        status: 404,
        statusText: "Not Found",
      });

      mockFetch.mockResolvedValueOnce(mockErrorResponse);

      await expect(client.fetch("https://example.com", "test")).rejects.toThrow(
        "HTTP error (test): 404 Not Found"
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should throw on 5xx errors", async () => {
      const mockErrorResponse = new Response("Internal Server Error", {
        status: 500,
        statusText: "Internal Server Error",
      });

      mockFetch.mockResolvedValueOnce(mockErrorResponse);

      await expect(client.fetch("https://example.com")).rejects.toThrow(
        "HTTP error: 500 Internal Server Error"
      );
    });

    it("should not retry HTTP errors", async () => {
      const mockErrorResponse = new Response("Bad Request", {
        status: 400,
        statusText: "Bad Request",
      });

      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(client.fetch("https://example.com")).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Configuration options", () => {
    it("should use default values when no options provided", () => {
      const defaultClient = new RetryableHttpClient();
      expect(defaultClient).toBeInstanceOf(RetryableHttpClient);
    });

    it("should respect custom maxRetry setting", async () => {
      const customClient = new RetryableHttpClient({ maxRetry: 1 });
      const mockErrorResponse = new Response("Too Many Requests", {
        status: 429,
      });

      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(customClient.fetch("https://example.com")).rejects.toThrow(
        "Rate limit exceeded after 1 retries"
      );

      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it("should respect custom initialSleepTime setting", async () => {
      const customClient = new RetryableHttpClient({ initialSleepTime: 50 });
      const mockErrorResponse = new Response("Too Many Requests", {
        status: 429,
      });
      const mockSuccessResponse = new Response("OK", { status: 200 });

      mockFetch
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      await customClient.fetch("https://example.com");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("waiting for 0.05 seconds")
      );
    });
  });

  describe("Mixed error scenarios", () => {
    it("should handle rate limit followed by network error", async () => {
      const mockRateLimitResponse = new Response("Too Many Requests", {
        status: 429,
      });
      const networkError = new Error("Network failure");
      const mockSuccessResponse = new Response("OK", { status: 200 });

      mockFetch
        .mockResolvedValueOnce(mockRateLimitResponse)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await client.fetch("https://example.com");

      expect(result).toBe(mockSuccessResponse);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle network error followed by rate limit", async () => {
      const networkError = new Error("Network failure");
      const mockRateLimitResponse = new Response("Too Many Requests", {
        status: 429,
      });
      const mockSuccessResponse = new Response("OK", { status: 200 });

      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockRateLimitResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await client.fetch("https://example.com");

      expect(result).toBe(mockSuccessResponse);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("Context handling", () => {
    it("should format context correctly with context provided", async () => {
      const mockErrorResponse = new Response("Too Many Requests", {
        status: 429,
      });

      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(
        client.fetch("https://example.com", "article 123")
      ).rejects.toThrow("Rate limit exceeded (article 123)");
    });

    it("should format context correctly without context", async () => {
      const mockErrorResponse = new Response("Too Many Requests", {
        status: 429,
      });

      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(client.fetch("https://example.com")).rejects.toThrow(
        "Rate limit exceeded after 3 retries"
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle immediate success without any retries", async () => {
      const mockResponse = new Response("OK", { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.fetch("https://example.com");

      expect(result).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should handle maxRetry of 0", async () => {
      const zeroRetryClient = new RetryableHttpClient({ maxRetry: 0 });
      const mockErrorResponse = new Response("Too Many Requests", {
        status: 429,
      });

      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(
        zeroRetryClient.fetch("https://example.com")
      ).rejects.toThrow("Rate limit exceeded after 0 retries");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should maintain separate sleep times for different requests", async () => {
      const mockErrorResponse = new Response("Too Many Requests", {
        status: 429,
      });
      const mockSuccessResponse = new Response("OK", { status: 200 });

      // First request with retry
      mockFetch
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      await client.fetch("https://example.com/1");

      mockFetch.mockClear();
      consoleLogSpy.mockClear();

      // Second request should start with initial sleep time again
      mockFetch
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      await client.fetch("https://example.com/2");

      // Both should have used initial sleep time (0.10 seconds)
      const calls = consoleLogSpy.mock.calls.filter((call) =>
        call[0].includes("waiting for")
      );
      expect(calls[0][0]).toContain("waiting for 0.10 seconds");
    });
  });

  describe("Logging behavior", () => {
    it("should log retry attempts with correct attempt numbers", async () => {
      const mockErrorResponse = new Response("Too Many Requests", {
        status: 429,
      });
      const mockSuccessResponse = new Response("OK", { status: 200 });

      mockFetch
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      await client.fetch("https://example.com");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("(attempt 1/3)")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("(attempt 2/3)")
      );
    });

    it("should not log on successful first attempt", async () => {
      const mockResponse = new Response("OK", { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      await client.fetch("https://example.com");

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});
