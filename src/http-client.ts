/**
 * Configuration options for the retryable HTTP client.
 */
export interface RetryableHttpClientOptions {
  maxRetry?: number;
  initialSleepTime?: number;
}

/**
 * HTTP client with built-in retry logic and rate limit handling.
 *
 * Implements exponential backoff with jitter to handle 429 rate limit errors
 * and transient network failures gracefully.
 */
export class RetryableHttpClient {
  private readonly maxRetry: number;
  private readonly initialSleepTime: number;

  constructor(options: RetryableHttpClientOptions = {}) {
    this.maxRetry = options.maxRetry ?? 5;
    this.initialSleepTime = options.initialSleepTime ?? 200;
  }

  /**
   * Fetch a URL with automatic retry on rate limits and network errors.
   *
   * @param url - The URL to fetch
   * @param context - Optional context for logging (e.g., "search request" or article ID)
   * @returns The Response object
   */
  async fetch(url: string, context?: string): Promise<Response> {
    let retry = 0;
    let currentSleepTime = this.initialSleepTime;

    while (retry <= this.maxRetry) {
      try {
        const response = await fetch(url);
        return await this.handleResponse(
          response,
          retry,
          currentSleepTime,
          context
        );
      } catch (error) {
        const shouldRetry = this.shouldRetryError(error, retry);

        if (!shouldRetry) {
          throw error;
        }

        await this.handleRetry(retry, currentSleepTime, context);
        currentSleepTime *= 2;
        retry += 1;
      }
    }

    throw this.createMaxRetriesError(context);
  }

  /**
   * Handle the HTTP response and determine if retry is needed.
   */
  private async handleResponse(
    response: Response,
    retry: number,
    sleepTime: number,
    context?: string
  ): Promise<Response> {
    if (response.status === 429) {
      await this.handleRateLimit(retry, sleepTime, context);
      throw new RetryableError("Rate limit");
    }

    if (!response.ok) {
      throw this.createHttpError(response, context);
    }

    return response;
  }

  /**
   * Handle rate limit (429) responses.
   */
  private async handleRateLimit(
    retry: number,
    sleepTime: number,
    context?: string
  ): Promise<void> {
    if (retry >= this.maxRetry) {
      throw this.createRateLimitError(context);
    }

    this.logRateLimit(retry, sleepTime, context);
    await this.sleep(sleepTime);
  }

  /**
   * Determine if an error should trigger a retry.
   */
  private shouldRetryError(error: unknown, retry: number): boolean {
    if (retry >= this.maxRetry) {
      return false;
    }

    if (error instanceof RetryableError) {
      return true;
    }

    // Don't retry fatal errors
    if (error instanceof HttpError) {
      return false;
    }

    if (
      error instanceof Error &&
      error.message.includes("Rate limit exceeded")
    ) {
      return false;
    }

    // Retry other errors (network issues, etc.)
    return true;
  }

  /**
   * Handle retry attempt with logging and backoff.
   */
  private async handleRetry(
    retry: number,
    sleepTime: number,
    context?: string
  ): Promise<void> {
    this.logNetworkError(retry, context);
    await this.sleep(sleepTime);
  }

  /**
   * Log rate limit retry attempt.
   */
  private logRateLimit(
    retry: number,
    sleepTime: number,
    context?: string
  ): void {
    const contextLabel = this.formatContext(context);
    console.log(
      `Rate limited${contextLabel}, waiting for ${(sleepTime / 1000).toFixed(2)} seconds... (attempt ${retry + 1}/${this.maxRetry})`
    );
  }

  /**
   * Log network error retry attempt.
   */
  private logNetworkError(retry: number, context?: string): void {
    const contextLabel = this.formatContext(context);
    console.log(
      `Network error${contextLabel}, retrying... (attempt ${retry + 1}/${this.maxRetry})`
    );
  }

  /**
   * Format context string for logging.
   */
  private formatContext(context?: string): string {
    return context ? ` (${context})` : "";
  }

  /**
   * Create error for rate limit exceeded.
   */
  private createRateLimitError(context?: string): Error {
    const contextLabel = this.formatContext(context);
    return new Error(
      `Rate limit exceeded${contextLabel} after ${this.maxRetry} retries`
    );
  }

  /**
   * Create error for HTTP errors.
   */
  private createHttpError(response: Response, context?: string): HttpError {
    const contextLabel = this.formatContext(context);
    return new HttpError(
      `HTTP error${contextLabel}: ${response.status} ${response.statusText}`
    );
  }

  /**
   * Create error for max retries exceeded.
   */
  private createMaxRetriesError(context?: string): Error {
    const contextLabel = this.formatContext(context);
    return new Error(
      `Failed to fetch${contextLabel} after ${this.maxRetry} retries`
    );
  }

  /**
   * Sleep for a specified duration with jitter to avoid thundering herd problem.
   *
   * @param ms - Base milliseconds to sleep
   */
  private async sleep(ms: number): Promise<void> {
    const jitter = ms * 0.25 * (Math.random() * 2 - 1);
    const sleepDuration = Math.max(100, ms + jitter);
    await new Promise((resolve) => setTimeout(resolve, sleepDuration));
  }
}

/**
 * Internal error type to signal retryable errors.
 */
class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

/**
 * Error type for HTTP errors that should not be retried.
 */
class HttpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HttpError";
  }
}
