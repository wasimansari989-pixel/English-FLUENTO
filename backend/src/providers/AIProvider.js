/**
 * AI Provider Interface
 */
class AIProvider {
  /**
   * @param {Object} input
   * @param {string} input.systemPrompt
   * @param {string} input.userPrompt
   * @param {any} [input.context]
   * @returns {Promise<string>}
   */
  async generateText(input) {
    throw new Error('generateText() must be implemented by subclass');
  }
}

module.exports = AIProvider;
