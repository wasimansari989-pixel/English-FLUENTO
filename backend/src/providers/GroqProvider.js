const AIProvider = require('./AIProvider');

class GroqProvider extends AIProvider {
  constructor(apiKey, model) {
    super();
    this.apiKey = apiKey || process.env.GROQ_API_KEY;
    this.model = model || process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
  }

  async generateText({ systemPrompt, userPrompt, context }) {
    if (!this.apiKey || this.apiKey === 'your_groq_api_key_here') {
      const err = new Error('GROQ_API_KEY is not configured on the server. Please add your key to backend/.env');
      err.isAuthError = true;
      err.provider = 'groq';
      throw err;
    }

    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    const maxTokens = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '350', 10);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: context ? `Context:\n${JSON.stringify(context, null, 2)}\n\nUser Question:\n${userPrompt}` : userPrompt }
    ];

    const controller = new AbortController();
    const timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || '15000', 10);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.3,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `Groq API error: ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.provider = 'groq';
        err.isRateLimit = response.status === 429;
        err.isQuotaExhausted = response.status === 429 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit');
        err.isTemporary = response.status >= 500;
        err.isAuthError = response.status === 401 || response.status === 403;
        const retryAfter = response.headers.get('retry-after') || response.headers.get('x-ratelimit-reset-requests');
        if (retryAfter) err.retryAfter = retryAfter;
        throw err;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        const emptyErr = new Error('Empty response received from Groq.');
        emptyErr.isTemporary = true;
        emptyErr.provider = 'groq';
        throw emptyErr;
      }

      return {
        text,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        rateLimits: {
          remainingRequests: response.headers.get('x-ratelimit-remaining-requests'),
          remainingTokens: response.headers.get('x-ratelimit-remaining-tokens'),
          resetRequests: response.headers.get('x-ratelimit-reset-requests'),
          resetTokens: response.headers.get('x-ratelimit-reset-tokens')
        }
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Groq request timed out.');
        timeoutErr.isTimeout = true;
        timeoutErr.isTemporary = true;
        timeoutErr.provider = 'groq';
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = GroqProvider;
