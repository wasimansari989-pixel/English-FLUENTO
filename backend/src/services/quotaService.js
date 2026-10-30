const dailyLimit = parseInt(process.env.DAILY_QUESTION_LIMIT_PER_USER || '50', 10);
const maxInputLength = parseInt(process.env.MAX_USER_INPUT_LENGTH || '1000', 10);

// In-memory store: { [clientKey]: { date: 'YYYY-MM-DD', count: number, minuteRequests: number[], minuteTimestamp: number } }
const userQuotas = new Map();

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

const QuotaService = {
  checkAndRecordUsage(clientId = 'default_user', inputLength = 0) {
    if (inputLength > maxInputLength) {
      return {
        allowed: false,
        error: `Input is too long (${inputLength} characters). Maximum allowed is ${maxInputLength} characters.`
      };
    }

    const today = getTodayString();
    let record = userQuotas.get(clientId);

    if (!record || record.date !== today) {
      record = {
        date: today,
        count: 0,
        minuteRequests: 0,
        minuteTimestamp: Date.now()
      };
      userQuotas.set(clientId, record);
    }

    // Rate limiting: max 15 requests per minute
    const now = Date.now();
    if (now - record.minuteTimestamp > 60000) {
      record.minuteTimestamp = now;
      record.minuteRequests = 0;
    }

    if (record.minuteRequests >= 15) {
      return {
        allowed: false,
        error: 'Too many requests in a short time. Please wait 1 minute before asking another question.'
      };
    }

    // Daily limit check
    if (record.count >= dailyLimit) {
      return {
        allowed: false,
        error: `Daily limit of ${dailyLimit} AI questions reached for today. Limit resets tomorrow. You can continue studying offline formulas!`
      };
    }

    // Increment
    record.count++;
    record.minuteRequests++;

    return {
      allowed: true,
      remainingToday: dailyLimit - record.count
    };
  },

  getUsage(clientId = 'default_user') {
    const today = getTodayString();
    const record = userQuotas.get(clientId);
    if (!record || record.date !== today) {
      return { count: 0, limit: dailyLimit, remaining: dailyLimit };
    }
    return {
      count: record.count,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - record.count)
    };
  }
};

module.exports = QuotaService;
