const AIProvider = require('./AIProvider');

class GeminiProvider extends AIProvider {
  constructor(apiKey, model) {
    super();
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.model = model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  }

  async generateText({ systemPrompt, userPrompt, context }) {
    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      const err = new Error('GEMINI_API_KEY is not configured on the server. Please add your key to backend/.env');
      err.isAuthError = true;
      err.provider = 'gemini';
      throw err;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const maxTokens = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '350', 10);

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: context ? `Context:\n${JSON.stringify(context, null, 2)}\n\nUser Question:\n${userPrompt}` : userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: maxTokens
      }
    };

    const controller = new AbortController();
    // Gemini on free tier can take up to 25s under load; allow sufficient window
    const timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || '25000', 10);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const rawMsg = errorData.error?.message || `Gemini API error: ${response.status}`;
        const err = new Error(rawMsg);
        err.status = response.status;
        err.provider = 'gemini';

        const is429 = response.status === 429;
        const isResourceExhausted = rawMsg.includes('RESOURCE_EXHAUSTED');
        err.isRateLimit = is429 || isResourceExhausted;
        err.isQuotaExhausted = is429 || isResourceExhausted || rawMsg.toLowerCase().includes('quota');
        err.isTemporary = response.status >= 500;
        err.isAuthError = response.status === 401 || response.status === 403 || rawMsg.includes('API_KEY_INVALID');

        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) err.retryAfter = retryAfter;

        throw err;
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;
      if (!text) {
        const emptyErr = new Error('Empty response received from Gemini.');
        emptyErr.isTemporary = true;
        emptyErr.provider = 'gemini';
        throw emptyErr;
      }

      const usageMetadata = data.usageMetadata || {};
      return {
        text,
        usage: {
          promptTokens: usageMetadata.promptTokenCount || 0,
          completionTokens: usageMetadata.candidatesTokenCount || 0,
          totalTokens: usageMetadata.totalTokenCount || 0
        },
        rateLimits: {
          remainingRequests: null,
          remainingTokens: null,
          resetRequests: null,
          resetTokens: null
        }
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Gemini request timed out.');
        timeoutErr.isTimeout = true;
        timeoutErr.isTemporary = true;
        timeoutErr.provider = 'gemini';
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = GeminiProvider;
