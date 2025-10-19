/**
 * Builder for constructing PubMed API URLs.
 *
 * Handles URL construction for both ESearch and EFetch endpoints
 * with proper parameter encoding and API key/email inclusion.
 */
export class PubMedURLBuilder {
  private readonly baseUrlEsearch =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?";

  private readonly baseUrlEfetch =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?";

  constructor(
    private readonly email: string,
    private readonly apiKey: string
  ) {}

  /**
   * Build a URL for the ESearch endpoint.
   *
   * @param query - The search query
   * @param maxResults - Maximum number of results to return
   * @returns The complete URL
   */
  buildSearchUrl(query: string, maxResults: number): string {
    let url =
      this.baseUrlEsearch +
      "db=pubmed&term=" +
      encodeURIComponent(query) +
      `&retmode=json&retmax=${maxResults}&usehistory=y`;

    url += `&email=${encodeURIComponent(this.email)}`;

    if (this.apiKey) {
      url += `&api_key=${this.apiKey}`;
    }

    return url;
  }

  /**
   * Build a URL for the EFetch endpoint.
   *
   * @param uid - The article UID
   * @param webenv - The web environment string from search
   * @returns The complete URL
   */
  buildFetchUrl(uid: string, webenv: string): string {
    let url =
      this.baseUrlEfetch +
      "db=pubmed&retmode=xml&id=" +
      uid +
      "&webenv=" +
      webenv;

    url += `&email=${encodeURIComponent(this.email)}`;

    if (this.apiKey) {
      url += `&api_key=${this.apiKey}`;
    }

    return url;
  }
}
