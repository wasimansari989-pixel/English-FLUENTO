const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_FILE = path.join(__dirname, '../../data/ai_cache.json');
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

class AICacheService {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.cache = this._loadCache();
  }

  _loadCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.data === 'object') {
          this.hits = parsed.hits || 0;
          this.misses = parsed.misses || 0;
          return parsed.data;
        }
      }
    } catch (e) {
      console.warn('Failed to load AI cache file:', e.message);
    }
    return {};
  }

  _saveCache() {
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify({ hits: this.hits, misses: this.misses, data: this.cache }, null, 2),
        'utf8'
      );
    } catch (e) {
      console.error('Failed to save AI cache file:', e.message);
    }
  }

  generateKey({ type, prompt, formulaId = null, mode = 'beginner', model = 'default' }) {
    const normalizedPrompt = (prompt || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const hash = crypto
      .createHash('sha256')
      .update(`${type}:${formulaId || ''}:${mode}:${model}:${normalizedPrompt}`)
      .digest('hex');
    return `${type}_${hash.slice(0, 16)}`;
  }

  get(key) {
    const entry = this.cache[key];
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      delete this.cache[key];
      this._saveCache();
      this.misses++;
      return null;
    }

    this.hits++;
    this._saveCache();
    return entry.value;
  }

  set(key, value, ttlMs = DEFAULT_TTL_MS) {
    this.cache[key] = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs
    };
    this._saveCache();
  }

  getMetrics() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0.0%';
    return {
      hits: this.hits,
      misses: this.misses,
      cachedEntriesCount: Object.keys(this.cache).length,
      hitRate
    };
  }

  clear() {
    this.cache = {};
    this.hits = 0;
    this.misses = 0;
    this._saveCache();
  }
}

module.exports = new AICacheService();
