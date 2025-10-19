import { Tool } from "@langchain/core/tools";
import { PubMedAPIWrapper } from "./pubmed-api.js";
import { PubMedAPIWrapperOptions } from "./types.js";

/**
 * Tool that searches the PubMed API.
 *
 * PubMed is a free search engine accessing primarily the MEDLINE database
 * of references and abstracts on life sciences and biomedical topics.
 *
 * @example
 * ```typescript
 * import { PubMedTool } from "@langchain/pubmed";
 *
 * const tool = new PubMedTool({
 *   topKResults: 5,
 *   email: "your_email@example.com"
 * });
 *
 * const result = await tool.invoke("covid-19 vaccine efficacy");
 * console.log(result);
 * ```
 */
export class PubMedTool extends Tool {
  static lc_name() {
    return "PubMedTool";
  }

  name = "pubmed";

  description =
    "A wrapper around PubMed. " +
    "Useful for when you need to answer questions about medicine, health, " +
    "and biomedical topics from biomedical literature, MEDLINE, life science journals, and online books. " +
    "Input should be a search query.";

  private apiWrapper: PubMedAPIWrapper;

  constructor(options: PubMedAPIWrapperOptions = {}) {
    super();
    this.apiWrapper = new PubMedAPIWrapper(options);
  }

  /** @ignore */
  async _call(query: string): Promise<string> {
    return this.apiWrapper.run(query);
  }
}

